#include "rs485_link.h"
#include "pins.h"
#include "door_lock.h"
#include "rfid_mux.h"
#include "gateway_identity.h"
#include <SoftwareSerial.h>
#include <string.h>

// gateway-bridge/.env.example의 BAUD_RATE 기본값과 반드시 같이 맞춘다.
constexpr unsigned long RS485_BAUD = 19200;
constexpr char BROADCAST_ID[] = "FFFF";
constexpr size_t GATEWAY_ID_LEN = 4; // GATEWAY_GROUP_ID(2) + DIP(2 hex)
constexpr size_t COMMAND_FRAME_LEN = 11; // '!' ID(4) LOCK(1) RESET(1) READEROP(1) READERIDX(1) CHECKSUM(2) — '\n' 제외
constexpr size_t LINE_BUFFER_SIZE = 32;

static SoftwareSerial s_serial(PIN_485_RX, PIN_485_TX);
static char s_myGatewayId[GATEWAY_ID_LEN + 1] = {0}; // GATEWAY_GROUP_ID + DIP를 2hex로 합친 4글자 + null

static char s_lineBuf[LINE_BUFFER_SIZE];
static uint8_t s_lineLen = 0;

static uint8_t hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return 0xFF; // invalid
}

static bool hexByte(char hi, char lo, uint8_t& out) {
  const uint8_t h = hexNibble(hi);
  const uint8_t l = hexNibble(lo);
  if (h == 0xFF || l == 0xFF) return false;
  out = (h << 4) | l;
  return true;
}

static void hexWrite(Print& out, uint8_t value) {
  const char digits[] = "0123456789ABCDEF";
  out.write(digits[(value >> 4) & 0x0F]);
  out.write(digits[value & 0x0F]);
}

static uint8_t xorChecksum(const char* data, size_t len) {
  uint8_t sum = 0;
  for (size_t i = 0; i < len; i++) sum ^= (uint8_t)data[i];
  return sum;
}

// 확인 부저는 여기서 울리지 않는다 — "문 열림 중 새로 놓임" 확인음은 presence_watch.cpp가
// 서버/RS485와 완전히 무관하게 로컬로 처리한다(통신 두절 중에도 울려야 하는 요구사항이라
// 두 경로가 같은 상태를 공유하면 오히려 꼬인다). 여기는 순수하게 "지금 상태를 보고"만 한다.
static void scanAndReportReader(uint8_t readerIndex) {
  RfidReadResult result;
  rfidMux_scanReader(readerIndex, result);
  rs485_sendReaderState(readerIndex, result.present, result.uid, result.uidLen);
}

static void handleCommandFrame(const char* frame) {
  // frame[0]='!' 이미 확인됨. frame[1..4] = ID(4글자)
  const bool isMine = strncmp(frame + 1, s_myGatewayId, GATEWAY_ID_LEN) == 0;
  const bool isBroadcast = strncmp(frame + 1, BROADCAST_ID, GATEWAY_ID_LEN) == 0;
  if (!isMine && !isBroadcast) return; // 내 프레임 아니면 조용히 버림

  uint8_t checksum;
  if (!hexByte(frame[9], frame[10], checksum)) return;
  if (xorChecksum(frame, 9) != checksum) return; // 손상된 프레임 — 무시(재전송은 집중장치 책임)

  const char lock = frame[5];
  const char resetScope = frame[6];
  const char readerOp = frame[7];
  const char readerIdx = frame[8];
  (void)resetScope; // TODO: 리더 재초기화(전체 강제 재부팅 같은 의미) — 아직 미구현

  if (lock == 'O' || lock == 'C') {
    doorLock_onCommandReceived(lock == 'O');
  }

  // READEROP='R'이고, 나한테 콕 집어 보낸 명령일 때만 응답한다. 브로드캐스트로 온
  // 'R'은 무시한다 — 버스에 물린 다른 게이트웨이들도 동시에 응답을 쏟아내면서 충돌
  // 나므로, "응답이 필요한 명령은 게이트웨이 하나씩 순차적으로"라는 규칙을 집중장치가
  // 안 지켜도(실수로 브로드캐스트+R을 보내도) 펌웨어가 마지막 방어선 역할을 한다.
  // LOCK(도어락 정책)/RESET처럼 응답이 필요 없는 명령은 브로드캐스트를 허용한다 —
  // 위에서 이미 처리했고 여기서 더 할 일이 없다.
  if (readerOp == 'R' && isMine) {
    // 상태(도어 잠금 여부)를 별도 명령/하트비트로 안 보내고, RFID 응답 맨 앞에 한 번
    // 실어 보낸다 — "상태 정보도 RFID 데이터를 모을 때 한꺼번에 전달"하기 위함이자,
    // 게이트웨이가 명령 없이 스스로 타이밍을 잡아 응답을 내보내는 경우를 아예 없애서
    // 버스 충돌 가능성을 원천적으로 줄이기 위함이다(2026-09-02, 이전엔 2초 자동
    // 하트비트가 따로 있었는데 — 여러 게이트웨이의 독립된 타이머가 서로 안 맞춰져서
    // 충돌할 수 있는 진짜 버그였음).
    rs485_sendStatus();

    if (readerIdx >= '0' && readerIdx <= '9') {
      scanAndReportReader((uint8_t)(readerIdx - '0'));
    } else {
      for (uint8_t i = 0; i < RFID_READER_COUNT; i++) {
        scanAndReportReader(i);
      }
    }
  }
}

