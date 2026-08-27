import { request } from './client';

function listPolicies() {
  return request('/api/door-policies');
}

function listActiveTempPolicyGroups() {
  return request('/api/door-policies/temp-groups');
}

function createPolicy(name) {
  return request('/api/door-policies', { method: 'POST', body: { name } });
}

function updatePolicyContent(policyId, weekSlots) {
  return request(`/api/door-policies/${policyId}`, { method: 'PUT', body: { week_slots: weekSlots } });
}

function renamePolicy(policyId, name) {
  return request(`/api/door-policies/${policyId}`, { method: 'PUT', body: { name } });
}

function deletePolicy(policyId) {
  return request(`/api/door-policies/${policyId}`, { method: 'DELETE' });
}

function addMember(policyId, scopeType, scopeCode) {
  return request(`/api/door-policies/${policyId}/members`, {
    method: 'POST',
    body: { scope_type: scopeType, scope_code: scopeCode },
  });
}

function removeMember(scopeType, scopeCode) {
  return request(`/api/door-policies/members/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}`, {
    method: 'DELETE',
  });
}

function getEffectivePolicy(roomCode) {
  return request(`/api/door-policies/effective?room_code=${encodeURIComponent(roomCode)}`);
}

function getTempPolicy(scopeType, scopeCode) {
  const query = new URLSearchParams({ scope_type: scopeType, scope_code: scopeCode }).toString();
  return request(`/api/door-policies/temp?${query}`);
}

function saveTempPolicy(scopeType, scopeCode, weekSlots) {
  return request(`/api/door-policies/temp/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}`, {
    method: 'PUT',
    body: { week_slots: weekSlots },
  });
}

function cancelTempPolicy(scopeType, scopeCode) {
  return request(`/api/door-policies/temp/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeCode)}`, {
    method: 'DELETE',
  });
}

export {
  listPolicies,
  listActiveTempPolicyGroups,
  createPolicy,
  updatePolicyContent,
  renamePolicy,
  deletePolicy,
  addMember,
  removeMember,
  getEffectivePolicy,
  getTempPolicy,
  saveTempPolicy,
  cancelTempPolicy,
};
