const pool = require('../config/db');

async function findAll({ baseCode } = {}) {
  if (baseCode) {
    const [rows] = await pool.execute(
      'SELECT * FROM buildings WHERE base_code = :baseCode ORDER BY building_code',
      { baseCode }
    );
    return rows;
  }
  const [rows] = await pool.execute('SELECT * FROM buildings ORDER BY building_code');
  return rows;
}

async function findById(buildingCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM buildings WHERE building_code = :buildingCode',
    { buildingCode }
  );
  return rows[0] || null;
}

async function create({ buildingCode, baseCode, buildingName }) {
  await pool.execute(
    `INSERT INTO buildings (building_code, base_code, building_name)
     VALUES (:buildingCode, :baseCode, :buildingName)`,
    { buildingCode, baseCode, buildingName: buildingName === undefined ? null : buildingName }
  );
  return findById(buildingCode);
}

async function update(buildingCode, { buildingName }) {
  if (buildingName === undefined) {
    return findById(buildingCode);
  }
  await pool.execute(
    'UPDATE buildings SET building_name = :buildingName WHERE building_code = :buildingCode',
    { buildingCode, buildingName }
  );
  return findById(buildingCode);
}

async function remove(buildingCode) {
  const [result] = await pool.execute(
    'DELETE FROM buildings WHERE building_code = :buildingCode',
    { buildingCode }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
