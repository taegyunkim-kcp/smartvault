import { request } from './client';

function listOrgGroups() {
  return request('/api/org-groups');
}

function getOrgGroup(orgCode) {
  return request(`/api/org-groups/${encodeURIComponent(orgCode)}`);
}

function createOrgGroup(data) {
  return request('/api/org-groups', { method: 'POST', body: data });
}

function updateOrgGroup(orgCode, data) {
  return request(`/api/org-groups/${encodeURIComponent(orgCode)}`, { method: 'PUT', body: data });
}

function deleteOrgGroup(orgCode) {
  return request(`/api/org-groups/${encodeURIComponent(orgCode)}`, { method: 'DELETE' });
}

export { listOrgGroups, getOrgGroup, createOrgGroup, updateOrgGroup, deleteOrgGroup };
