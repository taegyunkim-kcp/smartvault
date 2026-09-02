// SmartVault 보관함 게이트웨이(Arduino UNO) 펌웨어 — v0 초안
//
// 핀맵: pins.h (근거: hardware/CLAUDE.md 1장)
// 프로토콜: firmware/docs/protocol-spec.md + rs485_link.cpp
// Fail-secure 정책: door_lock.h 상단 주석 참고 (통신 두절 시 무조건 잠금, 로컬 버튼 무시 —
// 행정반 비상 물리키 존재를 전제로 확정됨, 2026-09-01)
//
// 레거시 참고(Z:\HDD2\스마트폰보관함\1. 일반\mcuProgram\ver1_2_1_close_reading_only_white_MCU_20250204):
// LOCK_STATE 극성/개방 펄스 길이(2000ms)/버튼-닫힘 가드는 그 코드에서 그대로 가져왔다.
// 다만 리더 CS 방식(그쪽은 리더당 GPIO 10개, 이 보드는 74LVC138A 디코더)과 통신 프레임
// 포맷(그쪽은 가변 구분자, 여기는 고정 길이+체크섬)은 새 보드/명세에 맞춰 새로 짰다 —
// architecture.md가 말한 "로직은 유지, 구조는 재설계" 원칙 그대로.
// 내장 AVR 워치독(wdt_enable/wdt_reset)도 레거시에서 가져온 것 — hardware/CLAUDE.md 5장의 외부
// ATtiny13A 워치독과는 별개 레이어다: 내장 WDT는 "RS485 선로가 조용하면 칩 스스로
// 2초 뒤 리셋"(레거시와 동일 임계값), ATtiny13A는 "칩 자체가 응답을 안 하는 경우"까지
// 잡아내는 바깥쪽 안전망 — 두 개가 서로 대체하지 않고 같이 있어야 한다.
//
// RFID 스캔은 두 경로로 나뉜다(2026-09-02):
// 1) rs485_link — 집중장치가 READEROP='R'로 물어볼 때만 스캔+응답. 서버 보고용, 문
//    상태와 무관하게 동작. check_in/check_out 판단은 안 하고 현재 상태만 보고한다.
// 2) presence_watch — 문이 열려 있는 동안 게이트웨이가 스스로 훑으며, 빈 자리에 폰이
//    새로 놓이는 순간에만 확인 부저를 울린다(뺄 때는 무음). RS485/서버와 완전히 무관한
//    로컬 로직이라 통신이 끊겨 있어도 동작한다 — 그게 이 경로를 따로 둔 이유다.

// 아직 안 된 것(다음 단계):
// - ATtiny13A 워치독 펌웨어는 완전히 별도(ISP로 직접 굽는 별개 프로젝트) — 여기 포함 안 함
// - buzzer.cpp의 개방/오류 톤은 placeholder(카드 인식 멜로디는 레거시 값을 그대로 포팅함)
// - RESET(전체 재부팅류) 명령 필드는 파싱만 하고 아직 실제 동작에 연결 안 함
//   (rs485_link.cpp의 (void)resetScope 참고)
// - gateway-bridge 쪽: 리더 상태 응답을 받아 check_in/check_out으로 전환하는 로직 미구현

#include <avr/wdt.h>
#include "pins.h"
#include "device_id.h"
#include "rfid_mux.h"
#include "rs485_link.h"
#include "door_lock.h"
#include "buzzer.h"
#include "presence_watch.h"

// AVR 워치독의 잘 알려진 함정: WDT가 리셋을 일으키면 MCUSR의 WDRF 비트가 켜진 채로
// 남는데, 이걸 안 지우고 setup()에서 다시 wdt_enable()하면 부트로더가 sketch로 넘어오는
// 그 짧은 시간 안에 또 리셋이 걸려서 무한 리셋 루프에 빠질 수 있다. 레거시 코드에도 이
// 방어 코드가 없었다 — 여기서는 표준 권장 패턴대로 setup() 맨 앞에서 바로 지운다.
void earlyClearWatchdogFlag() __attribute__((naked, used, section(".init3")));
void earlyClearWatchdogFlag() {
  MCUSR = 0;
  wdt_disable();
}

void setup() {
  Serial.begin(115200); // D0/D1은 배선 안 된 예비 핀 — RS485(SoftwareSerial)와 별개, USB 디버그 전용

  deviceId_setup();
  doorLock_setup();
  buzzer_setup();
  rfidMux_setup();
  presenceWatch_setup();
  rs485_setup(deviceId_get());

  // 내장 워치독: RS485 선로에 2초 넘게 아무 바이트도 안 들어오면 칩을 스스로 리셋한다
  // (레거시와 동일 임계값). 리셋 뒤에도 door_lock의 fail-secure는 "부팅 후 아직 명령 못
  // 받음"으로 계속 잠금 상태를 유지하므로 안전하게 맞물린다.
  wdt_enable(WDTO_2S);

  Serial.print(F("vault-gateway boot, dip=0x"));
  Serial.print(deviceId_get(), HEX);
  Serial.print(F(", gateway_id="));
  Serial.println(rs485_getMyGatewayId());
}

void loop() {
  // 게이트웨이는 명령 없이 스스로 아무것도 안 보낸다(자동 하트비트 없음, 2026-09-02
  // 제거) — 여러 게이트웨이가 같은 RS485 버스를 쓰는데, 각자 독립된 타이머로 자동
  // 전송하면 서로 다른 게이트웨이의 전송이 겹쳐서 충돌할 수 있기 때문이다. 도어
  // 상태는 rs485_link.cpp가 READEROP='R' 응답 맨 앞에 실어서만 보낸다.
  if (rs485_loop()) {
    wdt_reset();
  }
  doorLock_loop();
  presenceWatch_loop();
}
