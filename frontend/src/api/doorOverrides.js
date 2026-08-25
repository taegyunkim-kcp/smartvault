import { request } from './client';

function listOverrides(roomCode) {
  return request(`/api/door-overrides?room_code=${encodeURIComponent(roomCode)}`);
}

function createOverride(roomCode, durationMinutes) {
  return request('/api/door-overrides', {
    method: 'POST',
    body: { room_code: roomCode, duration_minutes: durationMinutes },
  });
}

function cancelOverride(id) {
  return request(`/api/door-overrides/${id}`, { method: 'DELETE' });
}

export { listOverrides, createOverride, cancelOverride };
