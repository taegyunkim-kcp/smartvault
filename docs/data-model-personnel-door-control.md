# 인원/RFID 매핑 · 개폐 정책 · 판정 이벤트 데이터 모델

> `architecture.md` 6장(데이터 계층 재설계)의 후속 문서. `001_init.sql`(기지/건물/방/게이트웨이/원본 이벤트)에 이어,
> "누가 어느 폰을 보관 중인가"와 "언제 열려야/잠겨야 하는가"를 다루는 스키마를 정리한다.

## 도메인 정리

- **보관함(내무반 1개당 1대)** = `gateways` 1행. RFID 리더 10개(5개×2단), 뒷면 아두이노 PCB. 도어락/부저 제어와 RFID 리더 정보 수집을 담당하며, 시리얼로 `concentrators`("데이터수집장치")에 전달한다.
- **서버 → 게이트웨이**: 도어 제어 정보(정책)를 내려주고, 게이트웨이는 열림 버튼 입력을 이 정책과 대조해서 실제 개폐를 결정한다(버튼을 누른다고 무조건 열리는 게 아니라, 로컬에 들고 있는 최신 정책 상태와 비교).
- **게이트웨이 → 수집장치**: RFID 리더 정보, 스마트폰 RFID, 도어 열림/닫힘 상태 → 각각 `rfid_events`/`door_events`(001_init.sql, append-only)에 대응.
- **시각(`occurred_at`) 태깅 주체는 게이트웨이가 아니라 수집장치(concentrator)** — 보관함(게이트웨이)은 시각 정보를 보내지 않고, 수집장치가 이벤트를 받은 시점의 자기 시계로 태깅해서 서버에 전달한다. `backend/src/services/ingestService.js`는 이미 `event.occurred_at`이 오면 그 값을 그대로 쓰고, 없을 때만 서버 수신 시각(`new Date()`)으로 대체하도록 되어 있어 이 흐름과 맞음 — `gateway-bridge`(수집장치 쪽 코드) 구현 시 이 필드에 자기 시계 기준 시각을 ISO 8601(+타임존 오프셋 또는 `Z`)로 채워 보내면 된다.
- **스마트폰 RFID는 인원(군인) 1명과 1:1**. 인원 정보 = 이름/군번(고유식별)/전화번호/소속(내무반).

## 대시보드 상태 판정 (장비 상태 기준 → 인원 기준으로 확장)

기존 3단계 모니터링 대시보드는 인원-RFID 매핑이 없던 시점이라 "게이트웨이 온라인 여부/이벤트 건수" 같은 장비 상태 기준으로 구현했다. 아래 모델이 갖춰지면 원래 의도한 인원 기준 상태로 확장한다.

- **전체 등록 수**: `personnel` 행 수 (RFID 매칭 완료 기준)
- **보관중**: 등록된 RFID가 자기 소속 내무반 게이트웨이에서 최근 감지됨
- **부재**: 등록됐는데 지금 어디서도 감지 안 됨(평시)
- **이상**: 지금이 정책상 "잠겨있어야 하는 시간대"인데 없음 — `door_schedules` 기준으로 판정
- **미등록**: 리더에 감지된 RFID인데 `personnel`에 매핑이 없음
- **타 내무반 보관 중**: 감지는 됐는데, 감지된 게이트웨이의 내무반이 소속 내무반과 다름

이 중 부재/이상/미등록/타내무반은 원본 이벤트가 아니라 **판정 로직의 산출물**이라, 상태가 바뀔 때만 `personnel_status_events`에 기록해서 대시보드 하단 로그로 보여준다. (판정 엔진 자체의 구현은 이 문서의 범위가 아니라 이후 로드맵 항목 — 아래 "다음 단계" 참고.)

## 개폐 정책 (도어락 제어)

세 가지가 서로 다른 메커니즘이라 분리해서 설계한다.

