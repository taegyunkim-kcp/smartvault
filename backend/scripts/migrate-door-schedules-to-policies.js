// door_schedules(스코프 1개당 행 1개)의 기존 데이터를 door_policies + door_policy_scopes로
// 1회 이관한다. 009_door_policies.sql 적용 직후, 010_drop_door_schedules.sql 적용 전에 실행.
//
// 실행: cd backend && node scripts/migrate-door-schedules-to-policies.js
//
// 변환 규칙:
//   - scope_type='global'(scope_code='ALL') 행 → is_default=TRUE 정책 "기본 정책"
//   - 그 외 각 행 → 새 정책("{scope_type} {scope_code} 정책") + 그 정책을 가리키는
//     door_policy_scopes 행 1개. 내용이 같은 행끼리 자동 병합하지 않음(안전한 1:1 변환) —
//     합치고 싶으면 새 UI의 드래그이동으로 나중에 직접 정리.
//
// 재실행해도 안전하도록(멱등) 이미 이관된 흔적(door_policies에 데이터가 있음)이 있으면
// 아무것도 하지 않고 종료한다.

const path = require('path');
const dotenv = require('dotenv');

const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const pool = require('../src/config/db');

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반' };

async function main() {
  const [[{ count: existingPolicyCount }]] = await pool.query('SELECT COUNT(*) AS count FROM door_policies');
  if (existingPolicyCount > 0) {
    console.log(`door_policies에 이미 ${existingPolicyCount}건이 있습니다 — 이관을 건너뜁니다(멱등).`);
    await pool.end();
    return;
  }

  const [rows] = await pool.query('SELECT * FROM door_schedules ORDER BY id');
  console.log(`door_schedules ${rows.length}건을 이관합니다...`);

  let migrated = 0;
  for (const row of rows) {
    if (row.scope_type === 'global') {
      await pool.execute(
        `INSERT INTO door_policies (name, week_slots, is_default, based_on_template)
         VALUES ('기본 정책', :weekSlots, TRUE, :basedOnTemplate)`,
        { weekSlots: JSON.stringify(row.week_slots), basedOnTemplate: row.based_on_template || null }
      );
      migrated += 1;
      continue;
    }

    const name = `${SCOPE_TYPE_LABELS[row.scope_type] || row.scope_type} ${row.scope_code} 정책`;
    const [result] = await pool.execute(
      `INSERT INTO door_policies (name, week_slots, is_default, based_on_template)
       VALUES (:name, :weekSlots, FALSE, :basedOnTemplate)`,
      { name, weekSlots: JSON.stringify(row.week_slots), basedOnTemplate: row.based_on_template || null }
    );
    await pool.execute(
      `INSERT INTO door_policy_scopes (policy_id, scope_type, scope_code)
       VALUES (:policyId, :scopeType, :scopeCode)`,
      { policyId: result.insertId, scopeType: row.scope_type, scopeCode: row.scope_code }
    );
    migrated += 1;
  }

  const [[{ count: defaultCount }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM door_policies WHERE is_default = TRUE'
  );
  if (defaultCount === 0) {
    console.log('기본(global) 정책이 없어서 "전부 열림 허용" 기본값으로 새로 만듭니다.');
    const emptyWeek = {};
    for (const day of ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
      emptyWeek[day] = new Array(48).fill(false);
    }
    await pool.execute(
      `INSERT INTO door_policies (name, week_slots, is_default) VALUES ('기본 정책', :weekSlots, TRUE)`,
      { weekSlots: JSON.stringify(emptyWeek) }
    );
  } else if (defaultCount > 1) {
    console.warn(`경고: is_default 정책이 ${defaultCount}개입니다 — 수동으로 정리해야 합니다.`);
  }

  console.log(`완료: ${migrated}건 이관됨.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
