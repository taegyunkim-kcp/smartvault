-- 정책 중심(정책→조직 목록) 모델 도입: door_schedules(스코프 1개당 행 1개)를
-- door_policies(이름 있는 정책) + door_policy_scopes(정책에 속한 조직/방 멤버십)로 분리.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 009_door_policies.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 002_personnel_and_door_control.sql, 006_global_door_schedule.sql이 먼저 적용되어 있어야 함
--
-- 적용 순서(중요 — 스키마만 이 파일이 만들고, 기존 door_schedules 데이터 이관은 별도 스크립트가 함):
--   1) 이 파일 적용
--   2) node backend/scripts/migrate-door-schedules-to-policies.js 실행
--   3) 화면에서 기존 정책이 그대로 보이는지 확인
--   4) 010_drop_door_schedules.sql 적용 (이관 완료 후에만)

CREATE TABLE IF NOT EXISTS door_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  week_slots JSON NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  based_on_template VARCHAR(30),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (based_on_template) REFERENCES door_schedule_templates(template_code)
);

-- 한 조직/방(scope)은 항상 정책 하나에만 속한다(uq_policy_scope) — 다른 정책에 새로
-- 추가하면 자동으로 이전 정책에서 빠진 것과 같아진다("옮기기"가 이 upsert 하나로 표현됨).
CREATE TABLE IF NOT EXISTS door_policy_scopes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  policy_id BIGINT NOT NULL,
  scope_type ENUM('base', 'building', 'room') NOT NULL,
  scope_code VARCHAR(30) NOT NULL,
  UNIQUE KEY uq_policy_scope (scope_type, scope_code),
  FOREIGN KEY (policy_id) REFERENCES door_policies(id)
);

-- 이번 주만 유효한 임시 예외 — 이름/멤버십이 없는 별도 개념(정책이 아니라 조직 단위의
-- 1주일짜리 오버라이드). valid_until을 지나면 조회 시 자동으로 무시된다(배치 삭제 불필요).
CREATE TABLE IF NOT EXISTS door_temp_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('base', 'building', 'room', 'global') NOT NULL,
  scope_code VARCHAR(30) NOT NULL,
  week_slots JSON NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_temp_scope (scope_type, scope_code)
);
