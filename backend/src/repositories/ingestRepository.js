const pool = require('../config/db');

async function findExistingGatewayIds(gatewayIds) {
  if (gatewayIds.length === 0) return [];

  const placeholders = gatewayIds.map((_, i) => `:id${i}`).join(', ');
  const params = {};
  gatewayIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const [rows] = await pool.execute(
    `SELECT gateway_id FROM gateways WHERE gateway_id IN (${placeholders})`,
    params
  );
  return rows.map((row) => row.gateway_id);
}

async function insertRfidEvent({ gatewayId, readerIndex, rfidUid, eventType, occurredAt }) {
  await pool.execute(
    `INSERT INTO rfid_events (gateway_id, reader_index, rfid_uid, event_type, occurred_at)
     VALUES (:gatewayId, :readerIndex, :rfidUid, :eventType, :occurredAt)`,
    {
      gatewayId,
      readerIndex,
      rfidUid,
      eventType: eventType || 'unknown',
      occurredAt,
    }
  );
}

async function insertDoorEvent({ gatewayId, doorState, occurredAt }) {
  await pool.execute(
    `INSERT INTO door_events (gateway_id, door_state, occurred_at)
     VALUES (:gatewayId, :doorState, :occurredAt)`,
    { gatewayId, doorState, occurredAt }
  );
}

async function touchLastSeen(gatewayIds) {
  if (gatewayIds.length === 0) return;

  const placeholders = gatewayIds.map((_, i) => `:id${i}`).join(', ');
  const params = {};
  gatewayIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  await pool.execute(
    `UPDATE gateways SET last_seen_at = NOW() WHERE gateway_id IN (${placeholders})`,
    params
  );
}

module.exports = { findExistingGatewayIds, insertRfidEvent, insertDoorEvent, touchLastSeen };
