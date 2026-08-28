-- 즉각 전환(door_overrides)과 정책 변경/임시정책 저장·취소를 "관리자 조작 이벤트"로 이벤트
-- 로그/이벤트 처리/모니터링 화면(personnel_status_events 기반 판정 이벤트 파이프라인)에
-- 그대로 노출하기 위해 status_type에 admin_action을 추가한다.
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 013_admin_action_events.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 002_personnel_and_door_control.sql, 008_status_event_acknowledgement.sql, 012_door_policy_change_events.sql이
-- 먼저 적용되어 있어야 함
--
-- door_policy_change_events(012)는 읽기 API가 없어 만들자마자 죽은 테이블이었다 —
-- 정책 변경 사유는 이제 admin_action 이벤트로 이 파이프라인에 통합되므로 제거한다.

ALTER TABLE personnel_status_events
  MODIFY COLUMN status_type ENUM('absent', 'anomaly', 'unregistered_uid', 'wrong_room', 'admin_action') NOT NULL;

DROP TABLE IF EXISTS door_policy_change_events;
