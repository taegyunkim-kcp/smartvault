const pool = require('../config/db');

async function find(scopeType, scopeCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM door_schedules WHERE scope_type = :scopeType AND scope_code = :scopeCode',
    { scopeType, scopeCode }
  );
  return rows[0] || null;
}

async function upsert(scopeType, scopeCode, { weekSlots, basedOnTemplate }) {
  const existing = await find(scopeType, scopeCode);
  const params = {
    scopeType,
    scopeCode,
    weekSlots: JSON.stringify(weekSlots),
    basedOnTemplate: basedOnTemplate || null,
  };

  if (existing) {
    await pool.execute(
      `UPDATE door_schedules SET week_slots = :weekSlots, based_on_template = :basedOnTemplate
       WHERE scope_type = :scopeType AND scope_code = :scopeCode`,
      params
    );
  } else {
    await pool.execute(
      `INSERT INTO door_schedules (scope_type, scope_code, week_slots, based_on_template)
       VALUES (:scopeType, :scopeCode, :weekSlots, :basedOnTemplate)`,
      params
    );
  }

  return find(scopeType, scopeCode);
}

async function remove(scopeType, scopeCode) {
  const [result] = await pool.execute(
    'DELETE FROM door_schedules WHERE scope_type = :scopeType AND scope_code = :scopeCode',
    { scopeType, scopeCode }
  );
  return result.affectedRows > 0;
}

module.exports = { find, upsert, remove };
