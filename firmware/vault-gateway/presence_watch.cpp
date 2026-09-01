#include "presence_watch.h"
#include "pins.h"
#include "rfid_mux.h"
#include "door_lock.h"
#include "buzzer.h"

static bool s_present[RFID_READER_COUNT] = {false};

void presenceWatch_setup() {
  for (uint8_t i = 0; i < RFID_READER_COUNT; i++) {
    s_present[i] = false;
  }
}

void presenceWatch_loop() {
  if (doorLock_isPhysicallyLocked()) {
    return; // 문 닫혀 있으면 아무도 슬롯에 손댈 수 없으니 스캔 자체를 안 한다
  }

  static uint8_t nextIndex = 0;
  const uint8_t readerIndex = nextIndex;
  nextIndex = (nextIndex + 1) % RFID_READER_COUNT;

  RfidReadResult result;
  rfidMux_scanReader(readerIndex, result);

  if (result.present && !s_present[readerIndex]) {
    buzzer_beepCardRead(); // 비어있던 자리에 새로 놓인 순간에만 확인음
  }
  s_present[readerIndex] = result.present;
}
