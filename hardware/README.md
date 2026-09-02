# hardware — 보관함 게이트웨이 KiCad 프로젝트

Arduino UNO 게이트웨이 보드의 회로도/PCB 원본. `CLAUDE.md`가 이 설계를 검토·확정한
뒤 요약한 문서이므로, **핀맵/넷 이름 등은 CLAUDE.md를 표준으로 삼고**, 실제 배선의
세부(부품값, 커넥터 핀아웃 등)를 확인할 땐 여기 KiCad 파일을 연다.

## 구성

- `kicad/smartvault.kicad_pro` — 프로젝트 파일, KiCad로 이걸 연다.
- `kicad/smartvault.kicad_sch` — 최상위 시트. 아래 서브시트를 계층적으로 포함:
  - `DEVid-Buzz.kicad_sch` — 74HC165 장치ID + 부저
  - `DoorRock-drv.kicad_sch` — 도어락 구동
  - `MFRC522_Conn.kicad_sch` — RFID 리더 10개 커넥터 + 74LVC138A 디코더 뱅크
  - `power.kicad_sch` — 12V→5V/3.3V 전원부
  - `RS485-com.kicad_sch` — MAX13487E RS485 트랜시버
  - `RST-wDog.kicad_sch` — ATtiny13A 워치독/리셋 회로
- `kicad/smartvault.kicad_pcb` — PCB 레이아웃(아직 초기 단계 — 배치/라우팅 미완료일 수 있음)
- `kicad/s_vault.kicad_sym` — 커스텀 심볼 라이브러리(이 프로젝트 전용으로 그린 부품 심볼).
  **주의**: 2026-09-02 기준 원본 작업 폴더에서 이 파일을 찾을 수 없었다(아래 "원본 출처"
  참고) — 지금 여기 있는 건 2026-09-01에 복사해둔 이전 버전이다. `RS485-com.kicad_sch`/
  `power.kicad_sch`가 이 라이브러리의 심볼을 참조하므로, 최신 심볼 정의가 바뀌었다면
  이 파일도 최신본으로 갱신해야 한다.
- `kicad/footprint.xlsx` — 부품-풋프린트 매핑 스프레드시트(2026-09-02 추가)

## 원본 출처

`Z:\HDD2\pcb 설계\회로도 편집 완료\20260901_ver01\`에서 2026-09-02에 복사해왔다(원본은
계속 그 경로에서 편집됨 — KiCad 자체는 claude.ai의 별도 프로젝트에서 검토됨,
CLAUDE.md 헤더 참고). 원본 프로젝트 파일명은 `20260901_ver01.kicad_*`이지만, 저장소
안에서는 계속 `smartvault.kicad_*`로 통일했다(작업 폴더에 날짜/버전을 붙이는 건 원본
쪽 관례일 뿐 — git이 버전을 관리하므로 저장소 파일명까지 따라 바꾸지 않는다. 파일
내부에 프로젝트명을 참조하는 부분(`(project "...")`, `.kicad_pro`의 filename 필드 등)은
전부 `smartvault`로 바꿔서 복사했다).

**이전 원본 경로**(`smartvault-pcb-1/smartvault/`)는 2026-09-02 기준 더 이상 존재하지
않는다 — `회로도 편집 완료/20260901_ver01/`로 재구성된 것으로 보인다. 다음에 갱신할 땐
이 폴더 구조가 또 바뀌었을 수 있으니 먼저 확인할 것.

**이 저장소의 사본은 스냅샷이다** — 실제 설계가 바뀌면 원본에서 다시 복사해서 갱신해야
하고, 그때마다 `CLAUDE.md`도 같이 확인해서 핀맵이 안 어긋나게 맞출 것(CLAUDE.md 9장
"변경 이력 관리 원칙" 그대로 적용).

상세 설계 문서(회로도 이미지 포함)는 `docs/SmartVault_Design_Document.docx`도 같이 참고.
