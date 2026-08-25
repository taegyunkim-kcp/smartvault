const pool = require('../config/db');

async function findRfidEvents({ roomCode, gatewayId, from, to, limit, offset }) {
  const conditions = [];
  const params = {};

  if (roomCode) {
    conditions.push('g.room_code = :roomCode');
    params.roomCode = roomCode;
  }
  if (gatewayId) {
    conditions.push('re.gateway_id = :gatewayId');
    params.gatewayId = gatewayId;
  }
  if (from) {
    conditions.push('re.occurred_at >= :from');
    params.from = from;
  }
  if (to) {
    conditions.push('re.occurred_at <= :to');
    params.to = to;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT re.id, re.gateway_id, g.room_code, re.reader_index, re.rfid_uid, re.event_type, re.occurred_at
     FROM rfid_events re
     JOIN gateways g ON g.gateway_id = re.gateway_id
     ${where}
     ORDER BY re.occurred_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return rows;
}

async function findDoorEvents({ roomCode, gatewayId, from, to, limit, offset }) {
  const conditions = [];
  const params = {};

  if (roomCode) {
    conditions.push('g.room_code = :roomCode');
    params.roomCode = roomCode;
  }
  if (gatewayId) {
    conditions.push('de.gateway_id = :gatewayId');
    params.gatewayId = gatewayId;
  }
  if (from) {
    conditions.push('de.occurred_at >= :from');
    params.from = from;
  }
  if (to) {
    conditions.push('de.occurred_at <= :to');
    params.to = to;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT de.id, de.gateway_id, g.room_code, de.door_state, de.occurred_at
     FROM door_events de
     JOIN gateways g ON g.gateway_id = de.gateway_id
     ${where}
     ORDER BY de.occurred_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return rows;
}

async function findStatusEvents({ statusType, roomCode, from, to, limit, offset }) {
  const conditions = [];
  const params = {};

  if (statusType) {
    conditions.push('status_type = :statusType');
    params.statusType = statusType;
  }
  if (roomCode) {
    conditions.push('room_code = :roomCode');
    params.roomCode = roomCode;
  }
  if (from) {
    conditions.push('occurred_at >= :from');
    params.from = from;
  }
  if (to) {
    conditions.push('occurred_at <= :to');
    params.to = to;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT * FROM personnel_status_events
     ${where}
     ORDER BY occurred_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return rows;
}

module.exports = { findRfidEvents, findDoorEvents, findStatusEvents };
