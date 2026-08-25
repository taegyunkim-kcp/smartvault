import { request } from './client';

function listPersonnel({ roomCode, matched } = {}) {
  const params = new URLSearchParams();
  if (roomCode) params.set('room_code', roomCode);
  if (matched !== undefined) params.set('matched', String(matched));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/personnel${query}`);
}

function getPersonnel(serviceNumber) {
  return request(`/api/personnel/${encodeURIComponent(serviceNumber)}`);
}

function createPersonnel(data) {
  return request('/api/personnel', { method: 'POST', body: data });
}

function updatePersonnel(serviceNumber, data) {
  return request(`/api/personnel/${encodeURIComponent(serviceNumber)}`, { method: 'PUT', body: data });
}

function deletePersonnel(serviceNumber) {
  return request(`/api/personnel/${encodeURIComponent(serviceNumber)}`, { method: 'DELETE' });
}

function matchPersonnel(serviceNumber, rfidUid) {
  return request(`/api/personnel/${encodeURIComponent(serviceNumber)}/match`, {
    method: 'POST',
    body: { rfid_uid: rfidUid },
  });
}

function unmatchPersonnel(serviceNumber) {
  return request(`/api/personnel/${encodeURIComponent(serviceNumber)}/match`, { method: 'DELETE' });
}

export {
  listPersonnel,
  getPersonnel,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  matchPersonnel,
  unmatchPersonnel,
};
