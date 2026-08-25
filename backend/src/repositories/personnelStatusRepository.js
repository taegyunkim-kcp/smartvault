const pool = require('../config/db');

async function findMatchedPersonnelWithLatestEvent() {
  const [rows] = await pool.execute(
    `SELECT
       p.service_number,
       p.name,
       p.room_code AS home_room_code,
       bl.building_code,
       b.base_code,
       p.rfid_uid,
       re.event_type AS latest_event_type,
       re.occurred_at AS latest_event_at,
       g.room_code AS detected_room_code
     FROM personnel p
     JOIN rooms r ON r.room_code = p.room_code
     JOIN buildings bl ON bl.building_code = r.building_code
     JOIN bases b ON b.base_code = bl.base_code
     LEFT JOIN rfid_events re ON re.rfid_uid = p.rfid_uid
       AND re.occurred_at = (
         SELECT MAX(re2.occurred_at) FROM rfid_events re2 WHERE re2.rfid_uid = p.rfid_uid
       )
     LEFT JOIN gateways g ON g.gateway_id = re.gateway_id
     WHERE p.rfid_uid IS NOT NULL
     GROUP BY p.service_number, p.name, p.room_code, bl.building_code, b.base_code, p.rfid_uid, re.event_type, re.occurred_at, g.room_code
     ORDER BY p.service_number`
  );
  return rows;
}

async function findLatestStatusEventForPerson(serviceNumber) {
  const [rows] = await pool.execute(
    `SELECT * FROM personnel_status_events
     WHERE service_number = :serviceNumber
     ORDER BY occurred_at DESC
     LIMIT 1`,
    { serviceNumber }
  );
  return rows[0] || null;
}

async function findLatestStatusEventForUid(rfidUid) {
  const [rows] = await pool.execute(
    `SELECT * FROM personnel_status_events
     WHERE rfid_uid = :rfidUid AND service_number IS NULL
     ORDER BY occurred_at DESC
     LIMIT 1`,
    { rfidUid }
  );
  return rows[0] || null;
}

async function insertStatusEvent({ statusType, serviceNumber, rfidUid, roomCode, detail }) {
  await pool.execute(
    `INSERT INTO personnel_status_events (status_type, service_number, rfid_uid, room_code, detail)
     VALUES (:statusType, :serviceNumber, :rfidUid, :roomCode, :detail)`,
    {
      statusType,
      serviceNumber: serviceNumber || null,
      rfidUid: rfidUid || null,
      roomCode: roomCode || null,
      detail: detail ? JSON.stringify(detail) : null,
    }
  );
}

async function findRecentStatusEvents(limit) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const [rows] = await pool.execute(
    `SELECT * FROM personnel_status_events ORDER BY occurred_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}

module.exports = {
  findMatchedPersonnelWithLatestEvent,
  findLatestStatusEventForPerson,
  findLatestStatusEventForUid,
  insertStatusEvent,
  findRecentStatusEvents,
};
