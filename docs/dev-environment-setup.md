# 개발 환경 구축 가이드 (Windows, 다른 PC에서 동일하게 세팅하기)

이 레포는 GitHub(`https://github.com/taegyunkim-kcp/smartvault`)에 올라가 있으므로, 새 PC에서는
"레포를 처음부터 만드는 것"이 아니라 **클론해서 세팅**하면 됩니다. 인터넷이 되는 일반 PC 기준(winget/설치파일)
설치 절차입니다 — 실제 부대 폐쇄망 배치는 별도 단계/별도 PC에서 진행합니다.

## 0. 설치 순서 요약

1. Git for Windows
2. VS Code
3. Claude Code (네이티브 설치 + VS Code 확장)
4. Node.js LTS
5. Python 3.x
6. Docker Desktop (WSL2 백엔드) — 개발/운영 DB를 컨테이너로 분리

---

## 1. Git for Windows

https://git-scm.com/download/win 에서 설치. 기본 옵션 그대로 진행해도 됩니다.
Claude Code가 Windows 네이티브 셸에서 Bash 도구를 쓰려면 Git for Windows가 필요합니다.

## 2. VS Code

https://code.visualstudio.com/ 에서 설치. 기본 옵션 그대로 진행하면 됩니다.
(에디터는 필수는 아니지만, 아래 Claude Code VS Code 확장을 쓰려면 먼저 설치돼 있어야 합니다.)

## 3. Claude Code 설치

PowerShell을 **관리자 권한 아닐 필요 없음**, 그냥 일반 PowerShell 열어서:

```powershell
irm https://claude.ai/install.ps1 | iex
```

설치 후 터미널을 새로 열고:

```powershell
claude doctor
```

로 정상 설치를 확인합니다. Claude Pro/Max/Team/Enterprise 계정 또는 Console(API) 계정이 필요합니다.

**VS Code 확장(선택, 권장)**: VS Code Extensions 마켓플레이스에서 "Claude Code" 검색해 설치하면
VS Code 통합 터미널/사이드바에서 바로 Claude Code를 띄울 수 있습니다. 확장 없이도 `claude`는
VS Code의 통합 터미널에서 그냥 실행하면 자동으로 IDE 연동(열린 파일·선택 영역 인식 등)이 됩니다.

## 4. Node.js LTS

https://nodejs.org 에서 LTS 버전 설치 (백엔드 Express, 프론트엔드 React 빌드에 필요).
설치 후 확인:

```powershell
node -v
npm -v
```

## 5. Python 3.x

https://www.python.org/downloads/windows/ 에서 설치. **설치 시 "Add python.exe to PATH" 체크 필수** (게이트웨이 브리지 실행에 필요).

```powershell
python --version
```

## 6. Docker Desktop

https://www.docker.com/products/docker-desktop/ 에서 설치, WSL2 백엔드로 설정.
설치 이유: 개발용 DB와 운영용 DB를 완전히 분리된 컨테이너로 띄워서, 개발 중 실수로 운영 데이터를 건드릴 위험을 원천 차단합니다.

```powershell
docker --version
docker compose version
```

---

## 7. 레포 클론 + 초기 설정

원하는 위치에 GitHub에서 클론합니다 (예: `C:\dev\smartvault`).

```powershell
cd C:\dev
git clone https://github.com/taegyunkim-kcp/smartvault.git
cd smartvault
```

**`.env.*` 파일은 git에 안 올라가 있습니다**(`.gitignore`에 포함, 시크릿이라 의도적으로 제외). 새 PC에서는
아래처럼 `.env.example`을 복사해서 새로 채워야 합니다 — 기존 PC의 값을 그대로 옮길 필요는 없고,
새 값(특히 `JWT_SECRET`)을 새로 생성해도 됩니다. 개발용 DB 비밀번호만 `docker-compose.dev.yml`에 적힌
값과 일치시키면 됩니다.

### 백엔드

```powershell
cd backend
copy .env.example .env.development
# .env.development 파일을 열어서 DB_PASSWORD, JWT_SECRET, BRIDGE_API_KEYS 값을 채우세요.
# DB_PASSWORD는 docker-compose.dev.yml의 MYSQL_PASSWORD와 동일해야 합니다.
npm install
```

### 프론트엔드

```powershell
cd ../frontend
copy .env.example .env.development
# VITE_API_BASE_URL=http://localhost:4000 그대로 두면 됩니다(백엔드 개발 포트).
npm install
```

### 게이트웨이 브리지

```powershell
cd ../gateway-bridge
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# .env 파일을 열어서 CONCENTRATOR_ID, SERIAL_PORT 등을 실제 값으로 채우세요.
```

---

## 8. 개발 모드로 띄우기

```powershell
# 1) 개발용 DB 컨테이너 기동
cd C:\dev\smartvault
docker compose -f docker-compose.dev.yml up -d

# 2) 스키마 적용 (최초 1회 — migrations 폴더의 파일을 번호 순서대로 전부 적용)
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\001_init.sql
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\002_personnel_and_door_control.sql
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\003_gateway_reported_lock_state.sql
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\004_org_groups.sql
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\005_detected_gateways.sql
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pktg0506@! smartvault_dev < backend\migrations\006_status_event_acknowledgement.sql
# 이후 새 마이그레이션이 추가되면 같은 방식으로 번호 순서대로 적용하면 됩니다 (자동 마이그레이션 도구는 아직 없음).

# 3) 백엔드 (포트 4000, 코드 수정 시 자동 재시작)
cd backend
npm run dev

# 4) 프론트엔드 (포트 3000, 별도 터미널)
cd frontend
npm run dev
```

