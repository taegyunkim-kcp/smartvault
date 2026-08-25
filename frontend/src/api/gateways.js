import { request } from './client';

function listGateways(roomCode) {
  const query = roomCode ? `?room_code=${encodeURIComponent(roomCode)}` : '';
  return request(`/api/gateways${query}`);
}

function getGateway(gatewayId) {
  return request(`/api/gateways/${encodeURIComponent(gatewayId)}`);
}

function createGateway(data) {
  return request('/api/gateways', { method: 'POST', body: data });
}

function updateGateway(gatewayId, data) {
  return request(`/api/gateways/${encodeURIComponent(gatewayId)}`, { method: 'PUT', body: data });
}

function deleteGateway(gatewayId) {
  return request(`/api/gateways/${encodeURIComponent(gatewayId)}`, { method: 'DELETE' });
}

function listDetectedGateways() {
  return request('/api/gateways/detected');
}

function matchDetectedGateway(gatewayId, data) {
  return request(`/api/gateways/detected/${encodeURIComponent(gatewayId)}/match`, {
    method: 'POST',
    body: data,
  });
}

export {
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
  listDetectedGateways,
  matchDetectedGateway,
};
