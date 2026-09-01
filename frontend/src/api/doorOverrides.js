import { request } from './client';

function listOverrides(roomCode) {
  return request(`/api/door-overrides?room_code=${encodeURIComponent(roomCode)}`);
}

function listActiveOverrides() {
  return request('/api/door-overrides/active');
}

function createOverride(roomCode, doorCommand, durationMinutes, { applicant, approver, reason } = {}) {
  return request('/api/door-overrides', {
    method: 'POST',
    body: {
      room_code: roomCode,
      door_command: doorCommand,
      duration_minutes: durationMinutes,
      applicant,
      approver,
      reason,
    },
  });
}

function cancelOverride(id) {
  return request(`/api/door-overrides/${id}`, { method: 'DELETE' });
}

export { listOverrides, listActiveOverrides, createOverride, cancelOverride };
