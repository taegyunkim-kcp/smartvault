// 모니터링 화면을 실제로 눌러보며 테스트할 수 있도록 대량 데모 데이터를 생성한다.
// 재실행해도 안전하도록(멱등) 매번 이전 데모 데이터(2CORPS/3CORPS, 26-2000xxx, DEMO-UID-*)를
// 먼저 지우고 새로 생성한다. 사용자의 기존 데이터(1base/1CORPS 등)는 건드리지 않는다.
// 실행: npm run seed:demo (backend/ 에서)
// 원복(재생성 없이 데모 데이터만 삭제): npm run seed:demo:clean

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', `.env.${process.env.NODE_ENV || 'development'}`) });

const pool = require('../src/config/db');
const { DAY_KEYS } = require('../src/services/doorScheduleUtil');

const DEMO_BASES = [
  { base_code: '2CORPS', base_name: '2군단' },
  { base_code: '3CORPS', base_name: '3군단' },
];

const DEMO_BUILDINGS = [
  { building_code: '2CORPS-B1', base_code: '2CORPS', building_name: '2군단 1생활관', room_count: 4 },
  { building_code: '2CORPS-B2', base_code: '2CORPS', building_name: '2군단 2생활관', room_count: 3 },
  { building_code: '3CORPS-B1', base_code: '3CORPS', building_name: '3군단 1생활관', room_count: 3 },
];

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const GIVEN_SYLLABLES = ['민', '서', '예', '지', '수', '현', '준', '우', '진', '연', '하', '윤', '성', '태', '영', '은', '재', '호', '경', '아'];

const LOCKED_SCHEDULE_ROOMS = ['2CORPS-B1-R101', '3CORPS-B1-R101'];

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function pick(arr) {
  return arr[randomInt(arr.length)];
}

function randomName() {
  return `${pick(SURNAMES)}${pick(GIVEN_SYLLABLES)}${pick(GIVEN_SYLLABLES)}`;
}

function randomPhone() {
  const a = String(randomInt(10000)).padStart(4, '0');
  const b = String(randomInt(10000)).padStart(4, '0');
  return `010-${a}-${b}`;
}

function buildRooms() {
  const rooms = [];
  for (const building of DEMO_BUILDINGS) {
    for (let i = 1; i <= building.room_count; i += 1) {
      const room_code = `${building.building_code}-R10${i}`;
      rooms.push({
        room_code,
        building_code: building.building_code,
        room_name: `${i}호 내무반`,
      });
    }
  }
  return rooms;
}

// 지금 이 순간이 반드시 "잠김" 슬롯에 포함되도록 하면서, 낮 시간대(12:00~14:00 UTC 기준 슬롯)는
// 임시로 열어두는 정책처럼 보이게 구성한다 — 스케줄 화면에서도 자연스러운 패턴으로 보이도록.
function buildAlwaysCurrentlyLockedWeekSlots() {
  const now = new Date();
  const nowDay = DAY_KEYS[now.getUTCDay()];
  const nowSlotIndex = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30);

  const weekSlots = {};
  for (const day of DAY_KEYS) {
    const slots = new Array(48).fill(true);
    for (let i = 24; i < 28; i += 1) slots[i] = false; // 12:00~14:00 임시 개방 창
    weekSlots[day] = slots;
  }
  weekSlots[nowDay][nowSlotIndex] = true; // 실행 시각 기준으로 항상 잠김이 되도록 강제

  return weekSlots;
}

