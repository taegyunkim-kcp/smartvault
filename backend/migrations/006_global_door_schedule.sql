-- 전사 공통 기본 정책(global 스코프) 추가
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 006_global_door_schedule.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql, 002_personnel_and_door_control.sql이 먼저 적용되어 있어야 함
--
-- 군부대의 스마트폰 사용 허가 정책은 조직 계층과 무관하게 원래 하나(전사 공통)다.
-- 기존 room→building→base 상속 체인 아래에 global(scope_code='ALL') 최종 폴백을 추가해서,
-- 개별 정책이 없는 내무반은 항상 이 기본 정책을 따르게 한다(더 이상 "정책 없음" 상태가 없음).

ALTER TABLE door_schedules MODIFY COLUMN scope_type ENUM('base', 'building', 'room', 'global') NOT NULL;

-- 이미 있는 'default' 템플릿이 있으면 그 내용으로 기본 정책을 시드한다.
INSERT INTO door_schedules (scope_type, scope_code, week_slots, based_on_template)
SELECT 'global', 'ALL', week_slots, template_code
FROM door_schedule_templates
WHERE template_code = 'default'
LIMIT 1;

-- 'default' 템플릿이 없는 환경(예: 새로 세팅한 PC)을 위한 안전한 폴백 — 전부 열림 허용.
-- uq_door_schedule_scope(scope_type, scope_code) 유니크 제약 덕분에 위에서 이미 시드됐으면 조용히 무시된다.
INSERT IGNORE INTO door_schedules (scope_type, scope_code, week_slots)
VALUES (
  'global', 'ALL',
  JSON_OBJECT(
    'sun', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'mon', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'tue', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'wed', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'thu', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'fri', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
    'sat', JSON_ARRAY(false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false)
  )
);
