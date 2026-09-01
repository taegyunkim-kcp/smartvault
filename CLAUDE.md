# CLAUDE.md — SmartVault (NFC/RFID 스마트폰 보관함 잠금장치)

이 파일은 저장소 루트(또는 `firmware/`, `server-api/` 등 각 하위 디렉토리)에 두면 Claude Code가 세션 시작 시 자동으로 읽습니다. 하드웨어 설계는 claude.ai의 별도 프로젝트에서 KiCad 회로도를 기준으로 검토·확정되었으며, 이 문서는 그 결과를 펌웨어/서버 개발 시 참조할 수 있도록 요약한 것입니다. 상세 근거·회로도 이미지는 `docs/SmartVault_Design_Document.docx`를 참고하세요.

## 1. 시스템 개요

- 다수의 스마트폰 보관함(사물함) 하나하나에 설치되는 컨트롤러 보드. RS485 멀티드롭 버스로 상위 서버와 통신.
- 기능: ① NFC/RFID 카드로 슬롯(최대 10개) 사용자 인식, ② 전자 도어락 개폐 제어/상태 감지, ③ RS485 통신, ④ 통신 두절 시 2단계 자동 복구(워치독), ⑤ DIP 스위치 기반 현장 설정(장치 ID, RS485 종단/바이어스, 도어락 전압).
- 메인 MCU: Arduino UNO(소켓 마운트, USB로 직접 업로드). 보조 워치독 MCU: ATtiny13A-P(DIP-8, **소켓 실장** — 별도 ISP 프로그래머로 미리 구운 뒤 꽂아 사용, 보드에 ISP 헤더 없음).
- 전원: 12V 어댑터 입력 → 보드에서 5V(MP2307DN)/3.3V(AMS1117-3.3) 자체 생성. UNO는 **5V 핀으로만** 급전(VIN·온보드 3.3V 핀 미사용).

## 2. 저장소 구조 (권장)

```
smartvault/
├── hardware/          # KiCad 프로젝트 (회로도/PCB)
├── firmware/          # Arduino UNO 펌웨어(.ino) + ATtiny13A 워치독 펌웨어
├── gateway-bridge/    # 건물별 Concentrator — RS485 프레임 수신/파싱 (Python)
├── backend/           # API 서버 (Node/Express + MySQL)
├── frontend/          # 관리자 대시보드 (React)
├── docs/              # 설계문서, 통신 프로토콜 스펙 등 공통 참조 자료
└── CLAUDE.md          # 이 파일
```

firmware가 만드는 RS485 프레임과 server-api가 파싱하는 포맷은 반드시 동일한 스펙을 따라야 합니다 — 프로토콜 변경 시 `docs/`와 이 파일을 함께 업데이트하세요.

## 3. Arduino UNO 핀맵 (확정)

| 핀 | 넷 이름 | 방향 | 용도 |
|---|---|---|---|
| D0 | (미사용) | - | 예비 — 하드웨어 UART RX, USB 디버깅 전용으로 비움 |
| D1 | (미사용) | - | 예비 — 하드웨어 UART TX, USB 디버깅 전용으로 비움 |
| D2 | DEC_A | OUT | 74LVC138A 디코더 주소비트 A0 |
| D3 | DEC_B | OUT | 74LVC138A 디코더 주소비트 A1 |
| D4 | DEC_C | OUT | 74LVC138A 디코더 주소비트 A2 |
| D5 | 485_RX | IN | RS485 수신 (SoftwareSerial RX, MAX13487E RO 경유) |
| D6 | 485_TX | OUT | RS485 송신 (SoftwareSerial TX, MAX13487E DI 경유) |
| D7 | BUZZ | OUT | 부저(BZ1) 직접 구동 |
| D8 | BANK | OUT | 디코더 뱅크선택 (U6=SS_1~8 / U7=SS_9~10 상호배타 전환) |
| D9 | RST | OUT | MFRC522 공통 RST |
| D10 | (미사용) | - | 예비 — 디코더 전환으로 해제된 여유 핀 |
| D11 | MOSI | OUT | SPI MOSI |
| D12 | MISO_5V | IN | SPI MISO |
| D13 | SCK | OUT | SPI SCK |
| A0 | OPEN_BTN | IN | 로컬 개방 버튼 (INPUT_PULLUP) |
| A1 | OPEN_CTL | OUT | 도어락 구동 제어 (Q2 게이트) |
| A2 | LOCK_STATE | IN | 도어 상태 감지 (INPUT_PULLUP) |
| A3 | DEV_ID | IN | 74HC165 Q7 시리얼 출력 (장치 ID 8비트) |
| A4 | DEV_PL | OUT | 74HC165 PL (SH/LD, 래치) |
| A5 | DEV_CP | OUT | 74HC165 CP (클럭) |
| RESET | arduino_rst (S_Reset) | IN | 워치독 1단계 소프트리셋 입력 |
| 5V | 5V_RAW | IN | 유일한 전원 입력 |
| VIN | (미사용) | - | 미연결 |
| 3V3 | (미사용) | - | 미연결 (MFRC522는 별도 3.3V 레일 사용) |