`http://localhost:4000/health` 접속해서 `{"status":"ok","env":"development"}` 나오면 백엔드 정상.

### 데모 데이터로 화면 테스트하기

모니터링 대시보드/개폐 시간표 화면을 실제 데이터 없이도 눌러보며 확인할 수 있도록, 대량 데모 데이터를 채워주는 스크립트가 있습니다.

```powershell
cd backend
npm run seed:demo         # 기지 2개, 내무반 10개, 인원 100명(RFID 90 매칭/10 미매칭), 탐지·개폐 이벤트 생성
npm run seed:demo:clean   # 재생성 없이 데모 데이터만 삭제(원복)
```

- 재실행해도 안전합니다(멱등) — `seed:demo`를 다시 돌리면 이전 데모 데이터를 지우고 새로 채웁니다.
- 생성/삭제 대상은 `base_code`가 `2CORPS`/`3CORPS`인 데이터, 군번이 `26-2000xxx`인 인원, `DEMO-UID-*` RFID로 한정되어 있어 기존에 등록해둔 실제 데이터(예: `1base`/`1CORPS`)는 건드리지 않습니다.
- 자세한 생성 규칙(방 배치, 매칭/미매칭 비율, 상태 시뮬레이션 확률 등)은 `backend/scripts/seed-demo-data.js` 참고.

---

## 9. "운영" 모드로 같은 PC에서 띄우기

개발과 운영을 **완전히 다른 포트·다른 DB**로 분리해서 동시에 켜둘 수 있습니다.

```powershell
# 1) 운영용 DB 컨테이너 (dev와 별개 볼륨/포트)
copy .env.example .env.production   # backend 폴더 안에서, 값은 운영용으로 채움 (DB_PORT=3308 등)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 2) 운영 스키마 적용 (migrations 폴더 파일을 번호 순서대로 전부 적용 — 개발과 동일한 방식)
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\001_init.sql
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\002_personnel_and_door_control.sql
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\003_gateway_reported_lock_state.sql
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\004_org_groups.sql
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\005_detected_gateways.sql
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\006_status_event_acknowledgement.sql
```

운영 백엔드는 터미널을 계속 열어두지 않도록 **PM2**로 상시 구동합니다:

```powershell
npm install -g pm2
cd backend
pm2 start src/app.js --name smartvault-backend-prod --env production
pm2 save
pm2 startup   # 안내에 따라 Windows 부팅 시 자동 시작 등록 (선택)
```

운영 프론트엔드는 빌드 후 정적 파일을 서빙합니다 (예: `serve` 패키지):

```powershell
cd frontend
npm run build
npx serve -s dist -l 3001
```

### 개발/운영 상태 한눈에 확인

```powershell
docker ps                 # dev-db(3307), prod-db(3308) 둘 다 떠 있는지
pm2 list                  # 운영 백엔드 프로세스 상태
```

---

## 10. Claude Code로 작업 시작하기

VS Code에서 `smartvault` 폴더를 열고, 통합 터미널(`` Ctrl+` ``)에서:

```powershell
claude
```

또는 VS Code 밖에서 그냥 PowerShell로:

```powershell
cd C:\dev\smartvault
claude
```

레포에 이미 `docs/architecture.md`(아키텍처), `docs/data-model-personnel-door-control.md`(인원/RFID/개폐
데이터 모델), 이 문서(`docs/dev-environment-setup.md`)가 들어있어서 Claude Code가 새 PC에서도 곧바로
참고할 수 있습니다. `frontend/.claude/skills/run-frontend/`도 그대로 따라오므로, Playwright만 설치하면
(`cd frontend && npm install -D playwright && npx playwright install chromium`) 프론트엔드 화면 검증도
기존 PC와 동일하게 쓸 수 있습니다.

**작업 지시할 때 팁**: "백엔드에 gateways CRUD API 만들어줘" 처럼 레이어 이름(routes/services/repositories)을
명시하면 이 레포 구조를 그대로 따라서 코드를 넣어줍니다.

---

## 체크리스트

- [ ] Git, VS Code, Claude Code, Node.js, Python, Docker Desktop 설치 완료
- [ ] `claude doctor` 정상
- [ ] 레포 클론 완료 (`git clone` — `git init` 아님, 이미 GitHub에 있는 레포)
- [ ] 백엔드/프론트엔드 `.env.development` 각각 새로 채움(커밋 안 됨 확인: `git status`에 안 뜨는지)
- [ ] 개발 DB 컨테이너 기동 + 마이그레이션 001~005 전부 적용
- [ ] 백엔드 `/health` 정상 응답
- [ ] 프론트엔드 dev 서버 기동
- [ ] (선택) `npm run seed:demo`로 화면 테스트용 데모 데이터 생성
- [ ] (운영 준비되면) `.env.production` 채움, prod DB 컨테이너 별도 기동, PM2로 백엔드 상시 구동
