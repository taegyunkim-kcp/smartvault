# hardware — 보관함 게이트웨이 KiCad 프로젝트

Arduino UNO 게이트웨이 보드의 회로도/PCB 원본. 같은 디렉토리의 `CLAUDE.md`가 이
설계를 검토·확정한 뒤 요약한 문서이므로, **핀맵/넷 이름 등은 그 문서를 표준으로 삼고**,
실제 배선의 세부(부품값, 커넥터 핀아웃 등)를 확인할 땐 여기 KiCad 파일을 연다.

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
  원본: `D:\pcb\smartvault-pcb-1\s_vault.kicad_sym`. `RS485-com.kicad_sch`/`power.kicad_sch`가
  이 라이브러리의 심볼을 참조한다.
- `kicad/footprint.xlsx` — 부품-풋프린트 매핑 스프레드시트(2026-09-02 추가)

## 원본 출처

**작업은 이 PC의 `D:\pcb\회로도 편집 완료\`에서 KiCad로 직접 한다.** `Z:\HDD2\pcb 설계\`는
집 밖에서 작업할 때 쓰는 공유 드라이브로, D:의 내용을 그대로 미러링한다 — 두 경로
내용이 다르면 **D:을 기준으로 삼을 것**(2026-09-02 확정).

현재 버전(2026-09-02 기준): `D:\pcb\회로도 편집 완료\20260901_ver01\`. 원본 프로젝트
파일명은 `20260901_ver01.kicad_*`이지만, 저장소 안에서는 계속 `smartvault.kicad_*`로
통일했다(작업 폴더에 날짜/버전을 붙이는 건 원본 쪽 관례일 뿐 — git이 버전을 관리하므로
저장소 파일명까지 따라 바꾸지 않는다. 파일 내부에 프로젝트명을 참조하는 부분
(`(project "...")`, `.kicad_pro`의 filename 필드 등)은 전부 `smartvault`로 바꿔서
복사했다).

원본 작업 폴더 이름 자체가 버전마다 바뀌어왔다(`smartvault-pcb-1/smartvault/` →
`회로도 편집 완료/20260901_ver01/`) — 다음에 갱신할 때 폴더 구조가 또 바뀌었을 수
있으니 `D:\pcb\` 아래를 먼저 훑어서 최신 폴더를 확인할 것.

**이 저장소의 사본은 스냅샷이다** — 실제 설계가 바뀌면 원본에서 다시 복사해서 갱신해야
하고, 그때마다 같은 디렉토리의 `CLAUDE.md`도 같이 확인해서 핀맵이 안 어긋나게 맞출 것
(`CLAUDE.md` 7장 "변경 이력 관리 원칙" 그대로 적용).

상세 설계 문서(회로도 이미지 포함)는 `docs/SmartVault_Design_Document.docx`도 같이 참고.
