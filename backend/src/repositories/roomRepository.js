const pool = require('../config/db');

async function findAll({ buildingCode } = {}) {
  if (buildingCode) {
    const [rows] = await pool.execute(
      'SELECT * FROM rooms WHERE building_code = :buildingCode ORDER BY room_code',
      { buildingCode }
    );
    return rows;
  }
  const [rows] = await pool.execute('SELECT * FROM rooms ORDER BY room_code');
  return rows;
}

async function findById(roomCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM rooms WHERE room_code = :roomCode',
    { roomCode }
  );
  return rows[0] || null;
}

async function create({ roomCode, buildingCode, roomName }) {
  await pool.execute(
    `INSERT INTO rooms (room_code, building_code, room_name)
     VALUES (:roomCode, :buildingCode, :roomName)`,
    { roomCode, buildingCode, roomName: roomName === undefined ? null : roomName }
  );
  return findById(roomCode);
}

async function update(roomCode, { roomName }) {
  if (roomName === undefined) {
    return findById(roomCode);
  }
  await pool.execute(
    'UPDATE rooms SET room_name = :roomName WHERE room_code = :roomCode',
    { roomCode, roomName }
  );
  return findById(roomCode);
}

async function remove(roomCode) {
  const [result] = await pool.execute(
    'DELETE FROM rooms WHERE room_code = :roomCode',
    { roomCode }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
