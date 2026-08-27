const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT * FROM door_policies ORDER BY is_default DESC, id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM door_policies WHERE id = :id', { id });
  return rows[0] || null;
}

async function findDefault() {
  const [rows] = await pool.execute('SELECT * FROM door_policies WHERE is_default = TRUE LIMIT 1');
  return rows[0] || null;
}

async function findScopesByPolicy(policyId) {
  const [rows] = await pool.execute(
    'SELECT scope_type, scope_code FROM door_policy_scopes WHERE policy_id = :policyId ORDER BY scope_type, scope_code',
    { policyId }
  );
  return rows;
}

async function findScopeAssignment(scopeType, scopeCode) {
  const [rows] = await pool.execute(
    `SELECT dps.*, dp.week_slots, dp.name AS policy_name
     FROM door_policy_scopes dps
     JOIN door_policies dp ON dp.id = dps.policy_id
     WHERE dps.scope_type = :scopeType AND dps.scope_code = :scopeCode`,
    { scopeType, scopeCode }
  );
  return rows[0] || null;
}

async function create({ name, weekSlots }) {
  const [result] = await pool.execute(
    `INSERT INTO door_policies (name, week_slots, is_default) VALUES (:name, :weekSlots, FALSE)`,
    { name, weekSlots: JSON.stringify(weekSlots) }
  );
  return findById(result.insertId);
}

async function updateContent(id, weekSlots) {
  await pool.execute('UPDATE door_policies SET week_slots = :weekSlots WHERE id = :id', {
    id,
    weekSlots: JSON.stringify(weekSlots),
  });
  return findById(id);
}

async function rename(id, name) {
  await pool.execute('UPDATE door_policies SET name = :name WHERE id = :id', { id, name });
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM door_policies WHERE id = :id', { id });
  return result.affectedRows > 0;
}

// scope 하나는 항상 정책 하나에만 속한다 — 이미 다른 정책에 속해 있었으면 그 연결이
// 새 policyId로 바뀐다("옮기기"가 이 upsert 하나로 표현된다).
async function addScope(policyId, scopeType, scopeCode) {
  const existing = await findScopeAssignment(scopeType, scopeCode);
  if (existing) {
    await pool.execute(
      'UPDATE door_policy_scopes SET policy_id = :policyId WHERE scope_type = :scopeType AND scope_code = :scopeCode',
      { policyId, scopeType, scopeCode }
    );
  } else {
    await pool.execute(
      'INSERT INTO door_policy_scopes (policy_id, scope_type, scope_code) VALUES (:policyId, :scopeType, :scopeCode)',
      { policyId, scopeType, scopeCode }
    );
  }
}

async function removeScope(scopeType, scopeCode) {
  const [result] = await pool.execute(
    'DELETE FROM door_policy_scopes WHERE scope_type = :scopeType AND scope_code = :scopeCode',
    { scopeType, scopeCode }
  );
  return result.affectedRows > 0;
}

async function countScopes(policyId) {
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM door_policy_scopes WHERE policy_id = :policyId',
    { policyId }
  );
  return count;
}

module.exports = {
  findAll,
  findById,
  findDefault,
  findScopesByPolicy,
  findScopeAssignment,
  create,
  updateContent,
  rename,
  remove,
  addScope,
  removeScope,
  countScopes,
};
