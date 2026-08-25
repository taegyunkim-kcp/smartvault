import { request } from './client';

function listUnmatchedTags() {
  return request('/api/rfid-tags/unmatched');
}

export { listUnmatchedTags };
