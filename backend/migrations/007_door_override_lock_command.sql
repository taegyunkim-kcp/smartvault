-- 즉각 실행 명령에 "지금 잠금"(lock) 추가 — 지금까지는 "지금 개방"(open)만 가능했다.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 007_door_override_lock_command.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 002_personnel_and_door_control.sql이 먼저 적용되어 있어야 함
--
-- 정책 적용 현황의 내무반 타일을 클릭해 지금 상태(잠김/열림)의 반대로 즉각 전환하는
-- 기능에 쓰인다 — 정책상 잠김인데 예외적으로 열거나(open), 반대로 정책상 열림인데
-- 예외적으로 잠그는(lock) 경우 둘 다 지원해야 한다.

ALTER TABLE door_overrides MODIFY COLUMN door_command ENUM('open', 'lock') NOT NULL DEFAULT 'open';
