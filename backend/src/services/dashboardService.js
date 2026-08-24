const dashboardRepository = require('../repositories/dashboardRepository');

const ONLINE_THRESHOLD_MINUTES = 5;

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
  return dashboardRepository.findRoomSummaries({
    buildingCode,
    onlineMinutes: ONLINE_THRESHOLD_MINUTES,
  });
}

module.exports = { getBaseSummaries, getBuildingSummaries, getRoomSummaries };
