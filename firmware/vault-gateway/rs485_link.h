#ifndef VAULT_GATEWAY_RS485_LINK_H
#define VAULT_GATEWAY_RS485_LINK_H

#include <Arduino.h>

// 프레임 형식은 firmware/docs/protocol-spec.md와 반드시 같이 맞춘다 — 여기 코드가 사실상
// 구현체이고, 그 문서가 사람이 읽는 명세다. 한쪽만 고치고 끝내지 말 것.
//
// ID는 4글자 — {GATEWAY_GROUP_ID(2글자, gateway_identity.h, 설치자가 빌드 시 지정)} +
// {DIP 스위치 8비트를 2자리 HEX로 인코딩}. DIP만으로는 버스 하나 안에서만 유일해서,
// 서버에 처음 등록할 때(detected_gateways 매칭) 어느 하드웨어/펌웨어 배치인지 구분하기
// 위해 그룹을 합쳤다 — 2026-09-02 확정.
//
// 명령(집중장치 → 게이트웨이), 고정 11바이트 + 개행:
//   '!' ID(4자) LOCK('O'|'C') RESET('A'|'I') READEROP('R'|'A') READERIDX('0'-'9'|'A')
//   CHECKSUM(2 hex, '!'부터 READERIDX까지 XOR) '\n'
//   ID="FFFF"는 전체 브로드캐스트 — GATEWAY_GROUP_ID로 "FF"를 쓰지 말 것(gateway_identity.h 참고).
//
// RFID는 "새로 인식된 이벤트"가 아니라 "지금 그 리더에 뭐가 있는지 상태 조회"다(스마트폰이
// 슬롯에 계속 거치돼 있는 걸 실시간으로 파악해야 하므로 — rfid_mux.h 상단 설명 참고).
// 그래서 게이트웨이는 스스로 판단해서 보내지 않고, 집중장치가 READEROP='R'로 명시적으로
// 물어볼 때만 응답한다(READERIDX가 '0'-'9'면 그 리더 하나만, 'A'면 10개 전부 순서대로).
// check_in/check_out(입고/출고) "전환" 판단은 게이트웨이가 하지 않는다 — 매번 있는 그대로의
// 현재 상태만 보내고, 이전 상태와 비교해서 전환을 만드는 건 집중장치(gateway-bridge) 몫이다.
//
// 응답(게이트웨이 → 집중장치)은 두 종류:
//   상태:       ":ID:" ID(4자) ":LOCK:" ('O'|'C') ":POLICY:" ('O'|'C') ":END:" CHECKSUM(2 hex) '\n'
//               (rs485_sendStatus, 'R' 명령 응답 맨 앞에 한 번만 — 자동 전송 없음)
//               LOCK=LOCK_STATE 핀으로 실측한 실제 도어 상태, POLICY=서버가 마지막으로
//               내려준 명령을 게이트웨이가 캐시해서 "지금 이렇게 적용해야 한다"고 인식하고
//               있는 값(door_lock.h의 doorLock_isCommandedUnlocked) — 실제 상태와 다를 수
//               있다(예: 정책은 열림 허용인데 아직 아무도 안 열어서 물리적으로는 잠긴 채).
//   리더 상태:  ":ID:" ID(4자) ":RD:" 리더idx(1 hex) ":PRESENT:" ('0'|'1')
//               ":UID:" UID(hex, present=0이면 빈 문자열) ":END:" CHECKSUM(2 hex) '\n'
//               (rs485_sendReaderState, 'R' 명령에 대한 응답으로만)
// CHECKSUM은 그 프레임 전체(":ID:"부터 마지막 ":"까지) XOR.

// myDipAddress: 74HC165로 읽은 8비트 DIP 값(device_id.h). 내부에서 GATEWAY_GROUP_ID와
// 합쳐 4글자 ID를 만들어 저장해두고, 이후 모든 프레임 송수신에 그 4글자를 쓴다.
void rs485_setup(uint8_t myDipAddress);

// loop()에서 매번 호출 — 수신 바이트를 누적하고, 완성된 프레임이 오면 파싱해서
// door_lock에 락 상태를 반영하고, READEROP='R'이면 rfid_mux를 호출해 리더를 스캔하고
// 그 결과를 바로 응답으로 내보낸다(rs485_sendReaderState). 자기 앞으로 온(또는
// 브로드캐스트) 유효 프레임을 받은 시점이 door_lock의 "통신 살아있음" 기준이 된다.
// 반환값: 이번 호출에서 RS485 선로에 바이트가 하나라도 실제로 들어왔는지(노이즈 포함,
// 프레임 유효성과 무관) — 내장 워치독(wdt_reset) 급여 기준으로 쓴다. 레거시 펌웨어의
// "Serial1.available()>0일 때만 wdt_reset()" 패턴을 그대로 가져온 것.
bool rs485_loop();

// 실제 도어 상태/정책 캐시값을 door_lock에서 직접 읽어서 보낸다 — 호출부가 값을
// 따로 들고 있다가 넘길 필요 없이, 보내는 시점의 최신값이 항상 실린다.
void rs485_sendStatus();
void rs485_sendReaderState(uint8_t readerIndex, bool present, const uint8_t* uid, uint8_t uidLen);

// 부팅 로그 등 디버그 출력용 — 이 게이트웨이의 4글자 ID(널 종단 문자열)를 그대로 가리킨다.
const char* rs485_getMyGatewayId();

#endif
