import { request } from './client';

function listBases() {
  return request('/api/bases');
}

function getBase(baseCode) {
  return request(`/api/bases/${encodeURIComponent(baseCode)}`);
}

function createBase(data) {
  return request('/api/bases', { method: 'POST', body: data });
}

function updateBase(baseCode, data) {
  return request(`/api/bases/${encodeURIComponent(baseCode)}`, { method: 'PUT', body: data });
}

function deleteBase(baseCode) {
  return request(`/api/bases/${encodeURIComponent(baseCode)}`, { method: 'DELETE' });
}

export { listBases, getBase, createBase, updateBase, deleteBase };
