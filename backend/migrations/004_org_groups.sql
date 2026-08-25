-- 조직 구성 확장성: 대대/사단 등 상위 조직 라벨 계층
-- 실행: mysql -h 127.0.0.1 -P 3307 -u smartvault_dev -p smartvault_dev < 004_org_groups.sql
-- (운영 적용 시 포트/유저를 .env.production 값으로 교체)
-- 001_init.sql이 먼저 적용되어 있어야 함 (bases 참조)
--
-- 이 상위 계층은 순수 표시/라벨용이다 — 개폐스케줄/인원집계/대시보드 로직은 여전히
-- base/building/room(중대/소대/내무반) 3단계 고정으로 동작한다. 상위 계층까지 실제
-- 기능(개폐스케줄 등)이 적용돼야 하는 배치가 생기면 그때 스키마를 다시 검토한다.

CREATE TABLE IF NOT EXISTS org_groups (
  org_code VARCHAR(30) PRIMARY KEY,           -- 예: 1DIV, 1DIV-R1 (자기참조로 임의 깊이 표현)
  parent_org_code VARCHAR(30) NULL,           -- NULL이면 최상위 조직
  org_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_org_code) REFERENCES org_groups(org_code)
);

ALTER TABLE bases
  ADD COLUMN parent_org_code VARCHAR(30) NULL,
  ADD FOREIGN KEY (parent_org_code) REFERENCES org_groups(org_code);
