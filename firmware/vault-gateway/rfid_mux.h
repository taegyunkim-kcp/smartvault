#ifndef VAULT_GATEWAY_RFID_MUX_H
#define VAULT_GATEWAY_RFID_MUX_H

#include <Arduino.h>

// 리더 10개를 74LVC138A 디코더로 순차 폴링한다. 동시에 두 개 이상을 선택하면 SPI 버스가
// 충돌하므로(CLAUDE.md 4장), rfidMux_scanReader() 호출 후 다른 리더로 넘어가기 전에는
// 반드시 그 리더에 대한 SPI 트랜잭션을 끝내야 한다 — 이 모듈 밖에서 디코더 주소를 직접
// 건드리지 말 것.
//
// 설계가 "새 카드 감지 이벤트"가 아니라 "지금 이 순간 뭐가 있는지 상태 조회"인 이유:
// MFRC522의 PICC_IsNewCardPresent()는 REQA 기반이라, 한 번 읽고 PICC_HaltA()로 재운
// 카드는 ISO14443 HALT 상태라 REQA에 응답하지 않는다 — 스마트폰이 슬롯에 몇 시간 동안
// 계속 거치돼 있으면 "놓인 순간" 딱 한 번만 감지되고 그 뒤로는(빼도) 아무 신호가 없다.
// 이 시스템은 "지금 거치 중인지" 실시간 상태를 계속 알아야 하므로, 매번 조회할 때마다
// 그 리더를 재초기화(PCD_Init)해서 카드를 IDLE 상태로 되돌린 뒤 다시 확인한다 — 레거시
// 펌웨어가 매 폴링마다 SPI/리더를 다시 초기화하던 것도 같은 이유였을 가능성이 높다.

struct RfidReadResult {
  bool present;     // 지금 이 리더에 카드가 있는지(있었는지가 아니라 "지금")
  uint8_t uidLen;    // present==false면 0
  uint8_t uid[10];
};

void rfidMux_setup();

// 리더 하나를 "지금 이 순간" 재확인한다 — 내부적으로 그 리더를 재초기화(PCD_Init)해서
// 계속 거치돼 있는 카드도 매번 새로 감지되게 만든 뒤 조회한다. 호출할 때마다 SPI/RF
// 트랜잭션이 실제로 일어나므로(가벼운 캐시 조회가 아님) 반드시 필요할 때만 부를 것 —
// 지금은 rs485_link가 'R'(리더 읽기) 명령을 받았을 때 10개를 순회 호출한다.
void rfidMux_scanReader(uint8_t readerIndex, RfidReadResult& out);

#endif
