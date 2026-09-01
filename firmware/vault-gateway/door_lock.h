#ifndef VAULT_GATEWAY_DOOR_LOCK_H
#define VAULT_GATEWAY_DOOR_LOCK_H

#include <Arduino.h>

// Fail-secure 정책(사용자 확정, 2026-09-01): RS485 통신이 끊기면 무조건 잠금 상태를
// 유지하고 로컬 버튼(OPEN_BTN)도 무시한다. 행정반에 별도 비상 물리키가 있어서, 통신
// 두절 시 로컬 개방 경로를 완전히 막아도 현장이 고립되지 않는다는 전제로 결정됨.
// (정보 유출/도난 방지가 통신 장애 시 접근 편의보다 우선.)
constexpr unsigned long COMMS_TIMEOUT_MS = 5000;
// TODO: ATtiny13A 워치독 1단계(소프트 리셋) 타임아웃이 확정되면, 그보다 반드시 짧게
// 맞춘다 — 소프트웨어 fail-secure가 워치독 리셋보다 먼저 개입해야 "통신 두절 = 즉시
// 잠금"이 리셋 루프 중에도 끊김 없이 유지된다.

void doorLock_setup();

// RS485에서 유효한 O(open)/C(close) 명령을 받을 때마다 호출 — 마지막 명령을 캐시하고
// "통신 살아있음" 타임스탬프를 갱신한다.
void doorLock_onCommandReceived(bool commandedUnlocked);

// 매 loop()마다 호출. 통신 두절 판정/버튼 입력/실제 도어 상태 감지를 모두 처리한다.
void doorLock_loop();

// 지금 실제 도어 상태(LOCK_STATE 핀 기준) — RS485 응답에 실어 보내기 위함.
bool doorLock_isPhysicallyLocked();

// 게이트웨이가 지금 "적용해야 한다"고 알고 있는 정책 — 서버가 마지막으로 내려준 O/C
// 명령을 그대로 캐시한 값이다(doorLock_onCommandReceived). 실제 도어 상태(위 함수)와
// 다를 수 있다(예: 정책은 열림 허용인데 아직 아무도 버튼을 안 눌러서 물리적으로는
// 잠긴 채로 있는 경우) — RS485 상태 응답에 정책값도 같이 실어서, 집중장치가 "게이트웨이가
// 지금 어떤 정책을 인식하고 있는지"를 실제 상태와 구분해서 볼 수 있게 한다.
bool doorLock_isCommandedUnlocked();

// 지금 통신이 끊긴 것으로 판단해 fail-secure가 발동 중인지 — RS485 응답/로그용.
bool doorLock_isCommsLost();

#endif
