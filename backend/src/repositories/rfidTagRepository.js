const pool = require('../config/db');

async function findUnmatchedTags() {
  const [rows] = await pool.execute(
    `SELECT re.rfid_uid, re.gateway_id, g.room_code, re.occurred_at AS last_seen_at
     FROM rfid_events re
     JOIN gateways g ON g.gateway_id = re.gateway_id
     WHERE re.rfid_uid NOT IN (
       SELECT rfid_uid FROM personnel WHERE rfid_uid IS NOT NULL
     )
     AND re.occurred_at = (
       SELECT MAX(re2.occurred_at) FROM rfid_events re2 WHERE re2.rfid_uid = re.rfid_uid
     )
     GROUP BY re.rfid_uid, re.gateway_id, g.room_code, re.occurred_at
     ORDER BY last_seen_at DESC`
  );
  return rows;
}

module.exports = { findUnmatchedTags };
