# vault-gateway — 보관함 게이트웨이(Arduino UNO) 펌웨어

내무반 1개당 1대 설치되는 컨트롤러 보드 펌웨어. 핀맵/하드웨어 확정 스펙은
`hardware/CLAUDE.md` 1장을 따른다 — 핀 번호를 바꿔야 하면 그 문서를 먼저 고치고 `pins.h`를 맞출 것.

## 레거시 참고 코드

`Z:\HDD2\스마트폰보관함\1. 일반\mcuProgram\ver1_2_1_close_reading_only_white_MCU_20250204`
(가장 최신 버전, 파일명 날짜 기준)가 실전에서 쓰인 이전 보드 펌웨어다. 여기서 실제로
가져온 값/로직:
- 도어락 개방 펄스 2000ms, LOCK_STATE 극성(LOW=닫힘) — `door_lock.cpp`
- 버튼은 "지금 닫혀 있을 때만" 먹는다 — `door_lock.cpp`
- 카드 인식 멜로디(G7,G7,G5,G5 각 ~31ms) — `buzzer.cpp`
- 내장 AVR 워치독(`wdt_enable(WDTO_2S)`, RS485 바이트 수신 시에만 `wdt_reset()`) — `vault-gateway.ino`

의도적으로 안 가져온 것: 리더 CS 방식(레거시는 리더당 GPIO 10개 직결, 이 보드는
74LVC138A 디코더라 배선 자체가 다름)과 통신 프레임 포맷(레거시는 가변 구분자 텍스트,
여기는 고정 길이+체크섬으로 재설계 — `docs/architecture.md` 5장이 원래 그렇게 하라고
명시한 부분).

## 상태 (v0 초안, 2026-09-02)

**컴파일 확인 완료** — `arduino-cli` 1.5.1 + `arduino:avr` 1.8.8 + `MFRC522` 1.4.12로
`arduino:avr:uno` 대상 컴파일, `--warnings all`에서도 경고 0개. 스케치 9894바이트(30%),
전역변수 488바이트(23%) 사용. 재현하려면:

```powershell
arduino-cli core install arduino:avr
arduino-cli lib install MFRC522
arduino-cli compile --fqbn arduino:avr:uno --warnings all firmware/vault-gateway
```

컴파일만 확인한 것이고 **실제 보드에서 동작을 검증한 적은 없음** — RFID 리더/도어락 없이는
`rfid_mux`/`door_lock`이 실제 하드웨어와 맞물려 도는지 알 수 없다. 업로드 전 벤치 테스트 필수.

## 필요한 라이브러리 (Arduino IDE 라이브러리 매니저)

- `MFRC522` (miguelbalboa/rfid) — RFID 리더 제어
- `SoftwareSerial`, `SPI` — 아두이노 코어 내장, 별도 설치 불필요

## 보드 설정

- 보드: Arduino UNO
- 업로드: USB(소켓 마운트된 UNO에 직접) — PlatformIO 아님, Arduino IDE로 이 폴더를 스케치로 열기

## 모듈 구성

