const pool = require('../config/db');

async function findBaseSummaries({ onlineMinutes }) {
  const [rows] = await pool.execute(
    `SELECT
       b.base_code,
       b.base_name,
       COUNT(DISTINCT bld.building_code) AS building_count,
       COUNT(DISTINCT gw.gateway_id) AS gateway_count,
       COUNT(DISTINCT CASE WHEN gw.last_seen_at >= NOW() - INTERVAL :onlineMinutes MINUTE THEN gw.gateway_id END) AS online_gateway_count,
       (
         SELECT COUNT(*)
         FROM rfid_events re
         JOIN gateways g2 ON g2.gateway_id = re.gateway_id
         JOIN rooms r2 ON r2.room_code = g2.room_code
         JOIN buildings bl2 ON bl2.building_code = r2.building_code
         WHERE bl2.base_code = b.base_code
           AND re.occurred_at >= NOW() - INTERVAL 24 HOUR
       ) AS event_count_24h
     FROM bases b
     LEFT JOIN buildings bld ON bld.base_code = b.base_code
     LEFT JOIN rooms rm ON rm.building_code = bld.building_code
     LEFT JOIN gateways gw ON gw.room_code = rm.room_code
     GROUP BY b.base_code, b.base_name
     ORDER BY b.base_code`,
    { onlineMinutes }
  );
  return rows;
}

async function findBuildingSummaries({ baseCode, onlineMinutes }) {
  const [rows] = await pool.execute(
    `SELECT
       bl.building_code,
       bl.base_code,
       bl.building_name,
       COUNT(DISTINCT rm.room_code) AS room_count,
       COUNT(DISTINCT gw.gateway_id) AS gateway_count,
       COUNT(DISTINCT CASE WHEN gw.last_seen_at >= NOW() - INTERVAL :onlineMinutes MINUTE THEN gw.gateway_id END) AS online_gateway_count,
       (
         SELECT COUNT(*)
         FROM rfid_events re
         JOIN gateways g2 ON g2.gateway_id = re.gateway_id
         JOIN rooms r2 ON r2.room_code = g2.room_code
         WHERE r2.building_code = bl.building_code
           AND re.occurred_at >= NOW() - INTERVAL 24 HOUR
       ) AS event_count_24h
     FROM buildings bl
     LEFT JOIN rooms rm ON rm.building_code = bl.building_code
     LEFT JOIN gateways gw ON gw.room_code = rm.room_code
     WHERE (:baseCode IS NULL OR bl.base_code = :baseCode)
     GROUP BY bl.building_code, bl.base_code, bl.building_name
     ORDER BY bl.building_code`,
    { baseCode: baseCode || null, onlineMinutes }
  );
  return rows;
}

async function findRoomSummaries({ buildingCode, onlineMinutes }) {
  const [rows] = await pool.execute(
    `SELECT
       r.room_code,
       r.building_code,
       r.room_name,
       COUNT(DISTINCT gw.gateway_id) AS gateway_count,
       COUNT(DISTINCT CASE WHEN gw.last_seen_at >= NOW() - INTERVAL :onlineMinutes MINUTE THEN gw.gateway_id END) AS online_gateway_count,
       (
         SELECT COUNT(*)
         FROM rfid_events re
         JOIN gateways g2 ON g2.gateway_id = re.gateway_id
         WHERE g2.room_code = r.room_code
           AND re.occurred_at >= NOW() - INTERVAL 24 HOUR
       ) AS event_count_24h,
       (
         SELECT de.door_state
         FROM door_events de
         JOIN gateways g3 ON g3.gateway_id = de.gateway_id
         WHERE g3.room_code = r.room_code
         ORDER BY de.occurred_at DESC
         LIMIT 1
       ) AS last_door_state,
       (
         SELECT de.occurred_at
         FROM door_events de
         JOIN gateways g3 ON g3.gateway_id = de.gateway_id
         WHERE g3.room_code = r.room_code
         ORDER BY de.occurred_at DESC
         LIMIT 1
       ) AS last_door_at,
       (
         SELECT gw2.reported_lock_state
         FROM gateways gw2
         WHERE gw2.room_code = r.room_code AND gw2.reported_lock_state IS NOT NULL
         ORDER BY gw2.reported_lock_state_at DESC
         LIMIT 1
       ) AS reported_lock_state
     FROM rooms r
     LEFT JOIN gateways gw ON gw.room_code = r.room_code
     WHERE (:buildingCode IS NULL OR r.building_code = :buildingCode)
     GROUP BY r.room_code, r.building_code, r.room_name
     ORDER BY r.room_code`,
    { buildingCode: buildingCode || null, onlineMinutes }
  );
  return rows;
}

module.exports = { findBaseSummaries, findBuildingSummaries, findRoomSummaries };
