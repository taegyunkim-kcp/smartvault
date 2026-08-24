const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM bases ORDER BY base_code');
  return rows;
}

async function findById(baseCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM bases WHERE base_code = :baseCode',
    { baseCode }
  );
  return rows[0] || null;
}

async function create({ baseCode, baseName }) {
  await pool.execute(
    'INSERT INTO bases (base_code, base_name) VALUES (:baseCode, :baseName)',
    { baseCode, baseName }
  );
  return findById(baseCode);
}

async function update(baseCode, { baseName }) {
  if (baseName === undefined) {
    return findById(baseCode);
  }
  await pool.execute(
    'UPDATE bases SET base_name = :baseName WHERE base_code = :baseCode',
    { baseCode, baseName }
  );
  return findById(baseCode);
}

async function remove(baseCode) {
  const [result] = await pool.execute(
    'DELETE FROM bases WHERE base_code = :baseCode',
    { baseCode }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
