#include "door_lock.h"
#include "pins.h"

// LOCK_STATE 극성/펄스 길이는 레거시 펌웨어(Z:/HDD2/스마트폰보관함/1. 일반/mcuProgram/
// ver1_2_1_close_reading_only_white_MCU_20250204)에서 그대로 가져왔다 —
// `digitalRead(LockStat)==LOW`를 "닫힘"으로 쓰고, 개방 시 `digitalWrite(LOCK,HIGH); delay(2000);`
// 뒤 LOW로 되돌리는 단일 펄스였다. 새 보드는 락 기구 자체는 그대로일 가능성이 높지만, 배선판이
// 바뀐 만큼(디코더 도입 등) 벤치에서 한 번은 재확인 권장.
constexpr unsigned long OPEN_PULSE_MS = 2000;
constexpr unsigned long BUTTON_DEBOUNCE_MS = 30;

static bool s_commandedUnlocked = false; // 서버(집중장치)가 마지막으로 내려준 정책 상태
static unsigned long s_lastCommandAt = 0;
static bool s_hasReceivedAnyCommand = false;

static int s_lastButtonReading = HIGH;
static unsigned long s_lastButtonChangeAt = 0;
static int s_buttonStable = HIGH; // digitalRead()와 같은 int(HIGH/LOW)로 통일 — bool 섞지 않음

static unsigned long s_openPulseStartedAt = 0;
static bool s_openPulseActive = false;

static bool isDoorSensorClosed() {
  return digitalRead(PIN_LOCK_STATE) == LOW;
}

static void engageLock() {
  digitalWrite(PIN_OPEN_CTL, LOW);
  s_openPulseActive = false;
}

static void startOpenPulse() {
  digitalWrite(PIN_OPEN_CTL, HIGH);
  s_openPulseStartedAt = millis();
  s_openPulseActive = true;
}

void doorLock_setup() {
  pinMode(PIN_OPEN_BTN, INPUT_PULLUP);
  pinMode(PIN_LOCK_STATE, INPUT_PULLUP);
  pinMode(PIN_OPEN_CTL, OUTPUT);
  engageLock(); // 부팅 직후에는 아직 서버 명령을 못 받았으니 fail-secure와 동일하게 잠금 시작
}

void doorLock_onCommandReceived(bool commandedUnlocked) {
  s_commandedUnlocked = commandedUnlocked;
  s_lastCommandAt = millis();
  s_hasReceivedAnyCommand = true;
}

bool doorLock_isCommsLost() {
  if (!s_hasReceivedAnyCommand) return true; // 부팅 후 아직 한 번도 명령을 못 받은 상태도 "끊김"으로 취급
  return (millis() - s_lastCommandAt) > COMMS_TIMEOUT_MS;
}

bool doorLock_isPhysicallyLocked() {
  return isDoorSensorClosed();
}

bool doorLock_isCommandedUnlocked() {
  return s_commandedUnlocked;
}

void doorLock_loop() {
  // 열림 펄스 진행 중이면 시간 다 됐는지만 확인하고 끝 — 그 사이 버튼/통신 상태는 다음
  // 사이클에 반영(펄스 중간에 다시 잠그러 들어가지 않게 해서 기구적으로 깔끔하게 유지).
  if (s_openPulseActive) {
    if (millis() - s_openPulseStartedAt >= OPEN_PULSE_MS) {
      engageLock();
    }
    return;
  }

  const bool commsLost = doorLock_isCommsLost();
  if (commsLost) {
    // Fail-secure: 통신 두절 시 무조건 잠금, 로컬 버튼 완전 무시(행정반 비상키로만 개방).
    engageLock();
    return;
  }

  // 버튼 디바운스
  const int reading = digitalRead(PIN_OPEN_BTN);
  if (reading != s_lastButtonReading) {
    s_lastButtonChangeAt = millis();
    s_lastButtonReading = reading;
  }
  bool buttonPressedEdge = false;
  if ((millis() - s_lastButtonChangeAt) > BUTTON_DEBOUNCE_MS && reading != s_buttonStable) {
    s_buttonStable = reading;
    if (s_buttonStable == LOW) { // INPUT_PULLUP: 눌림 = LOW
      buttonPressedEdge = true;
    }
  }

  // 레거시와 동일하게 "지금 닫혀 있을 때만" 버튼이 먹는다 — 이미 열려 있으면 펄스를 또
  // 걸 필요가 없다(불필요한 솔레노이드 재구동 방지).
  if (buttonPressedEdge && s_commandedUnlocked && isDoorSensorClosed()) {
    startOpenPulse();
  }
}
