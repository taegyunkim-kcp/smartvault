#ifndef VAULT_GATEWAY_PINS_H
#define VAULT_GATEWAY_PINS_H

#include <Arduino.h> // uint8_t / A0~A5 등 아두이노 핀 매크로 — 이 헤더 혼자 include돼도 되게

// 핀맵의 유일한 근거는 hardware/CLAUDE.md 1장(Arduino UNO 핀맵 확정)이다.
// 회로/핀맵이 바뀌면 hardware/CLAUDE.md를 먼저 고치고, 그 다음 이 파일을 맞춘다 — 반대 순서 금지.

// RFID 리더 CS 선택용 74LVC138A 디코더 (U6=SS_1~8 / U7=SS_9~10, BANK로 상호배타 전환)
constexpr uint8_t PIN_DEC_A = 2;
constexpr uint8_t PIN_DEC_B = 3;
constexpr uint8_t PIN_DEC_C = 4;
constexpr uint8_t PIN_BANK = 8;

// RS485 (MAX13487E, AutoDirection — DE/RE 제어 불필요, SoftwareSerial)
constexpr uint8_t PIN_485_RX = 5;
constexpr uint8_t PIN_485_TX = 6;

// 부저 (BZ1 직접 구동)
constexpr uint8_t PIN_BUZZ = 7;

// MFRC522 공통 SPI + RST (레벨시프트는 하드웨어에서 처리, 펌웨어는 그냥 표준 SPI 핀 사용)
constexpr uint8_t PIN_RFID_RST = 9;
// D11=MOSI, D12=MISO, D13=SCK — 표준 SPI 핀이라 <SPI.h>가 자동으로 씀, 별도 상수 불필요.
// MFRC522 라이브러리에 넘기는 "SS 핀"은 실제로 배선되지 않은 더미 핀이다 — 실제 리더 선택은
// PIN_DEC_A/B/C + PIN_BANK 조합으로 미리 해두고, 그 상태를 유지한 채로 라이브러리를 호출한다.
// (74LVC138A 출력이 active-low라 디코더 주소 자체가 SS 역할을 대신함 — rfid_mux.cpp 참고)
constexpr uint8_t PIN_RFID_DUMMY_SS = 10; // 배선 없음(디코더 전환으로 해제된 예비 핀 재사용)

// 도어락
constexpr uint8_t PIN_OPEN_BTN = A0;   // INPUT_PULLUP, 로컬 개방 버튼
constexpr uint8_t PIN_OPEN_CTL = A1;   // 도어락 구동 제어(Q2 게이트)
constexpr uint8_t PIN_LOCK_STATE = A2; // INPUT_PULLUP, 도어 상태 감지

// 장치 ID (74HC165 + DIP 스위치 8비트)
constexpr uint8_t PIN_DEV_ID = A3; // Q7 시리얼 출력
constexpr uint8_t PIN_DEV_PL = A4; // PL(SH/LD, 래치)
constexpr uint8_t PIN_DEV_CP = A5; // CP(클럭)

// RFID 리더 개수/디코더 주소 범위
constexpr uint8_t RFID_READER_COUNT = 10;
constexpr uint8_t RFID_BANK_A_COUNT = 8; // BANK=0: SS_1~8 (U6)
// BANK=1: SS_9~10 (U7, 디코더 주소 0~1만 유효)

#endif