async function clearPreviousDemoData(conn) {
  const demoBaseCodes = DEMO_BASES.map((b) => b.base_code);

  const [demoGatewayRows] = await conn.query(
    `SELECT g.gateway_id FROM gateways g
     JOIN rooms r ON r.room_code = g.room_code
     JOIN buildings bl ON bl.building_code = r.building_code
     WHERE bl.base_code IN (?)`,
    [demoBaseCodes]
  );
  const demoGatewayIds = demoGatewayRows.map((r) => r.gateway_id);

  await conn.query(`DELETE FROM personnel_status_events WHERE service_number LIKE '26-2000%' OR rfid_uid LIKE 'DEMO-UID-%'`);
  if (demoGatewayIds.length > 0) {
    await conn.query(`DELETE FROM rfid_events WHERE gateway_id IN (?)`, [demoGatewayIds]);
    await conn.query(`DELETE FROM door_events WHERE gateway_id IN (?)`, [demoGatewayIds]);
  }
  await conn.query(`DELETE FROM rfid_events WHERE rfid_uid LIKE 'DEMO-UID-%'`);

  // 이름으로 데모 정책을 찾는다(멤버십 기준이면, 관리자가 UI에서 다른 방을 추가했거나
  // 드래그로 멤버를 다 빼버린 경우를 놓친다 — 이름은 그런 변경과 무관하게 안정적인 식별자).
  // scope_code 필터 없이 그 정책에 딸린 모든 door_policy_scopes를 먼저 지워야 FK 위반이 안 난다.
  const demoPolicyNames = LOCKED_SCHEDULE_ROOMS.map((roomCode) => `${roomCode} 데모 정책`);
  const [demoPolicyRows] = await conn.query(`SELECT id FROM door_policies WHERE name IN (?)`, [demoPolicyNames]);
  if (demoPolicyRows.length > 0) {
    const demoPolicyIds = demoPolicyRows.map((r) => r.id);
    await conn.query(`DELETE FROM door_policy_scopes WHERE policy_id IN (?)`, [demoPolicyIds]);
    await conn.query(`DELETE FROM door_policies WHERE id IN (?)`, [demoPolicyIds]);
  }
  // 관리자가 화면에서 이 방을 드래그로 다른 정책(예: 기본 정책)에 명시적으로 옮겨놨을 수도
  // 있으므로, scope_code 자체 기준으로도 한 번 더 지운다 — 그래야 재생성 시 UNIQUE(scope_type,
  // scope_code) 충돌 없이 이 방을 다시 데모 정책에 연결할 수 있다.
  await conn.query(`DELETE FROM door_policy_scopes WHERE scope_type = 'room' AND scope_code IN (?)`, [
    LOCKED_SCHEDULE_ROOMS,
  ]);
  await conn.query(`DELETE FROM door_temp_policies WHERE scope_type = 'room' AND scope_code IN (?)`, [
    LOCKED_SCHEDULE_ROOMS,
  ]);

  await conn.query(`DELETE FROM personnel WHERE service_number LIKE '26-2000%'`);
  if (demoGatewayIds.length > 0) {
    await conn.query(`DELETE FROM gateways WHERE gateway_id IN (?)`, [demoGatewayIds]);
  }
  await conn.query(
    `DELETE o FROM door_overrides o
     JOIN rooms r ON r.room_code = o.room_code
     JOIN buildings bl ON bl.building_code = r.building_code
     WHERE bl.base_code IN (?)`,
    [demoBaseCodes]
  );
  await conn.query(
    `DELETE r FROM rooms r
     JOIN buildings bl ON bl.building_code = r.building_code
     WHERE bl.base_code IN (?)`,
    [demoBaseCodes]
  );
  await conn.query(`DELETE FROM buildings WHERE base_code IN (?)`, [demoBaseCodes]);
  await conn.query(`DELETE FROM bases WHERE base_code IN (?)`, [demoBaseCodes]);
}

