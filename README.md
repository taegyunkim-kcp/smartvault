# SmartVault (NFC Smart Vault MIL-S)

군부대 내무반용 스마트폰 보관함 IoT 시스템. 모노레포 구조.

## 레포 구조

```
smartvault/
├── hardware/          # 게이트웨이 보드 KiCad 프로젝트 (회로도/PCB)
├── firmware/          # Arduino MCU 펌웨어 (RFID×10 리더, 잠금장치 제어)
├── gateway-bridge/    # 건물별 Concentrator - RS485 ↔ 중앙서버 브리지 (Python)
├── backend/           # API 서버 (Node/Express + MySQL)
├── frontend/          # 관리자 대시보드 (React)
└── docs/              # 아키텍처/온보딩/프로토콜/설계 문서
```

## 개발 시작하기 (Windows)

자세한 설치 절차는 `docs/dev-environment-setup.md` 참고. 요약:

```powershell
# 1. DB 컨테이너 기동 (개발용)
docker compose -f docker-compose.dev.yml up -d

# 2. 백엔드
cd backend
copy .env.example .env.development
npm install
npm run dev

# 3. 프론트엔드
cd ../frontend
npm install
npm run dev
```

## 개발/운영 환경 분리 원칙

이 PC 한 대에서 개발과 운영을 동시에 돌립니다. **절대 같은 포트·같은 DB를 쓰지 않습니다.**

| | 개발(dev) | 운영(prod) |
|---|---|---|
| 백엔드 포트 | 4000 | 4001 |
| 프론트엔드 포트 | 3000 (vite dev server) | 3001 (정적 빌드 서빙) |
| DB 포트 | 3307 (Docker) | 3308 (Docker) |
| DB 이름 | smartvault_dev | smartvault_prod |
| 환경변수 파일 | `.env.development` | `.env.production` |
| 실행 방식 | `npm run dev` (터미널, 코드 수정 시 자동 재시작) | PM2로 백그라운드 상시 구동 |

자세한 내용은 `docs/dev-environment-setup.md` 참고.
