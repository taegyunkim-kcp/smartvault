-- 게이트웨이가 스스로 보고하는 "현재 개폐 설정 상태" 스냅샷
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 003_gateway_reported_lock_state.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql이 먼저 적용되어 있어야 함 (gateways 테이블 참조)

-- 서버가 정책(door_schedules)으로 "지금 잠겨있어야 하는지" 계산한 값과는 별개로,
-- 게이트웨이 자신이 실제로 적용 중이라고 보고하는 값 — last_seen_at과 같은 성격의
-- "최신 스냅샷" 컬럼(이력이 아니라 현재 상태만 필요해서 별도 테이블로 만들지 않음).
ALTER TABLE gateways
  ADD COLUMN reported_lock_state ENUM('locked', 'unlocked') NULL,
  ADD COLUMN reported_lock_state_at DATETIME NULL;
