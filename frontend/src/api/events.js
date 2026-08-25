import { request } from './client';

function toQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function listRfidEvents(filters) {
  return request(`/api/events/rfid${toQuery(filters)}`);
}

function listDoorEvents(filters) {
  return request(`/api/events/door${toQuery(filters)}`);
}

function listStatusEvents(filters) {
  return request(`/api/events/status${toQuery(filters)}`);
}

export { listRfidEvents, listDoorEvents, listStatusEvents };