| 파일 | 역할 |
|---|---|
| `pins.h` | 핀맵 상수 (근거: hardware/CLAUDE.md 1장) |
| `gateway_identity.h` | **설치자가 직접 편집**하는 `GATEWAY_GROUP_ID`(2글자) — DIP주소와 합쳐 4글자 게이트웨이 ID를 만든다 |
| `device_id.*` | 74HC165 DIP 스위치 8비트 읽기 (부팅 시 1회) |
| `rfid_mux.*` | 74LVC138A 디코더로 리더 선택. **"새 카드 이벤트"가 아니라 "지금 상태 조회"** — 호출될 때마다 그 리더를 재초기화해서 계속 거치 중인 카드도 매번 다시 감지되게 함(스마트폰이 슬롯에 몇 시간씩 거치돼 있어도 실시간 상태를 알아야 하므로). **MFRC522 라이브러리의 SS 핀 토글은 실제 배선과 무관** — 진짜 선택은 이 모듈이 디코더 주소로 미리 해둔다 |
| `rs485_link.*` | 집중장치와의 프레임 송수신. **명령 없이 스스로 아무것도 안 보냄**(자동 하트비트 없음 — 여러 게이트웨이가 한 버스를 쓰므로 버스 충돌 방지). `READEROP='R'`로 콕 집어 물어볼 때만 도어 상태+리더 상태를 한 번에 응답, 브로드캐스트로 온 'R'은 무시. check_in/check_out 판단은 안 하고 현재 상태만 보고, 부저도 안 울림(서버 보고용과 로컬 확인음은 별개) (`firmware/docs/protocol-spec.md` 참고) |
| `door_lock.*` | 도어락 구동/버튼/센서, **fail-secure 정책** (통신 두절 시 무조건 잠금). 펄스 길이/극성/버튼 가드는 레거시에서 검증된 값 |
| `presence_watch.*` | 문이 열려 있는 동안 **게이트웨이가 스스로** 리더를 순회하며, 빈 자리에 폰이 새로 놓이는 순간에만 확인 부저(뺄 땐 무음). RS485/서버와 무관한 순수 로컬 로직이라 통신 두절 중에도 동작 |
| `buzzer.*` | 부저 — 카드 인식 멜로디는 레거시 값 그대로, 나머지는 placeholder |
| `vault-gateway.ino` | `setup()`/`loop()` — 위 모듈을 엮음. 내장 AVR 워치독도 여기서 관리 |

## 알려진 미해결 항목

1. **실제 하드웨어에서는 미검증** — 컴파일만 확인됨(위 참고). 실물 리더/락 붙여서 동작 테스트 필요.
2. **ATtiny13A 워치독 펌웨어** — 완전히 별개 프로젝트(ISP로 직접 굽고 소켓에 꽂음, 여기 스케치와 무관). 아직 시작 안 함.
3. **도어락 펄스/센서 극성 재확인 권장** — 레거시 값(2000ms, LOW=닫힘)을 그대로 가져왔지만, 배선판이 바뀐 새 보드에서 벤치로 한 번은 재확인 권장(`door_lock.cpp` 상단 주석).
4. **RESET 필드(전체 재부팅류) 미연결** — 프로토콜상 파싱은 하지만 아직 실제 동작에 안 이어짐(`rs485_link.cpp`의 `(void)resetScope`).
5. **집중장치(`gateway-bridge/`) 쪽 파서 + check_in/check_out diff 로직 미구현** — 지금 이 펌웨어가 보내는 `:RD:...:PRESENT:...` 응답을 실제로 받아서 리더별 마지막 상태와 비교해 입고/출고 전환을 만드는 코드가 반대편에 아직 없다(`bridge/protocol_parser.py` 없음). 이 diff는 **집중장치가 기본 담당**, 서버 이벤트 관리와 연계해서 확장 가능하게 만들기로 확정(2026-09-02).
6. **개방/오류 부저 톤** — placeholder(레거시엔 대응 패턴 없음). 카드 인식 멜로디만 레거시 검증값.
7. **폴링 주기/명령 간격 실측 필요** — `protocol-spec.md`의 타이밍 수치는 보레이트 계산만 한 추정치, 실물 리더 스캔 시간 미측정.

## 게이트웨이 ID ↔ gateway_id 매핑 (2026-09-02 확정, 상세는 protocol-spec.md)

DIP 스위치(8비트)만으로는 버스 하나 안에서만 유일해서, `gateway_identity.h`의
`GATEWAY_GROUP_ID`(설치자가 하드웨어/펌웨어 배치별로 편집하는 2글자 상수)와 합쳐
4글자 원시 ID를 만들어 RS485로 전달한다. 이건 최종 `gateway_id`(`"1CORPS-B3-R204-G1"`
같은 문자열)가 아니다 — **로컬 설정 파일로 미리 매핑을 만들어두지 않는다.** 대신 이미
있는 관리자 등록 플로우(`detected_gateways` → `GatewayListPage.jsx`에서 매칭 → `gateways`
정식 등록)를 그대로 재사용한다: 집중장치는 미등록 원시 ID를 그대로 서버에 올리고,
관리자가 방과 매칭하면 그 결과를 집중장치가 캐시해서 이후 보고에 쓴다. 이 캐싱/동기화
로직 자체는 아직 `gateway-bridge` 쪽에 없다(다음 단계).
