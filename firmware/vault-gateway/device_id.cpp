#include "device_id.h"
#include "pins.h"

static uint8_t s_deviceId = 0;

void deviceId_setup() {
  pinMode(PIN_DEV_PL, OUTPUT);
  pinMode(PIN_DEV_CP, OUTPUT);
  pinMode(PIN_DEV_ID, INPUT);

  digitalWrite(PIN_DEV_CP, LOW);

  // PL(SH/LD#)을 짧게 LOW로 내려 DIP 상태를 74HC165 내부 레지스터에 래치한다.
  digitalWrite(PIN_DEV_PL, HIGH);
  delayMicroseconds(5);
  digitalWrite(PIN_DEV_PL, LOW);
  delayMicroseconds(5);
  digitalWrite(PIN_DEV_PL, HIGH);

  uint8_t value = 0;
  for (uint8_t i = 0; i < 8; i++) {
    value <<= 1;
    value |= digitalRead(PIN_DEV_ID) ? 1 : 0;
    digitalWrite(PIN_DEV_CP, HIGH);
    delayMicroseconds(5);
    digitalWrite(PIN_DEV_CP, LOW);
    delayMicroseconds(5);
  }

  s_deviceId = value;
}

uint8_t deviceId_get() {
  return s_deviceId;
}
