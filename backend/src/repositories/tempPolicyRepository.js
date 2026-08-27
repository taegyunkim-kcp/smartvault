const pool = require('../config/db');

// 유효기간(valid_from~valid_until) 안인 것만 "활성"으로 취급한다 — 만료된 행은 그냥
// 무시되고, 다음 upsert 때 자연스럽게 덮어써진다(배치 삭제 불필요).
async function find(scopeType, scopeCode) {
  const [rows] = await pool.execute(
    `SELECT * FROM door_temp_policies
     WHERE scope_type = :scopeType AND scope_code = :scopeCode
       AND valid_from <= NOW() AND valid_until > NOW()`,
    { scopeType, scopeCode }
  );
  return rows[0] || null;
}

async function findRaw(scopeType, scopeCode) {
  const [rows] = await pool.execute(
    `SELECT * FROM door_temp_policies WHERE scope_type = :scopeType AND scope_code = :scopeCode`,
    { scopeType, scopeCode }
  );
  return rows[0] || null;
}

async function upsert(scopeType, scopeCode, { weekSlots, validFrom, validUntil }) {
  const existing = await findRaw(scopeType, scopeCode);
  const params = {
    scopeType,
    scopeCode,
    weekSlots: JSON.stringify(weekSlots),
    validFrom,
    validUntil,
  };

  if (existing) {
    await pool.execute(
      `UPDATE door_temp_policies
       SET week_slots = :weekSlots, valid_from = :validFrom, valid_until = :validUntil
       WHERE scope_type = :scopeType AND scope_code = :scopeCode`,
      params
    );
  } else {
    await pool.execute(
      `INSERT INTO door_temp_policies (scope_type, scope_code, week_slots, valid_from, valid_until)
       VALUES (:scopeType, :scopeCode, :weekSlots, :validFrom, :validUntil)`,
      params
    );
  }

  return findRaw(scopeType, scopeCode);
}

async function remove(scopeType, scopeCode) {
  const [result] = await pool.execute(
    'DELETE FROM door_temp_policies WHERE scope_type = :scopeType AND scope_code = :scopeCode',
    { scopeType, scopeCode }
  );
  return result.affectedRows > 0;
}

module.exports = { find, findRaw, upsert, remove };