static void tryConsumeLine() {
  if (s_lineLen == 0) return;
  if (s_lineBuf[0] != '!') {
    s_lineLen = 0; // 우리 쪽에서 알아듣는 건 명령 프레임뿐 — 나머지는 버림
    return;
  }
  if (s_lineLen != COMMAND_FRAME_LEN) {
    s_lineLen = 0;
    return;
  }
  handleCommandFrame(s_lineBuf);
  s_lineLen = 0;
}

void rs485_setup(uint8_t myDipAddress) {
  const char digits[] = "0123456789ABCDEF";
  s_myGatewayId[0] = GATEWAY_GROUP_ID[0];
  s_myGatewayId[1] = GATEWAY_GROUP_ID[1];
  s_myGatewayId[2] = digits[(myDipAddress >> 4) & 0x0F];
  s_myGatewayId[3] = digits[myDipAddress & 0x0F];
  s_myGatewayId[4] = '\0';

  s_serial.begin(RS485_BAUD);
}

const char* rs485_getMyGatewayId() {
  return s_myGatewayId;
}

bool rs485_loop() {
  bool hadActivity = false;
  while (s_serial.available() > 0) {
    hadActivity = true;
    const char c = (char)s_serial.read();
    if (c == '\n' || c == '\r') {
      tryConsumeLine();
      continue;
    }
    if (s_lineLen < LINE_BUFFER_SIZE - 1) {
      s_lineBuf[s_lineLen++] = c;
    } else {
      s_lineLen = 0; // 버퍼 넘침 — 노이즈로 간주하고 리셋
    }
  }
  return hadActivity;
}

void rs485_sendStatus() {
  const bool locked = doorLock_isPhysicallyLocked();          // 실측: LOCK_STATE 핀
  const bool policyUnlocked = doorLock_isCommandedUnlocked();  // 인식: 서버가 마지막으로 내려준 값

  // 체크섬은 전체 바이트에 대해 계산해야 하므로, 먼저 버퍼에 조립한 뒤 한 번에 계산한다.
  char buf[36];
  uint8_t len = 0;
  buf[len++] = ':';
  buf[len++] = 'I';
  buf[len++] = 'D';
  buf[len++] = ':';
  memcpy(buf + len, s_myGatewayId, GATEWAY_ID_LEN);
  len += GATEWAY_ID_LEN;
  buf[len++] = ':';
  buf[len++] = 'L';
  buf[len++] = 'O';
  buf[len++] = 'C';
  buf[len++] = 'K';
  buf[len++] = ':';
  buf[len++] = locked ? 'C' : 'O';
  buf[len++] = ':';
  buf[len++] = 'P';
  buf[len++] = 'O';
  buf[len++] = 'L';
  buf[len++] = 'I';
  buf[len++] = 'C';
  buf[len++] = 'Y';
  buf[len++] = ':';
  buf[len++] = policyUnlocked ? 'O' : 'C';
  buf[len++] = ':';
  buf[len++] = 'E';
  buf[len++] = 'N';
  buf[len++] = 'D';
  buf[len++] = ':';

  const uint8_t checksum = xorChecksum(buf, len);
  s_serial.write((const uint8_t*)buf, len);
  hexWrite(s_serial, checksum);
  s_serial.write('\n');
}

void rs485_sendReaderState(uint8_t readerIndex, bool present, const uint8_t* uid, uint8_t uidLen) {
  // UID 최대 10바이트(hex 20자) 기준으로 여유있게 잡은 고정 버퍼. rs485_sendStatus()와
  // 같은 방식(먼저 조립 후 한 번에 체크섬 계산) — 람다는 일부러 안 씀(구형 AVR 코어의
  // C++ 표준 지원 여부를 컴파일러 없이 확인할 수 없어서, 검증된 방식만 사용).
  char buf[56];
  uint8_t len = 0;
  const char digits[] = "0123456789ABCDEF";

  const char* header = ":ID:";
  for (const char* p = header; *p; p++) buf[len++] = *p;
  memcpy(buf + len, s_myGatewayId, GATEWAY_ID_LEN);
  len += GATEWAY_ID_LEN;

  const char* rd = ":RD:";
  for (const char* p = rd; *p; p++) buf[len++] = *p;
  buf[len++] = digits[readerIndex & 0x0F];

  const char* presentTag = ":PRESENT:";
  for (const char* p = presentTag; *p; p++) buf[len++] = *p;
  buf[len++] = present ? '1' : '0';

  const char* uidTag = ":UID:";
  for (const char* p = uidTag; *p; p++) buf[len++] = *p;
  // present==false면 uidLen은 항상 0(rfid_mux_scanReader가 그렇게 채움)이라 자연히 빈 채로 나감.
  for (uint8_t i = 0; i < uidLen && len < sizeof(buf) - 8; i++) {
    buf[len++] = digits[(uid[i] >> 4) & 0x0F];
    buf[len++] = digits[uid[i] & 0x0F];
  }

  const char* end = ":END:";
  for (const char* p = end; *p; p++) buf[len++] = *p;

  const uint8_t checksum = xorChecksum(buf, len);
  s_serial.write((const uint8_t*)buf, len);
  hexWrite(s_serial, checksum);
  s_serial.write('\n');
}
