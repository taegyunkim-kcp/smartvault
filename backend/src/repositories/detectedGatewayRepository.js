const pool = require('../config/db');

async function upsertSeen(gatewayId) {
  await pool.execute(
    `INSERT INTO detected_gateways (gateway_id, first_seen_at, last_seen_at)
     VALUES (:gatewayId, NOW(), NOW())
     ON DUPLICATE KEY UPDATE last_seen_at = NOW()`,
    { gatewayId }
  );
}

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM detected_gateways ORDER BY last_seen_at DESC');
  return rows;
}

async function remove(gatewayId) {
  await pool.execute('DELETE FROM detected_gateways WHERE gateway_id = :gatewayId', { gatewayId });
}

module.exports = { upsertSeen, findAll, remove };
