const pool = require('../config/db');

async function findRoomHierarchy(roomCode) {
  const [rows] = await pool.execute(
    `SELECT r.room_code, r.building_code, b.base_code
     FROM rooms r
     JOIN buildings b ON b.building_code = r.building_code
     WHERE r.room_code = :roomCode`,
    { roomCode }
  );
  return rows[0] || null;
}

async function findSchedule(scopeType, scopeCode) {
  const [rows] = await pool.execute(
    `SELECT * FROM door_schedules WHERE scope_type = :scopeType AND scope_code = :scopeCode`,
    { scopeType, scopeCode }
  );
  return rows[0] || null;
}

async function findActiveOverride(roomCode) {
  const [rows] = await pool.execute(
    `SELECT * FROM door_overrides
     WHERE room_code = :roomCode AND NOW() BETWEEN starts_at AND expires_at
     ORDER BY starts_at DESC
     LIMIT 1`,
    { roomCode }
  );
  return rows[0] || null;
}

module.exports = { findRoomHierarchy, findSchedule, findActiveOverride };
