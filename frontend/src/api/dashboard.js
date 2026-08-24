import { request } from './client';

function getBaseSummaries() {
  return request('/api/dashboard/bases');
}

function getBuildingSummaries(baseCode) {
  const query = baseCode ? `?base_code=${encodeURIComponent(baseCode)}` : '';
  return request(`/api/dashboard/buildings${query}`);
}

function getRoomSummaries(buildingCode) {
  const query = buildingCode ? `?building_code=${encodeURIComponent(buildingCode)}` : '';
  return request(`/api/dashboard/rooms${query}`);
}

export { getBaseSummaries, getBuildingSummaries, getRoomSummaries };
