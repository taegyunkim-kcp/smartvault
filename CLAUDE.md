# CLAUDE.md — SmartVault (NFC/RFID 스마트폰 보관함 잠금장치)

이 파일은 저장소 루트에 두면 Claude Code가 세션 시작 시 자동으로 읽습니다. **분야별
세부 내용은 각 하위 디렉토리의 CLAUDE.md로 나눠뒀습니다**(2026-09-02) — Claude Code는
해당 디렉토리에서 작업할 때 그 문서를 이 파일과 함께 자동으로 읽습니다. 하드웨어
설계는 claude.ai의 별도 프로젝트에서 KiCad 회로도를 기준으로 검토·확정되었으며,
상세 근거·회로도 이미지는 `docs/SmartVault_Design_Document.docx`를 참고하세요.

## 1. 시스템 개요

- 다수의 스마트폰 보관함(사물함) 하나하나에 설치되는 컨트롤러 보드. RS485 멀티드롭 버스로 상위 서버와 통신.
- 기능: ① NFC/RFID 카드로 슬롯(최대 10개) 사용자 인식, ② 전자 도어락 개폐 제어/상태 감지, ③ RS485 통신, ④ 통신 두절 시 2단계 자동 복구(워치독), ⑤ DIP 스위치 기반 현장 설정(장치 ID, RS485 종단/바이어스, 도어락 전압).
- 메인 MCU: Arduino UNO(소켓 마운트, USB로 직접 업로드). 보조 워치독 MCU: ATtiny13A-P(DIP-8, **소켓 실장** — 별도 ISP 프로그래머로 미리 구운 뒤 꽂아 사용, 보드에 ISP 헤더 없음).
- 전원: 12V 어댑터 입력 → 보드에서 5V(MP2307DN)/3.3V(AMS1117-3.3) 자체 생성. UNO는 **5V 핀으로만** 급전(VIN·온보드 3.3V 핀 미사용).

## 2. 저장소 구조

```
smartvault/
├── hardware/          # KiCad 프로젝트 (회로도/PCB) — CLAUDE.md: 핀맵/회로 확정 스펙
├── firmware/          # Arduino UNO 펌웨어(.ino) + ATtiny13A 워치독 펌웨어
├── gateway-bridge/    # 건물별 Concentrator — RS485 프레임 수신/파싱 (Python)
├── backend/           # API 서버 (Node/Express + MySQL)
├── frontend/          # 관리자 대시보드 (React)
├── docs/              # 설계문서, 통신 프로토콜 스펙 등 공통 참조 자료
└── CLAUDE.md          # 이 파일
```

firmware가 만드는 RS485 프레임과 gateway-bridge가 파싱하는 포맷은 반드시 동일한 스펙을 따라야 합니다 — 프로토콜 변경 시 `firmware/docs/protocol-spec.md`와 함께 업데이트하세요.

## 3. 분야별 문서

| 디렉토리 | CLAUDE.md 내용 |
|---|---|
| `hardware/` | Arduino UNO 핀맵, RFID 리더 배선, 장치 ID(DIP), RS485 트랜시버, 워치독 회로, 도어락 배선 — 회로/핀맵의 **단일 근거(source of truth)**. 펌웨어에서 핀 번호나 넷 이름을 참조할 땐 항상 이 문서를 기준으로 삼을 것 |

`firmware/`, `backend/`, `frontend/`, `gateway-bridge/`는 아직 자체 CLAUDE.md가 없습니다 — 각 분야 컨벤션이 쌓이면 그때 추가하세요(지금은 각 디렉토리의 `README.md`가 그 역할을 일부 대신하고 있습니다).
