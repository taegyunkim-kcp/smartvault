const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM door_schedule_templates ORDER BY template_code');
  return rows;
}

async function findById(templateCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM door_schedule_templates WHERE template_code = :templateCode',
    { templateCode }
  );
  return rows[0] || null;
}

async function create({ templateCode, templateName, weekSlots }) {
  await pool.execute(
    `INSERT INTO door_schedule_templates (template_code, template_name, week_slots)
     VALUES (:templateCode, :templateName, :weekSlots)`,
    { templateCode, templateName, weekSlots: JSON.stringify(weekSlots) }
  );
  return findById(templateCode);
}

async function update(templateCode, { templateName, weekSlots }) {
  const assignments = [];
  const params = { templateCode };

  if (templateName !== undefined) {
    assignments.push('template_name = :templateName');
    params.templateName = templateName;
  }
  if (weekSlots !== undefined) {
    assignments.push('week_slots = :weekSlots');
    params.weekSlots = JSON.stringify(weekSlots);
  }

  if (assignments.length === 0) {
    return findById(templateCode);
  }

  await pool.execute(
    `UPDATE door_schedule_templates SET ${assignments.join(', ')} WHERE template_code = :templateCode`,
    params
  );
  return findById(templateCode);
}

async function remove(templateCode) {
  const [result] = await pool.execute(
    'DELETE FROM door_schedule_templates WHERE template_code = :templateCode',
    { templateCode }
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
