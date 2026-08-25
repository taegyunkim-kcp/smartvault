-- SmartVault 인원/RFID 매핑 + 개폐 정책 + 판정 이벤트 스키마
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 002_personnel_and_door_control.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql이 먼저 적용되어 있어야 함 (bases/buildings/rooms/gateways/users_admin 참조)

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
