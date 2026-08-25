const doorPolicyRepository = require('../repositories/doorPolicyRepository');

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
  ];

  let effectiveSchedule = null;
  for (const [scopeType, scopeCode] of scopeCandidates) {
    effectiveSchedule = await doorPolicyRepository.findSchedule(scopeType, scopeCode);
    if (effectiveSchedule) break;
  }

  const activeOverride = await doorPolicyRepository.findActiveOverride(roomCode);

  return { effective_schedule: effectiveSchedule, active_override: activeOverride };
}

module.exports = { ServiceError, getEffectivePolicy };
