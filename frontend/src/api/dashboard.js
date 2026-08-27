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

function getPersonnelStatus() {
  return request('/api/dashboard/personnel-status');
}

function getStatusEventDetail(id) {
  return request(`/api/dashboard/personnel-status/events/${encodeURIComponent(id)}`);
}

function acknowledgeStatusEvent(id) {
  return request(`/api/dashboard/personnel-status/events/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
  });
}

export {
  getBaseSummaries,
  getBuildingSummaries,
  getRoomSummaries,
  getPersonnelStatus,
  getStatusEventDetail,
  acknowledgeStatusEvent,
};
