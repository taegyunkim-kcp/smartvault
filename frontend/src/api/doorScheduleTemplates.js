import { request } from './client';

function listTemplates() {
  return request('/api/door-schedule-templates');
}

function getTemplate(templateCode) {
  return request(`/api/door-schedule-templates/${encodeURIComponent(templateCode)}`);
}

function createTemplate(data) {
  return request('/api/door-schedule-templates', { method: 'POST', body: data });
}

function updateTemplate(templateCode, data) {
  return request(`/api/door-schedule-templates/${encodeURIComponent(templateCode)}`, {
    method: 'PUT',
    body: data,
  });
}

function deleteTemplate(templateCode) {
  return request(`/api/door-schedule-templates/${encodeURIComponent(templateCode)}`, { method: 'DELETE' });
}

export { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate };
