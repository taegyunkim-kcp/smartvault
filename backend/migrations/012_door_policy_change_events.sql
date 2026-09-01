-- 정책 소속 변경(드래그이동/멤버 추가삭제)과 임시정책 저장/취소의 사유·작업자를 기록하는 이벤트 로그.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 012_door_policy_change_events.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql, 009_door_policies.sql이 먼저 적용되어 있어야 함
--
-- operator_id(로그인 관리자 = 작업자)는 로그인 도입 전까지는 계속 NULL로 둔다.

CREATE TABLE IF NOT EXISTS door_policy_change_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type ENUM('temp_policy_save', 'temp_policy_cancel', 'scope_assign', 'scope_unassign') NOT NULL,
  scope_type ENUM('base', 'building', 'room', 'global') NOT NULL,
  scope_code VARCHAR(30) NOT NULL,
  policy_id BIGINT,
  reason VARCHAR(200) NOT NULL,
  operator_id INT,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES door_policies(id) ON DELETE SET NULL,
  FOREIGN KEY (operator_id) REFERENCES users_admin(id),
  INDEX idx_policy_change_events_scope (scope_type, scope_code, occurred_at)
);
