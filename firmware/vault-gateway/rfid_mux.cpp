#include "rfid_mux.h"
#include "pins.h"
#include <SPI.h>
#include <MFRC522.h>
#include <string.h>

// MFRC522 라이브러리는 트랜잭션마다 자기가 받은 SS 핀을 직접 LOW/HIGH로 토글하는데,
// 이 보드는 SS가 GPIO가 아니라 디코더 출력이라 그 토글은 아무 배선에도 닿지 않는다.
// 실제 "이 리더 선택"은 selectReader()가 디코더 주소를 세팅하는 것으로 끝나고, 그 상태가
// 유지되는 동안에만 라이브러리 호출을 해야 한다 — 더미 핀 토글은 라이브러리 내부 상태
// 일관성을 위해 그냥 같이 따라가게 둔다(실질적 효과 없음, 부작용도 없음).
static MFRC522 s_mfrc522(PIN_RFID_DUMMY_SS, PIN_RFID_RST);

static void selectReader(uint8_t readerIndex) {
  const uint8_t bank = (readerIndex < RFID_BANK_A_COUNT) ? 0 : 1;
  const uint8_t addr = (readerIndex < RFID_BANK_A_COUNT) ? readerIndex : (readerIndex - RFID_BANK_A_COUNT);

  digitalWrite(PIN_BANK, bank);
  digitalWrite(PIN_DEC_A, (addr >> 0) & 0x01);
  digitalWrite(PIN_DEC_B, (addr >> 1) & 0x01);
  digitalWrite(PIN_DEC_C, (addr >> 2) & 0x01);

  // 74LVC138A 전파지연(수 ns)에 비하면 넉넉한 여유 — 디코더 주소가 안정된 뒤에야
  // SPI 트랜잭션을 시작해야 다른 리더가 순간적으로 같이 선택되는 걸 막는다.
  delayMicroseconds(10);
}

void rfidMux_setup() {
  pinMode(PIN_DEC_A, OUTPUT);
  pinMode(PIN_DEC_B, OUTPUT);
  pinMode(PIN_DEC_C, OUTPUT);
  pinMode(PIN_BANK, OUTPUT);
  pinMode(PIN_RFID_DUMMY_SS, OUTPUT);

  SPI.begin();
  // 리더별 PCD_Init()은 부팅 시 한 번이 아니라 rfidMux_scanReader()가 매 조회마다
  // 직접 한다 — 계속 거치 중인 카드도 매번 새로 감지되게 하려면 매번 재초기화가
  // 필요하기 때문(rfid_mux.h 상단 설명 참고). 그래서 여기서는 SPI 버스만 켜둔다.
}

void rfidMux_scanReader(uint8_t readerIndex, RfidReadResult& out) {
  out.present = false;
  out.uidLen = 0;

  selectReader(readerIndex);
  s_mfrc522.PCD_Init();
  delay(1); // 초기화 직후 안정화 여유(레거시도 PCD_Init 뒤 delay를 뒀음)

  if (!s_mfrc522.PICC_IsNewCardPresent() || !s_mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  out.present = true;
  // min<T>()이 아니라 3항연산자를 쓴다 — AVR 코어의 min()/max()는 템플릿이 아니라
  // 매크로라 min<uint8_t>(...)처럼 명시적 템플릿 인자를 쓰면 컴파일이 깨진다.
  out.uidLen = (s_mfrc522.uid.size < sizeof(out.uid)) ? s_mfrc522.uid.size : (uint8_t)sizeof(out.uid);
  memcpy(out.uid, s_mfrc522.uid.uidByte, out.uidLen);

  s_mfrc522.PICC_HaltA();
  s_mfrc522.PCD_StopCrypto1();
}
