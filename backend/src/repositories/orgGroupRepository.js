const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM org_groups ORDER BY org_code');
  return rows;
}

async function findById(orgCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM org_groups WHERE org_code = :orgCode',
    { orgCode }
  );
  return rows[0] || null;
}

async function create({ orgCode, parentOrgCode, orgName }) {
  await pool.execute(
    'INSERT INTO org_groups (org_code, parent_org_code, org_name) VALUES (:orgCode, :parentOrgCode, :orgName)',
    { orgCode, parentOrgCode: parentOrgCode || null, orgName }
  );
  return findById(orgCode);
}

async function update(orgCode, { orgName }) {
  if (orgName === undefined) {
    return findById(orgCode);
  }
  await pool.execute(
    'UPDATE org_groups SET org_name = :orgName WHERE org_code = :orgCode',
    { orgCode, orgName }
  );
  return findById(orgCode);
}

async function remove(orgCode) {
  const [result] = await pool.execute(
    'DELETE FROM org_groups WHERE org_code = :orgCode',
    { orgCode }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
