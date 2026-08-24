-- SmartVault 초기 스키마
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 001_init.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)

CREATE TABLE IF NOT EXISTS bases (
  base_code VARCHAR(20) PRIMARY KEY,          -- 예: 1CORPS
  base_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buildings (
  building_code VARCHAR(20) PRIMARY KEY,      -- 예: 1CORPS-B3
  base_code VARCHAR(20) NOT NULL,
  building_name VARCHAR(100),
  FOREIGN KEY (base_code) REFERENCES bases(base_code)
);

CREATE TABLE IF NOT EXISTS rooms (
  room_code VARCHAR(30) PRIMARY KEY,          -- 예: 1CORPS-B3-R204
  building_code VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),
  FOREIGN KEY (building_code) REFERENCES buildings(building_code)
);

CREATE TABLE IF NOT EXISTS gateways (
  gateway_id VARCHAR(40) PRIMARY KEY,         -- 예: 1CORPS-B3-R204-G1 (기존 myName 대체)
  room_code VARCHAR(30) NOT NULL,
  reader_count TINYINT NOT NULL DEFAULT 10,
  firmware_version VARCHAR(30),
  last_seen_at DATETIME,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code)
);

CREATE TABLE IF NOT EXISTS concentrators (
  concentrator_id VARCHAR(40) PRIMARY KEY,    -- 예: 1CORPS-B3-CONC1
  building_code VARCHAR(20) NOT NULL,
  last_seen_at DATETIME,
  FOREIGN KEY (building_code) REFERENCES buildings(building_code)
);

-- 감사 목적: append-only. UPDATE/DELETE 금지, 보존기간 만료분만 별도 아카이빙 배치로 이동.
CREATE TABLE IF NOT EXISTS rfid_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gateway_id VARCHAR(40) NOT NULL,
  reader_index TINYINT NOT NULL,
  rfid_uid VARCHAR(32) NOT NULL,
  event_type ENUM('check_in', 'check_out', 'unknown') NOT NULL DEFAULT 'unknown',
  occurred_at DATETIME NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gateway_id) REFERENCES gateways(gateway_id),
  INDEX idx_gateway_time (gateway_id, occurred_at),
  INDEX idx_rfid_uid (rfid_uid)
);

-- 감사 목적: append-only. 강제 개방/이상 상황 추적용.
CREATE TABLE IF NOT EXISTS door_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gateway_id VARCHAR(40) NOT NULL,
  door_state ENUM('open', 'closed') NOT NULL,
  occurred_at DATETIME NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gateway_id) REFERENCES gateways(gateway_id),
  INDEX idx_gateway_time (gateway_id, occurred_at)
);

CREATE TABLE IF NOT EXISTS users_admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,       -- bcrypt 해시만 저장, 평문 절대 금지
  role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 관리자 조회/설정 변경 이력 (감사로그)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  detail JSON,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users_admin(id)
);