async function clean() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await clearPreviousDemoData(conn);
    await conn.commit();
    console.log('데모 데이터 삭제 완료 (재생성 없이 원복).');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await clearPreviousDemoData(conn);

    for (const base of DEMO_BASES) {
      await conn.query(`INSERT INTO bases (base_code, base_name) VALUES (?, ?)`, [base.base_code, base.base_name]);
    }
    for (const building of DEMO_BUILDINGS) {
      await conn.query(`INSERT INTO buildings (building_code, base_code, building_name) VALUES (?, ?, ?)`, [
        building.building_code,
        building.base_code,
        building.building_name,
      ]);
    }

    const rooms = buildRooms();
    for (const room of rooms) {
      await conn.query(`INSERT INTO rooms (room_code, building_code, room_name) VALUES (?, ?, ?)`, [
        room.room_code,
        room.building_code,
        room.room_name,
      ]);
    }

    const gateways = rooms.map((room) => ({ gateway_id: `${room.room_code}-G1`, room_code: room.room_code }));
    for (const gateway of gateways) {
      const doorState = Math.random() < 0.5 ? 'open' : 'closed';
      const reportedLockState = Math.random() < 0.5 ? 'locked' : 'unlocked';
      await conn.query(
        `INSERT INTO gateways (gateway_id, room_code, reader_count, firmware_version, last_seen_at, reported_lock_state, reported_lock_state_at)
         VALUES (?, ?, 10, 'v1.0.0-demo', NOW(), ?, NOW())`,
        [gateway.gateway_id, gateway.room_code, reportedLockState]
      );
      await conn.query(`INSERT INTO door_events (gateway_id, door_state, occurred_at) VALUES (?, ?, NOW())`, [
        gateway.gateway_id,
        doorState,
      ]);
    }

    const personnel = [];
    for (let i = 1; i <= 100; i += 1) {
      const service_number = `26-${String(2000000 + i).padStart(7, '0')}`;
      const room = rooms[(i - 1) % rooms.length];
      const rfid_uid = i <= 90 ? `DEMO-UID-${String(i).padStart(4, '0')}` : null;
      personnel.push({
        service_number,
        name: randomName(),
        phone_number: randomPhone(),
        room_code: room.room_code,
        rfid_uid,
      });
    }
    for (const person of personnel) {
      await conn.query(
        `INSERT INTO personnel (service_number, name, phone_number, room_code, rfid_uid) VALUES (?, ?, ?, ?, ?)`,
        [person.service_number, person.name, person.phone_number, person.room_code, person.rfid_uid]
      );
    }

    for (const person of personnel) {
      if (!person.rfid_uid) continue;

      const roll = Math.random();
      const homeGatewayId = `${person.room_code}-G1`;

      if (roll < 0.55) {
        // 보관중: 자기 방 게이트웨이에서 check_in
        await conn.query(
          `INSERT INTO rfid_events (gateway_id, reader_index, rfid_uid, event_type, occurred_at)
           VALUES (?, ?, ?, 'check_in', NOW())`,
          [homeGatewayId, randomInt(10), person.rfid_uid]
        );
      } else if (roll < 0.85) {
        // 부재: 이벤트 없음 (스케줄이 잠김 상태면 서비스 로직이 '이상'으로 자동 승격)
      } else {
        // 타내무반: 다른 방 게이트웨이에서 check_in
        const otherRooms = rooms.filter((r) => r.room_code !== person.room_code);
        const otherGatewayId = `${pick(otherRooms).room_code}-G1`;
        await conn.query(
          `INSERT INTO rfid_events (gateway_id, reader_index, rfid_uid, event_type, occurred_at)
           VALUES (?, ?, ?, 'check_in', NOW())`,
          [otherGatewayId, randomInt(10), person.rfid_uid]
        );
      }
    }

    // 어느 인원에도 매칭되지 않은 RFID 10개 → "미등록 태그" 탐지 시나리오
    for (let i = 91; i <= 100; i += 1) {
      const rfid_uid = `DEMO-UID-${String(i).padStart(4, '0')}`;
      const gatewayId = `${pick(gateways).room_code}-G1`;
      await conn.query(
        `INSERT INTO rfid_events (gateway_id, reader_index, rfid_uid, event_type, occurred_at)
         VALUES (?, ?, ?, 'check_in', NOW())`,
        [gatewayId, randomInt(10), rfid_uid]
      );
    }

    const weekSlots = buildAlwaysCurrentlyLockedWeekSlots();
    for (const roomCode of LOCKED_SCHEDULE_ROOMS) {
      const [result] = await conn.query(`INSERT INTO door_policies (name, week_slots) VALUES (?, ?)`, [
        `${roomCode} 데모 정책`,
        JSON.stringify(weekSlots),
      ]);
      await conn.query(
        `INSERT INTO door_policy_scopes (policy_id, scope_type, scope_code) VALUES (?, 'room', ?)`,
        [result.insertId, roomCode]
      );
    }

    await conn.commit();
    console.log(`데모 데이터 생성 완료: 기지 ${DEMO_BASES.length}개, 건물 ${DEMO_BUILDINGS.length}개, 내무반 ${rooms.length}개, 게이트웨이 ${gateways.length}개, 인원 ${personnel.length}명 (매칭 90 / 미매칭 10), RFID 100개 (매칭 90 / 미등록 10).`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const run = process.argv.includes('--clean') ? clean : seed;

run()
  .then(() => pool.end())
  .catch((err) => {
    console.error('데모 데이터 스크립트 실패:', err);
    return pool.end().finally(() => process.exit(1));
  });
