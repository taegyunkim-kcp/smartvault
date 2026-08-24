import { request } from './client';

function listRooms(buildingCode) {
  const query = buildingCode ? `?building_code=${encodeURIComponent(buildingCode)}` : '';
  return request(`/api/rooms${query}`);
}

function getRoom(roomCode) {
  return request(`/api/rooms/${encodeURIComponent(roomCode)}`);
}

function createRoom(data) {
  return request('/api/rooms', { method: 'POST', body: data });
}

function updateRoom(roomCode, data) {
  return request(`/api/rooms/${encodeURIComponent(roomCode)}`, { method: 'PUT', body: data });
}

function deleteRoom(roomCode) {
  return request(`/api/rooms/${encodeURIComponent(roomCode)}`, { method: 'DELETE' });
}

export { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
