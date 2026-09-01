#ifndef VAULT_GATEWAY_BUZZER_H
#define VAULT_GATEWAY_BUZZER_H

// architecture.md는 기존 1인 개발 코드의 부저 멜로디를 "현장에서 실제 튜닝된 로직"이라
// 그대로 자산으로 유지하라고 명시한다. buzzer_beepCardRead()는 레거시 펌웨어
// (Z:/HDD2/스마트폰보관함/1. 일반/mcuProgram/ver1_2_1_close_reading_only_white_MCU_20250204)의
// 실제 멜로디를 그대로 옮겼다. beepDoorOpen/beepError는 레거시에 대응 패턴이 없어서
// 새로 만든 placeholder다 — 현장에서 원하는 톤이 따로 있으면 buzzer.cpp만 바꾸면 됨.

void buzzer_setup();
void buzzer_beepCardRead();  // 카드 인식 성공 (레거시 멜로디 그대로)
void buzzer_beepDoorOpen();  // 개방 펄스 시작 (placeholder)
void buzzer_beepError();     // 체크섬 오류/거부 등 (placeholder)

#endif
