-- door_schedules 제거 — door_policies/door_policy_scopes로 완전히 대체됨.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 010_drop_door_schedules.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
--
-- 반드시 009_door_policies.sql 적용 + backend/scripts/migrate-door-schedules-to-policies.js
-- 실행 + 화면에서 기존 정책이 그대로 보이는지 확인한 뒤에만 적용하세요. 되돌릴 수 없습니다.

DROP TABLE door_schedules;
