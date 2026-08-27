const personnelStatusRepository = require('../repositories/personnelStatusRepository');
const rfidTagRepository = require('../repositories/rfidTagRepository');
const personnelRepository = require('../repositories/personnelRepository');
const eventRepository = require('../repositories/eventRepository');
const doorPolicyService = require('./doorPolicyService');
const dashboardService = require('./dashboardService');
const { isLocked } = require('./doorScheduleUtil');

const UID_HISTORY_LIMIT = 20;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

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

async function buildReason(event, person) {
  const homeRoomCode = person ? person.room_code : null;

  switch (event.status_type) {
    case 'anomaly': {
      let policyNote = '판정 시점 이후 정책 정보를 확인할 수 없습니다.';
      if (homeRoomCode) {
        try {
          const policy = await doorPolicyService.getEffectivePolicy(homeRoomCode);
          policyNote =
            policy.effective_schedule && isLocked(policy)
              ? '지금도 해당 내무반은 개폐 정책상 잠김(통제) 시간대입니다.'
              : '지금은 정책상 개방 시간대로 바뀌어 있습니다 (판정 당시엔 잠김 시간대였습니다).';
        } catch {
          // 정책 조회 실패 시 기본 안내 문구 유지
        }
      }
      return `소속 내무반(${homeRoomCode || '-'})에서 체크인 기록이 없는 상태로, 판정 시점에 해당 내무반이 개폐 정책상 잠김(통제) 시간대였기 때문에 '이상'으로 분류되었습니다. ${policyNote}`;
    }
    case 'wrong_room':
      return `소속 내무반(${homeRoomCode || '-'})이 아닌 다른 내무반(${event.room_code || '-'})에서 RFID가 감지되어 '타내무반'으로 분류되었습니다.`;
    case 'absent':
      return `소속 내무반(${homeRoomCode || '-'})에서 체크인 기록이 없지만, 판정 시점에 정책상 개방 시간대였기 때문에 '이상'이 아닌 '부재'로 분류되었습니다.`;
    case 'unregistered_uid':
      return `등록된 인원과 매칭되지 않은 RFID 태그(${event.rfid_uid || '-'})가 내무반(${event.room_code || '-'})에서 감지되었습니다.`;
    default:
      return '';
  }
}

async function getStatusEventDetail(id) {
  const event = await personnelStatusRepository.findStatusEventById(id);
  if (!event) {
    throw new ServiceError('이벤트를 찾을 수 없습니다.', 404);
  }

  const person = event.service_number ? await personnelRepository.findById(event.service_number) : null;

  const uidHistory = event.rfid_uid
    ? await eventRepository.findRfidEvents({ rfidUid: event.rfid_uid, limit: UID_HISTORY_LIMIT, offset: 0 })
    : [];

  const roomCodeForStatus = event.room_code || (person && person.room_code) || null;
  const roomSummaries = roomCodeForStatus ? await dashboardService.getRoomSummaries() : [];
  const roomStatus = roomCodeForStatus
    ? roomSummaries.find((r) => r.room_code === roomCodeForStatus) || null
    : null;

  const reason = await buildReason(event, person);

  return { event, person, uid_history: uidHistory, room_status: roomStatus, reason };
}

async function acknowledgeStatusEvent(id) {
  const event = await personnelStatusRepository.findStatusEventById(id);
  if (!event) {
    throw new ServiceError('이벤트를 찾을 수 없습니다.', 404);
  }
  return personnelStatusRepository.acknowledgeStatusEvent(id);
}

module.exports = { ServiceError, getStatusOverview, getStatusEventDetail, acknowledgeStatusEvent };
