-- 미등록 게이트웨이 탐지 로그 (RFID 미등록 태그와 같은 패턴)
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 005_detected_gateways.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql이 먼저 적용되어 있어야 함
--
-- gateways에 없는 gateway_id로 수집 이벤트가 들어오면(ingestService) 원본 이벤트는
-- 지금처럼 저장하지 않고(rfid_events/door_events가 gateways를 FK로 참조하기 때문에
-- 저장할 수 없음) 여기에만 "탐지됨" 기록을 남긴다. 관리자가 내무반을 지정해 매칭하면
-- gateways에 정식 등록되고 이 행은 삭제된다.

CREATE TABLE IF NOT EXISTS detected_gateways (
  gateway_id VARCHAR(40) PRIMARY KEY,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
