import { request } from './client';

function listBuildings(baseCode) {
  const query = baseCode ? `?base_code=${encodeURIComponent(baseCode)}` : '';
  return request(`/api/buildings${query}`);
}

function getBuilding(buildingCode) {
  return request(`/api/buildings/${encodeURIComponent(buildingCode)}`);
}

function createBuilding(data) {
  return request('/api/buildings', { method: 'POST', body: data });
}

function updateBuilding(buildingCode, data) {
  return request(`/api/buildings/${encodeURIComponent(buildingCode)}`, { method: 'PUT', body: data });
}

function deleteBuilding(buildingCode) {
  return request(`/api/buildings/${encodeURIComponent(buildingCode)}`, { method: 'DELETE' });
}

export { listBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding };
