import { request } from './client';

function getEffectivePolicy(roomCode) {
  return request(`/api/door-schedules/effective?room_code=${encodeURIComponent(roomCode)}`);
}

function getSchedule(scopeType, scopeCode) {
  const query = new URLSearchParams({ scope_type: scopeType, scope_code: scopeCode }).toString();
  return request(`/api/door-schedules?${query}`);
}

function saveSchedule(scopeType, scopeCode, weekSlots, basedOnTemplate) {
  return request(`/api/door-schedules/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}`, {
    method: 'PUT',
    body: { week_slots: weekSlots, based_on_template: basedOnTemplate },
  });
}

function resetFromTemplate(scopeType, scopeCode, templateCode) {
  return request(
    `/api/door-schedules/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}/reset`,
    { method: 'POST', body: { template_code: templateCode } }
  );
}

function deleteSchedule(scopeType, scopeCode) {
  return request(`/api/door-schedules/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}`, {
    method: 'DELETE',
  });
}

export { getEffectivePolicy, getSchedule, saveSchedule, resetFromTemplate, deleteSchedule };
