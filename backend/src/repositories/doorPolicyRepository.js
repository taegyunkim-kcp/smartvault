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

async function findActiveOverride(roomCode) {
  // expires_at > NOW() (엄격 부등호)여야 한다. 취소(door_overrides.cancel)는
  // expires_at을 그 순간의 NOW()로 당기는데, MySQL DATETIME은 초 단위라
  // 취소 직후 같은 초 안에 재조회하면 BETWEEN(양끝 포함)은 여전히 true가
  // 되어 방금 취소한 오버라이드가 "활성"으로 보이는 경합이 생긴다.
  const [rows] = await pool.execute(
    `SELECT * FROM door_overrides
     WHERE room_code = :roomCode AND starts_at <= NOW() AND expires_at > NOW()
     ORDER BY starts_at DESC
     LIMIT 1`,
    { roomCode }
  );
  return rows[0] || null;
}

module.exports = { findRoomHierarchy, findActiveOverride };
