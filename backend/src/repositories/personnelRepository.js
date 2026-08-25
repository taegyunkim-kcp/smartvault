const pool = require('../config/db');

async function findAll({ roomCode, matched } = {}) {
  const conditions = [];
  const params = {};

  if (roomCode) {
    conditions.push('room_code = :roomCode');
    params.roomCode = roomCode;
  }
  if (matched === true) {
    conditions.push('rfid_uid IS NOT NULL');
  } else if (matched === false) {
    conditions.push('rfid_uid IS NULL');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT * FROM personnel ${where} ORDER BY service_number`,
    params
  );
  return rows;
}

async function findById(serviceNumber) {
  const [rows] = await pool.execute(
    'SELECT * FROM personnel WHERE service_number = :serviceNumber',
    { serviceNumber }
  );
  return rows[0] || null;
}

async function create({ serviceNumber, name, phoneNumber, roomCode }) {
  await pool.execute(
    `INSERT INTO personnel (service_number, name, phone_number, room_code)
     VALUES (:serviceNumber, :name, :phoneNumber, :roomCode)`,
    { serviceNumber, name, phoneNumber: phoneNumber === undefined ? null : phoneNumber, roomCode }
  );
  return findById(serviceNumber);
}

const UPDATABLE_COLUMNS = { name: 'name', phoneNumber: 'phone_number', roomCode: 'room_code' };

async function update(serviceNumber, fields) {
  const assignments = [];
  const params = { serviceNumber };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[key] !== undefined) {
      assignments.push(`${column} = :${key}`);
      params[key] = fields[key];
    }
  }

  if (assignments.length === 0) {
    return findById(serviceNumber);
  }

  await pool.execute(
    `UPDATE personnel SET ${assignments.join(', ')} WHERE service_number = :serviceNumber`,
    params
  );
  return findById(serviceNumber);
}

async function remove(serviceNumber) {
  const [result] = await pool.execute(
    'DELETE FROM personnel WHERE service_number = :serviceNumber',
    { serviceNumber }
  );
  return result.affectedRows > 0;
}

async function setRfidUid(serviceNumber, rfidUid) {
  await pool.execute(
    'UPDATE personnel SET rfid_uid = :rfidUid WHERE service_number = :serviceNumber',
    { serviceNumber, rfidUid }
  );
  return findById(serviceNumber);
}

async function clearRfidUid(serviceNumber) {
  await pool.execute(
    'UPDATE personnel SET rfid_uid = NULL WHERE service_number = :serviceNumber',
    { serviceNumber }
  );
  return findById(serviceNumber);
}

module.exports = { findAll, findById, create, update, remove, setRfidUid, clearRfidUid };
