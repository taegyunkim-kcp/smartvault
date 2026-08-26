const doorPolicyRepository = require('../repositories/doorPolicyRepository');
const roomRepository = require('../repositories/roomRepository');
const { isLocked } = require('./doorScheduleUtil');

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function getEffectivePolicy(roomCode) {
  if (!roomCode) {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }

  const hierarchy = await doorPolicyRepository.findRoomHierarchy(roomCode);
  if (!hierarchy) {
    throw new ServiceError('방을 찾을 수 없습니다.', 404);
  }

  const scopeCandidates = [
    ['room', hierarchy.room_code],
    ['building', hierarchy.building_code],
    ['base', hierarchy.base_code],
    ['global', 'ALL'],
  ];

  let effectiveSchedule = null;
  for (const [scopeType, scopeCode] of scopeCandidates) {
    effectiveSchedule = await doorPolicyRepository.findSchedule(scopeType, scopeCode);
    if (effectiveSchedule) break;
  }

  const activeOverride = await doorPolicyRepository.findActiveOverride(roomCode);

  return { effective_schedule: effectiveSchedule, active_override: activeOverride };
}

// 보관함 개폐 관리/제어 화면 상단의 "현재 정책 적용 현황"용 — 전체 내무반을 실제 적용받는
// 정책(스코프) 기준으로 묶어서 반환한다. global 폴백 덕분에 모든 방이 최소 하나의 그룹에 속한다.
async function getPolicyGroups() {
  const rooms = await roomRepository.findAll();
  const groups = new Map();

  for (const room of rooms) {
    const { effective_schedule: schedule } = await getEffectivePolicy(room.room_code);
    const key = `${schedule.scope_type}:${schedule.scope_code}`;

    if (!groups.has(key)) {
      groups.set(key, {
        scope_type: schedule.scope_type,
        scope_code: schedule.scope_code,
        week_slots: schedule.week_slots,
        currently_locked: isLocked({ effective_schedule: schedule, active_override: null }),
        rooms: [],
      });
    }
    groups.get(key).rooms.push({ room_code: room.room_code, room_name: room.room_name });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.scope_type === 'global') return -1;
    if (b.scope_type === 'global') return 1;
    return `${a.scope_type}:${a.scope_code}`.localeCompare(`${b.scope_type}:${b.scope_code}`);
  });
}

module.exports = { ServiceError, getEffectivePolicy, getPolicyGroups };
