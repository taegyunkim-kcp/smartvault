const pool = require('../config/db');

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM door_overrides WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ roomCode, durationMinutes, doorCommand }) {
  const [result] = await pool.execute(
    `INSERT INTO door_overrides (room_code, door_command, starts_at, expires_at)
     VALUES (:roomCode, :doorCommand, NOW(), NOW() + INTERVAL :durationMinutes MINUTE)`,
    { roomCode, durationMinutes, doorCommand }
  );
  return findById(result.insertId);
}

async function findByRoom(roomCode, limit) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const [rows] = await pool.execute(
    `SELECT * FROM door_overrides WHERE room_code = :roomCode ORDER BY starts_at DESC LIMIT ${safeLimit}`,
    { roomCode }
  );
  return rows;
}

// 정책 적용 현황의 내무반 타일에 "즉각 적용 활성" 표시를 하기 위한 전체 목록 —
// findActiveOverride(doorPolicyRepository)와 같은 starts_at/expires_at 조건.
async function findAllActive() {
  const [rows] = await pool.execute(
    `SELECT * FROM door_overrides WHERE starts_at <= NOW() AND expires_at > NOW()`
  );
  return rows;
}

async function cancel(id) {
  await pool.execute('UPDATE door_overrides SET expires_at = NOW() WHERE id = :id', { id });
  return findById(id);
}

module.exports = { findById, create, findByRoom, findAllActive, cancel };
