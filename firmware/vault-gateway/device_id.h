#ifndef VAULT_GATEWAY_DEVICE_ID_H
#define VAULT_GATEWAY_DEVICE_ID_H

#include <Arduino.h>

// DIP 스위치(SW5+SW6, 8채널)로 설정한 장치 고유 ID를 74HC165로 읽는다.
// 전원 인가 시 1회만 읽으면 된다 — CLAUDE.md 5장: "DIP 스위치 변경 후 재부팅만 하면
// 재업로드 없이 주소가 바뀜"이 이 가정을 전제로 한다(런타임 중 재변경은 지원 안 함).
void deviceId_setup();
uint8_t deviceId_get();

#endif