1. **기본 정책**: 요일별 반복, 30분 단위. 편제(기지/건물) 또는 내무반 단위로 설정 가능. 미리 제공되는 참조 템플릿으로 언제든 쉽게 초기화(환원) 가능.
2. **실시간 설정**: 기본 정책 데이터 자체를 직접 수정 — 영구 반영.
3. **즉각 실행**: 정책과 무관하게 버튼 클릭으로 **최대 30분** 한시적으로 문을 열어주는 명령. 시간이 지나면 정책 상태로 자동 복귀.

설정 화면은 내무반별 "현재 적용 정책 상태"와 "실제 도어 열림/닫힘 상태"를 함께 보여줘야 한다. 도어 이벤트가 기대되는 시점에 들어오지 않는 경우(예: 정책상 개방 전환 시각인데 door_event가 없음)도 횟수/시간 임계값 기반으로 별도 이상 이벤트로 처리한다.

## 데이터 규모와 보존 전략

보관함 20개 × 리더 10개 = 200 슬롯, 5초 미만 주기로 수집되는 환경을 가정한다. RFID 인식은 물리적으로 불안정해서 — 실제로 보관 중이어도 특정 순간엔 못 읽고, 다른 리더는 정상 인식되는 경우가 발생한다. 그래서:

- **raw 이벤트(`rfid_events`/`door_events`)는 판정 로직 분석·개선용으로 일정 기간(예: 30~90일)만 보관**하고, 만료분은 아카이빙 배치로 정리한다(`001_init.sql` 주석에 이미 명시됨).
- **장기 보관은 인식 성공/실패 패턴을 재구성 가능한 요약 지표**로 축약한다 — 단순 카운트가 아니라 리더별 성공 횟수·최대 미인식 구간(gap)·흔들림(flap) 횟수까지 남겨서, raw 없이도 인식률 패턴을 분석할 수 있게 한다(`rfid_reader_daily_stats`).
- raw 테이블의 `occurred_at` 기준 월별 파티셔닝은 데이터가 실제로 쌓이기 시작할 때 별도 작업으로 진행한다(기존 001 테이블의 PK를 변경해야 해서 지금 단계에서는 보류).

## 스키마 (`backend/migrations/002_personnel_and_door_control.sql`)

```sql
-- 인원 및 스마트폰 RFID 1:1 매핑
CREATE TABLE IF NOT EXISTS personnel (
  service_number VARCHAR(20) PRIMARY KEY,       -- 군번
  name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20),
  room_code VARCHAR(30) NOT NULL,                -- 소속 내무반
  rfid_uid VARCHAR(32) UNIQUE,                   -- 매칭 전엔 NULL (등록 → 이후 매칭 흐름 지원)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code)
);

-- 도어 개폐 기본 정책 참조 템플릿 (미리 제공, 환원용)
CREATE TABLE IF NOT EXISTS door_schedule_templates (
  template_code VARCHAR(30) PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  week_slots JSON NOT NULL,                       -- {"mon":[bool*48], ..., "sun":[bool*48]} (30분 단위)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 실제 적용 중인 개폐 정책 (편제 또는 내무반 단위, "실시간 설정"이 수정하는 대상)
CREATE TABLE IF NOT EXISTS door_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('base', 'building', 'room') NOT NULL,
  scope_code VARCHAR(30) NOT NULL,
  week_slots JSON NOT NULL,
  based_on_template VARCHAR(30),                  -- 환원 시 참조하는 템플릿
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_door_schedule_scope (scope_type, scope_code),
  FOREIGN KEY (based_on_template) REFERENCES door_schedule_templates(template_code)
);

-- 즉각 실행(임시 개방) 명령 — 정책과 무관, 만료 시각까지만 유효 (최대 30분)
CREATE TABLE IF NOT EXISTS door_overrides (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(30) NOT NULL,
  door_command ENUM('open') NOT NULL DEFAULT 'open',
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  requested_by INT,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code),
  FOREIGN KEY (requested_by) REFERENCES users_admin(id),
  INDEX idx_door_overrides_room_active (room_code, expires_at)
);

-- 판정 결과 이벤트: 부재/이상/미등록/타내무반 — raw 센서 로그가 아니라 "상태 판정 로직"의 산출물
CREATE TABLE IF NOT EXISTS personnel_status_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  status_type ENUM('absent', 'anomaly', 'unregistered_uid', 'wrong_room') NOT NULL,
  service_number VARCHAR(20),                     -- 미등록 UID 케이스는 NULL
  rfid_uid VARCHAR(32),
  room_code VARCHAR(30),                          -- 감지된 위치(타내무반 판정에 사용)
  detail JSON,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_number) REFERENCES personnel(service_number),
  INDEX idx_status_events_type_time (status_type, occurred_at)
);

-- 장기 보관용: 리더별 일간 인식률 요약 (raw rfid_events 만료분을 롤업 후 아카이빙하는 배치가 채움)
CREATE TABLE IF NOT EXISTS rfid_reader_daily_stats (
  stat_date DATE NOT NULL,
  gateway_id VARCHAR(40) NOT NULL,
  reader_index TINYINT NOT NULL,
  read_success_count INT NOT NULL DEFAULT 0,
  max_gap_seconds INT,                            -- 해당 리더가 가장 오래 미인식이었던 구간(초)
  flap_count INT NOT NULL DEFAULT 0,               -- 인식↔미인식 전환 횟수("흔들림")
  PRIMARY KEY (stat_date, gateway_id, reader_index),
  FOREIGN KEY (gateway_id) REFERENCES gateways(gateway_id)
);
```

