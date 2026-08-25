const pool = require('../config/db');

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM door_overrides WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ roomCode, durationMinutes }) {
  const [result] = await pool.execute(
    `INSERT INTO door_overrides (room_code, door_command, starts_at, expires_at)
     VALUES (:roomCode, 'open', NOW(), NOW() + INTERVAL :durationMinutes MINUTE)`,
    { roomCode, durationMinutes }
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

async function cancel(id) {
  await pool.execute('UPDATE door_overrides SET expires_at = NOW() WHERE id = :id', { id });
  return findById(id);
}

module.exports = { findById, create, findByRoom, cancel };
