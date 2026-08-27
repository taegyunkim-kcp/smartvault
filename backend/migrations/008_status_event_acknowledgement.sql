-- 이상 이벤트(personnel_status_events) 확인 처리 컬럼 추가
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 008_status_event_acknowledgement.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 002_personnel_and_door_control.sql이 먼저 적용되어 있어야 함
--
-- 관리자가 모니터링 대시보드의 "최근 이상 이벤트"에서 내역을 확인(팝업으로 분석)한 뒤
-- 체크하면 이 행이 채워지고, 이후 대시보드 목록에는 더 이상 노출되지 않는다.
-- (같은 대상이 다시 상태가 바뀌면 새 행이 insert되어 다시 노출된다 — personnelStatusService의
-- recordIfChanged가 상태 타입이 바뀔 때만 새로 기록하는 동작을 그대로 활용)

ALTER TABLE personnel_status_events
  ADD COLUMN acknowledged_at DATETIME NULL,
  ADD COLUMN acknowledged_by INT NULL,
  ADD FOREIGN KEY (acknowledged_by) REFERENCES users_admin(id);
