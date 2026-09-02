# CLAUDE.md — SmartVault 하드웨어 (게이트웨이 보드 회로/핀맵)

루트 `CLAUDE.md`의 하드웨어 세부 내용을 여기로 분리했습니다(2026-09-02) — `hardware/`
또는 `firmware/`에서 작업할 때 Claude Code가 이 문서를 같이 읽습니다. KiCad 원본은
`hardware/kicad/`(원본 출처/최신 작업 폴더는 `hardware/README.md` 참고), 상세 회로도
이미지는 `docs/SmartVault_Design_Document.docx`를 참고하세요.

## 1. Arduino UNO 핀맵 (확정)

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

## 2. RFID 리더 (MFRC522 × 10)

- CS(SS) 선택: 74LVC138A 디코더 2개(U6: SS_1~8, U7: SS_9~10)를 DEC_A/B/C(3비트 주소) + BANK(뱅크선택)로 제어. **한 번에 하나의 리더만 활성화**하도록 펌웨어에서 주소를 세팅해야 함 (동시에 여러 리더가 선택되면 SPI 버스 충돌).
- 레벨시프트: MOSI/SCK/RST는 74LVC125A(5V→3.3V), MISO는 74AHCT1G125(3.3V→5V)로 별도 처리.
- 리더 순차 폴링 필요 (RF 간섭 방지) — 한 번에 하나의 리더 CS만 활성화.
- 각 리더 커넥터(J_MFC_1~10)는 8핀: SS_x / SCK_3V3 / MOSI_3V3 / MISO / IRQ / RST_3V3 / GND / +3V3. **IRQ는 현재 MCU에 미연결(예비)** — 인터럽트 기반으로 전환 시 배선 추가 필요.

## 3. 장치 ID (74HC165 + DIP 스위치)

- SW5+SW6(4채널×2, 총 8비트)로 장치 고유 ID 설정. 전원 인가 시 PL(DEV_PL)을 통해 래치하고 CP(DEV_CP) 클럭으로 DEV_ID(A3)에서 8비트를 순차 shift-in.
- DIP 스위치 변경 후 **재부팅만 하면 재업로드 없이 주소가 바뀜**.

## 4. RS485 통신

- 트랜시버: MAX13487E (AutoDirection — RE#/SHDN# 모두 VCC 고정, 방향전환 자동 처리, 펌웨어에서 별도 DE/RE 제어 불필요).
- 종단저항(120Ω, SW2)과 바이어스(SW3=A라인 풀업/SW4=B라인 풀다운)는 버스 내 **1개 노드에서만 ON** — 설치 현장에서 물리 스위치로 결정. 펌웨어는 이를 신경 쓸 필요 없음.
- 통신 파라미터(보레이트 등)·프레임 포맷은 `firmware/docs/protocol-spec.md` 참고.

## 5. 워치독 (2단계 자동 복구)

- ATtiny13A(U4)가 485_RX 활동을 피크검출 회로(D4+R10+C9)로 감시. 일정 시간 무통신 시:
  - **1단계**: Arduino RESET 핀을 짧게 풀다운 → 소프트 리셋.
  - **2단계**: 소프트 리셋을 N회 반복해도 무응답 지속 시, H_Reset(=w_dog_RST) 넷을 통해 12V 로드스위치(Q1) 자체를 차단 후 재인가 → 완전한 콜드리셋.
- ATtiny13A 펌웨어는 UNO 펌웨어와 **별도로 개발/빌드**되며, ISP로 직접 구워야 함(UNO처럼 USB 업로드 불가).

## 6. 도어락

- SW1(SPDT)로 12V/5V 중 설치 시 택1. 펌웨어 관점에서는 전압 무관하게 OPEN_CTL(A1) HIGH/LOW로 동일하게 제어.
- LOCK_STATE(A2)로 도어 실제 상태 감지, OPEN_BTN(A0)으로 로컬 버튼 입력.

## 7. 변경 이력 관리 원칙

- 하드웨어 회로/핀맵이 바뀌면 반드시 이 파일과 `docs/SmartVault_Design_Document.docx`(또는 그 markdown 버전)를 함께 업데이트할 것.
- 넷 이름은 KiCad 실제 회로도 기준을 표준으로 함 (예: `H_Reset`이 표준이며 `PWR_EN`은 과거 참고안에서 쓰던 구 명칭이므로 코드/문서에서 사용하지 말 것).
