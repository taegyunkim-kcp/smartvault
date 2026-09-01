const pool = require('../config/db');

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM door_overrides WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ roomCode, durationMinutes, doorCommand, applicant, approver, reason }) {
  const [result] = await pool.execute(
    `INSERT INTO door_overrides (room_code, door_command, applicant, approver, reason, starts_at, expires_at)
     VALUES (:roomCode, :doorCommand, :applicant, :approver, :reason, NOW(), NOW() + INTERVAL :durationMinutes MINUTE)`,
    { roomCode, durationMinutes, doorCommand, applicant, approver, reason }
  );
  return findById(result.insertId);
}

// 내무반 타일 클릭으로 만드는 "즉각 실행"은 지금 슬롯(30분)이 끝나는 시각까지만 유지된다.
// 만료 시각을 DB의 NOW() 기준 슬롯 경계로 직접 계산해서, 같은 슬롯 안에서 여러 방을 연달아
// 클릭해도(JS 쪽에서 분 단위로 반올림한 duration을 각자 넘기던 예전 방식과 달리) 전부 같은
// expires_at을 갖게 한다.
async function createUntilSlotEnd({ roomCode, doorCommand, applicant, approver, reason }) {
  const [result] = await pool.execute(
    `INSERT INTO door_overrides (room_code, door_command, applicant, approver, reason, starts_at, expires_at)
     VALUES (
       :roomCode, :doorCommand, :applicant, :approver, :reason, NOW(),
       DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00'), INTERVAL (30 - MINUTE(NOW()) MOD 30) MINUTE)
     )`,
    { roomCode, doorCommand, applicant, approver, reason }
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

module.exports = { findById, create, createUntilSlotEnd, findByRoom, findAllActive, cancel };