### 설계 근거

- `door_schedules`를 `scope_type`+`scope_code`로 일반화해서 편제(기지/건물)·내무반 어느 단위든 같은 테이블로 표현한다. 실제 적용 정책 조회 시 내무반 → 건물 → 기지 순으로 우선순위 조회(상속)하면 된다.
- `door_overrides`는 정책 테이블과 완전히 분리한다 — "실시간 설정"(정책 데이터 수정)과 "즉각 실행"(한시적 오버라이드)이 서로 다른 메커니즘이라는 걸 스키마 레벨에서 명확히 한다.
- `personnel_status_events`는 `rfid_events`/`door_events`(원본 센서 로그)와 별개의 2차 판정 로그다. 원본 위에서 판정 로직(디바운스, 정책 대조)을 돌려서 상태가 바뀔 때만 기록하는 구조다.

## 이번 스키마에 포함하지 않은 것 (알아두되 나중 단계로 미룸)

- `rfid_events`/`door_events` **월별 파티셔닝** — 기존 001 테이블의 PK를 변경해야 해서 더 위험한 작업. 데이터가 실제로 쌓이기 시작할 때 진행.
- **아카이빙 배치 작업** 자체 — 스키마만 준비, 구현은 추후.
- **게이트웨이 → 서버 인입(ingestion) API**와 `middlewares/bridgeAuth.js`(`backend/src/app.js`에 이미 TODO로 존재) — `rfid_events`/`door_events`를 실제로 채워 넣는 통로. 다음 단계에서 서버→게이트웨이 정책 전달(다운로드)과 함께 설계한다.

## 다음 단계 로드맵

| 단계 | 내용 | 비고 |
|---|---|---|
| A | 게이트웨이 브리지 인입 API + `middlewares/bridgeAuth.js` | rfid_events/door_events를 실제로 채우는 통로. 서버→게이트웨이 정책 전달도 이때 같이 설계 |
| B | 인원(personnel) 등록/조회/RFID 매칭 화면 | 레거시의 "미등록 RFID 매칭" 2단계 흐름 참고 |
| C | 상태 판정 엔진 + 대시보드 확장 | 보관중/부재/이상/미등록/타내무반, `personnel_status_events` 기록 로직 |
| D | 개폐 정책 관리 화면 | 기본 정책 템플릿, 편제/내무반 스코프별 실시간 설정, 즉각 실행(≤30분), 상태 확인 화면 |
| E | 이벤트 로그 조회 화면 | raw + `personnel_status_events` 통합 조회/필터 |
| F | 보존/아카이빙 배치 + 파티셔닝 | 데이터 실제로 쌓이기 시작하면 |
