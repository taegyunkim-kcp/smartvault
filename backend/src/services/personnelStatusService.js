const personnelStatusRepository = require('../repositories/personnelStatusRepository');
const rfidTagRepository = require('../repositories/rfidTagRepository');
const doorPolicyService = require('./doorPolicyService');
const { isLocked } = require('./doorScheduleUtil');

function classifyPresence(row) {
  if (row.latest_event_type === 'check_in') {
    return row.detected_room_code === row.home_room_code ? 'present' : 'wrong_room';
  }
  return 'absent_candidate';
}

async function getEffectivePolicyCached(roomCode, cache) {
  if (!cache.has(roomCode)) {
    try {
      cache.set(roomCode, await doorPolicyService.getEffectivePolicy(roomCode));
    } catch {
      cache.set(roomCode, null);
    }
  }
  return cache.get(roomCode);
}

async function recordIfChanged(key, statusType, event) {
  const last =
    key.serviceNumber !== undefined
      ? await personnelStatusRepository.findLatestStatusEventForPerson(key.serviceNumber)
      : await personnelStatusRepository.findLatestStatusEventForUid(key.rfidUid);

  if (!last || last.status_type !== statusType) {
    await personnelStatusRepository.insertStatusEvent({ statusType, ...event });
  }
}

async function getStatusOverview() {
  const rows = await personnelStatusRepository.findMatchedPersonnelWithLatestEvent();
  const policyCache = new Map();

  const summary = {
    total_registered: rows.length,
    present: 0,
    absent: 0,
    anomaly: 0,
    wrong_room: 0,
    unregistered: 0,
  };
  const personnel = [];
  const byBase = {};
  const byBuilding = {};

  function newBucket() {
    return { registered: 0, present: 0, absent: 0, anomaly: 0, wrong_room: 0, unregistered: 0 };
  }

  for (const row of rows) {
    let status = classifyPresence(row);

    if (status === 'absent_candidate') {
      const policy = await getEffectivePolicyCached(row.home_room_code, policyCache);
      status = policy && isLocked(policy) ? 'anomaly' : 'absent';
    }

    summary[status] += 1;

    if (!byBase[row.base_code]) byBase[row.base_code] = newBucket();
    byBase[row.base_code].registered += 1;
    byBase[row.base_code][status] += 1;

    if (!byBuilding[row.building_code]) byBuilding[row.building_code] = newBucket();
    byBuilding[row.building_code].registered += 1;
    byBuilding[row.building_code][status] += 1;

    personnel.push({
      service_number: row.service_number,
      name: row.name,
      room_code: row.home_room_code,
      building_code: row.building_code,
      base_code: row.base_code,
      rfid_uid: row.rfid_uid,
      status,
      detected_room_code: row.detected_room_code,
      latest_event_at: row.latest_event_at,
    });

    if (status !== 'present') {
      await recordIfChanged({ serviceNumber: row.service_number }, status, {
        serviceNumber: row.service_number,
        rfidUid: row.rfid_uid,
        roomCode: row.detected_room_code || row.home_room_code,
      });
    }
  }

  const unregisteredTags = await rfidTagRepository.findUnmatchedTags();
  summary.unregistered = unregisteredTags.length;

  for (const tag of unregisteredTags) {
    if (!byBase[tag.base_code]) byBase[tag.base_code] = newBucket();
    byBase[tag.base_code].unregistered += 1;

    if (!byBuilding[tag.building_code]) byBuilding[tag.building_code] = newBucket();
    byBuilding[tag.building_code].unregistered += 1;

    await recordIfChanged({ rfidUid: tag.rfid_uid }, 'unregistered_uid', {
      rfidUid: tag.rfid_uid,
      roomCode: tag.room_code,
    });
  }

  const recentEvents = await personnelStatusRepository.findRecentStatusEvents(20);

  return {
    summary,
    personnel,
    by_base: byBase,
    by_building: byBuilding,
    unregistered_tags: unregisteredTags,
    recent_events: recentEvents,
  };
}

module.exports = { getStatusOverview };
