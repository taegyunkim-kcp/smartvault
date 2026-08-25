const dashboardRepository = require('../repositories/dashboardRepository');
const doorPolicyService = require('./doorPolicyService');
const { isLocked } = require('./doorScheduleUtil');

const ONLINE_THRESHOLD_MINUTES = 5;

async function getScheduledLockState(roomCode) {
  try {
    const policy = await doorPolicyService.getEffectivePolicy(roomCode);
    if (!policy.effective_schedule) return null; // 적용되는 정책이 없음 — "미설정"과 구분해서 표시
    return isLocked(policy) ? 'locked' : 'unlocked';
  } catch {
    return null;
  }
}

async function getBaseSummaries() {
  return dashboardRepository.findBaseSummaries({ onlineMinutes: ONLINE_THRESHOLD_MINUTES });
}

async function getBuildingSummaries(baseCode) {
  return dashboardRepository.findBuildingSummaries({
    baseCode,
    onlineMinutes: ONLINE_THRESHOLD_MINUTES,
  });
}

async function getRoomSummaries(buildingCode) {
  const rooms = await dashboardRepository.findRoomSummaries({
    buildingCode,
    onlineMinutes: ONLINE_THRESHOLD_MINUTES,
  });

  return Promise.all(
    rooms.map(async (room) => ({
      ...room,
      scheduled_lock_state: await getScheduledLockState(room.room_code),
    }))
  );
}

module.exports = { getBaseSummaries, getBuildingSummaries, getRoomSummaries };