## 4. RFID 리더 (MFRC522 × 10)

- CS(SS) 선택: 74LVC138A 디코더 2개(U6: SS_1~8, U7: SS_9~10)를 DEC_A/B/C(3비트 주소) + BANK(뱅크선택)로 제어. **한 번에 하나의 리더만 활성화**하도록 펌웨어에서 주소를 세팅해야 함 (동시에 여러 리더가 선택되면 SPI 버스 충돌).
- 레벨시프트: MOSI/SCK/RST는 74LVC125A(5V→3.3V), MISO는 74AHCT1G125(3.3V→5V)로 별도 처리.
- 리더 순차 폴링 필요 (RF 간섭 방지) — 한 번에 하나의 리더 CS만 활성화.
- 각 리더 커넥터(J_MFC_1~10)는 8핀: SS_x / SCK_3V3 / MOSI_3V3 / MISO / IRQ / RST_3V3 / GND / +3V3. **IRQ는 현재 MCU에 미연결(예비)** — 인터럽트 기반으로 전환 시 배선 추가 필요.

## 5. 장치 ID (74HC165 + DIP 스위치)

- SW5+SW6(4채널×2, 총 8비트)로 장치 고유 ID 설정. 전원 인가 시 PL(DEV_PL)을 통해 래치하고 CP(DEV_CP) 클럭으로 DEV_ID(A3)에서 8비트를 순차 shift-in.
- DIP 스위치 변경 후 **재부팅만 하면 재업로드 없이 주소가 바뀜**.

## 6. RS485 통신

- 트랜시버: MAX13487E (AutoDirection — RE#/SHDN# 모두 VCC 고정, 방향전환 자동 처리, 펌웨어에서 별도 DE/RE 제어 불필요).
- 종단저항(120Ω, SW2)과 바이어스(SW3=A라인 풀업/SW4=B라인 풀다운)는 버스 내 **1개 노드에서만 ON** — 설치 현장에서 물리 스위치로 결정. 펌웨어는 이를 신경 쓸 필요 없음.
- 통신 파라미터(보레이트 등)는 `docs/`에 프로토콜 스펙 문서로 별도 관리 권장.

## 7. 워치독 (2단계 자동 복구)

- ATtiny13A(U4)가 485_RX 활동을 피크검출 회로(D4+R10+C9)로 감시. 일정 시간 무통신 시:
  - **1단계**: Arduino RESET 핀을 짧게 풀다운 → 소프트 리셋.
  - **2단계**: 소프트 리셋을 N회 반복해도 무응답 지속 시, H_Reset(=w_dog_RST) 넷을 통해 12V 로드스위치(Q1) 자체를 차단 후 재인가 → 완전한 콜드리셋.
- ATtiny13A 펌웨어는 UNO 펌웨어와 **별도로 개발/빌드**되며, ISP로 직접 구워야 함(UNO처럼 USB 업로드 불가).

## 8. 도어락

- SW1(SPDT)로 12V/5V 중 설치 시 택1. 펌웨어 관점에서는 전압 무관하게 OPEN_CTL(A1) HIGH/LOW로 동일하게 제어.
- LOCK_STATE(A2)로 도어 실제 상태 감지, OPEN_BTN(A0)으로 로컬 버튼 입력.

## 9. 변경 이력 관리 원칙

- 하드웨어 회로/핀맵이 바뀌면 반드시 이 파일과 `docs/SmartVault_Design_Document.docx`(또는 그 markdown 버전)를 함께 업데이트할 것.
- 넷 이름은 KiCad 실제 회로도 기준을 표준으로 함 (예: `H_Reset`이 표준이며 `PWR_EN`은 과거 참고안에서 쓰던 구 명칭이므로 코드/문서에서 사용하지 말 것).
