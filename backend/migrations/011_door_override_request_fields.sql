-- 즉각 실행(door_overrides)에 신청자/승인자/사유를 이벤트로 기록한다.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 011_door_override_request_fields.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 002_personnel_and_door_control.sql이 먼저 적용되어 있어야 함
--
-- requested_by(로그인 관리자 = 작업자)는 002에서 이미 만들어졌고 로그인 도입 전까지는 계속 NULL로 둔다.

ALTER TABLE door_overrides
  ADD COLUMN applicant VARCHAR(50) NOT NULL DEFAULT '' AFTER door_command,
  ADD COLUMN approver VARCHAR(50) NOT NULL DEFAULT '' AFTER applicant,
  ADD COLUMN reason VARCHAR(200) NOT NULL DEFAULT '' AFTER approver;
