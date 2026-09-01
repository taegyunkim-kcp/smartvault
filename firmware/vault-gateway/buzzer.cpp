#include <Arduino.h>
#include "buzzer.h"
#include "pins.h"

// tone()+delay()라 호출 중에는 loop()가 멈춘다 — 카드 인식 멜로디가 4개 음(각 ~31ms +
// 텀포함 총 ~160ms)이라 아직은 감수할 만하지만, 더 길어지면 millis() 기반 비차단
// 상태머신으로 바꿔야 한다.

// 레거시 펌웨어(Z:/HDD2/스마트폰보관함/1. 일반/mcuProgram/
// ver1_2_1_close_reading_only_white_MCU_20250204, pitches.h)에서 그대로 가져온 카드
// 인식 멜로디 — G7,G7,G5,G5 + 무음 4개, 각 노트 1000/32ms 길이. 두 음만 쓰므로
// pitches.h 전체를 끌어오지 않고 필요한 상수만 옮겨 적음.
constexpr int NOTE_G7 = 3136;
constexpr int NOTE_G5 = 784;
constexpr int CARD_READ_MELODY[] = {NOTE_G7, NOTE_G7, NOTE_G5, NOTE_G5, 0, 0, 0, 0};
constexpr uint8_t CARD_READ_MELODY_LEN = sizeof(CARD_READ_MELODY) / sizeof(CARD_READ_MELODY[0]);
constexpr int CARD_READ_NOTE_MS = 1000 / 32;

void buzzer_setup() {
  pinMode(PIN_BUZZ, OUTPUT);
  noTone(PIN_BUZZ);
}

void buzzer_beepCardRead() {
  for (uint8_t i = 0; i < CARD_READ_MELODY_LEN; i++) {
    if (CARD_READ_MELODY[i] != 0) {
      tone(PIN_BUZZ, CARD_READ_MELODY[i], CARD_READ_NOTE_MS);
    }
    delay((unsigned long)(CARD_READ_NOTE_MS * 1.3)); // 레거시와 동일한 노트 간 텀
  }
  noTone(PIN_BUZZ);
}

void buzzer_beepDoorOpen() {
  tone(PIN_BUZZ, 1500, 150);
  delay(150);
}

void buzzer_beepError() {
  tone(PIN_BUZZ, 400, 200);
  delay(200);
}
