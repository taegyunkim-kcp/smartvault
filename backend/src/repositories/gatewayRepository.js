const pool = require('../config/db');

async function findAll({ roomCode } = {}) {
  if (roomCode) {
    const [rows] = await pool.execute(
      'SELECT * FROM gateways WHERE room_code = :roomCode ORDER BY gateway_id',
      { roomCode }
    );
    return rows;
  }
  const [rows] = await pool.execute('SELECT * FROM gateways ORDER BY gateway_id');
  return rows;
}

async function findById(gatewayId) {
  const [rows] = await pool.execute(
    'SELECT * FROM gateways WHERE gateway_id = :gatewayId',
    { gatewayId }
  );
  return rows[0] || null;
}

async function create({ gatewayId, roomCode, readerCount, firmwareVersion, lastSeenAt }) {
  await pool.execute(
    `INSERT INTO gateways (gateway_id, room_code, reader_count, firmware_version, last_seen_at)
     VALUES (:gatewayId, :roomCode, :readerCount, :firmwareVersion, :lastSeenAt)`,
    {
      gatewayId,
      roomCode,
      readerCount: readerCount === undefined ? 10 : readerCount,
      firmwareVersion: firmwareVersion === undefined ? null : firmwareVersion,
      lastSeenAt: lastSeenAt === undefined ? null : lastSeenAt,
    }
  );
  return findById(gatewayId);
}

const UPDATABLE_COLUMNS = {
  roomCode: 'room_code',
  readerCount: 'reader_count',
  firmwareVersion: 'firmware_version',
  lastSeenAt: 'last_seen_at',
};

async function update(gatewayId, fields) {
  const assignments = [];
  const params = { gatewayId };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[key] !== undefined) {
      assignments.push(`${column} = :${key}`);
      params[key] = fields[key];
    }
  }

  if (assignments.length === 0) {
    return findById(gatewayId);
  }

  await pool.execute(
    `UPDATE gateways SET ${assignments.join(', ')} WHERE gateway_id = :gatewayId`,
    params
  );
  return findById(gatewayId);
}

async function remove(gatewayId) {
  const [result] = await pool.execute(
    'DELETE FROM gateways WHERE gateway_id = :gatewayId',
    { gatewayId }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
