# 개발 환경 구축 가이드 (Windows, 개발+운영 한 PC)

전제: 이 PC는 지금 인터넷이 됩니다. 실제 부대 폐쇄망 배치는 이후 별도 단계/별도 PC에서 진행합니다.
그래서 지금은 일반적인 온라인 설치 방식(winget/설치파일)을 그대로 씁니다.

## 0. 설치 순서 요약

1. Git for Windows
2. Claude Code (네이티브 설치)
3. Node.js LTS
4. Python 3.x
5. Docker Desktop (WSL2 백엔드) — 개발/운영 DB를 컨테이너로 분리
6. (선택) VS Code — Claude Code와 병행 사용 가능

---

## 1. Git for Windows

https://git-scm.com/download/win 에서 설치. 기본 옵션 그대로 진행해도 됩니다.
Claude Code가 Windows 네이티브 셸에서 Bash 도구를 쓰려면 Git for Windows가 필요합니다.

## 2. Claude Code 설치

PowerShell을 **관리자 권한 아닐 필요 없음**, 그냥 일반 PowerShell 열어서:

```powershell
irm https://claude.ai/install.ps1 | iex
```

설치 후 터미널을 새로 열고:

```powershell
claude doctor
```

로 정상 설치를 확인합니다. Claude Pro/Max/Team/Enterprise 계정 또는 Console(API) 계정이 필요합니다.

## 3. Node.js LTS

https://nodejs.org 에서 LTS 버전 설치 (백엔드 Express, 프론트엔드 React 빌드에 필요).
설치 후 확인:

```powershell
node -v
npm -v
```

## 4. Python 3.x

https://www.python.org/downloads/windows/ 에서 설치. **설치 시 "Add python.exe to PATH" 체크 필수** (게이트웨이 브리지 실행에 필요).

```powershell
python --version
```

## 5. Docker Desktop

https://www.docker.com/products/docker-desktop/ 에서 설치, WSL2 백엔드로 설정.
설치 이유: 개발용 DB와 운영용 DB를 완전히 분리된 컨테이너로 띄워서, 개발 중 실수로 운영 데이터를 건드릴 위험을 원천 차단합니다.

```powershell
docker --version
docker compose version
```

---

## 6. 레포 초기 설정

압축 해제한 `smartvault/` 폴더를 원하는 위치에 둡니다 (예: `C:\dev\smartvault`).

```powershell
cd C:\dev\smartvault
git init
git add .
git commit -m "init: 프로젝트 스캐폴드"
```

### 백엔드

```powershell
cd backend
copy .env.example .env.development
# .env.development 파일을 열어서 DB_PASSWORD, JWT_SECRET, BRIDGE_API_KEYS 값을 실제 값으로 채우세요.
npm install
```

### 프론트엔드

`frontend/README.md`의 안내대로 Vite 프로젝트를 생성합니다.

### 게이트웨이 브리지

```powershell
cd gateway-bridge
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# .env 파일을 열어서 CONCENTRATOR_ID, SERIAL_PORT 등을 실제 값으로 채우세요.
```

---

## 7. 개발 모드로 띄우기

```powershell
# 1) 개발용 DB 컨테이너 기동
cd C:\dev\smartvault
docker compose -f docker-compose.dev.yml up -d

# 2) 스키마 적용 (최초 1회 및 마이그레이션 추가 시)
docker exec -i smartvault-dev-db mysql -u smartvault_dev -pdevpass_change_me smartvault_dev < backend\migrations\001_init.sql

# 3) 백엔드 (포트 4000, 코드 수정 시 자동 재시작)
cd backend
npm run dev

# 4) 프론트엔드 (포트 3000, 별도 터미널)
cd frontend
npm run dev
```

`http://localhost:4000/health` 접속해서 `{"status":"ok","env":"development"}` 나오면 백엔드 정상.

---

## 8. "운영" 모드로 같은 PC에서 띄우기

개발과 운영을 **완전히 다른 포트·다른 DB**로 분리해서 동시에 켜둘 수 있습니다.

```powershell
# 1) 운영용 DB 컨테이너 (dev와 별개 볼륨/포트)
copy .env.example .env.production   # backend 폴더 안에서, 값은 운영용으로 채움 (DB_PORT=3308 등)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 2) 운영 스키마 적용
docker exec -i smartvault-prod-db mysql -u <운영유저> -p<운영비번> smartvault_prod < backend\migrations\001_init.sql
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

## 9. Claude Code로 작업 시작하기

```powershell
cd C:\dev\smartvault
claude
```

Claude Code 안에서 이 레포 구조(firmware/gateway-bridge/backend/frontend/docs)와
`docs/architecture.md`(별도 전달된 아키텍처 제안서를 이 폴더에 복사해두시면 Claude Code가 참고합니다)를
기준으로 이어서 개발을 진행하시면 됩니다.

**작업 지시할 때 팁**: "백엔드에 gateways CRUD API 만들어줘" 처럼 레이어 이름(routes/services/repositories)을
명시하면 이 레포 구조를 그대로 따라서 코드를 넣어줍니다.

---

## 체크리스트

- [ ] Git, Claude Code, Node.js, Python, Docker Desktop 설치 완료
- [ ] `claude doctor` 정상
- [ ] `.env.development` 채움 (커밋 안 됨 확인: `git status`에 안 뜨는지)
- [ ] 개발 DB 컨테이너 기동 + 스키마 적용
- [ ] 백엔드 `/health` 정상 응답
- [ ] 프론트엔드 dev 서버 기동
- [ ] (운영 준비되면) `.env.production` 채움, prod DB 컨테이너 별도 기동, PM2로 백엔드 상시 구동
