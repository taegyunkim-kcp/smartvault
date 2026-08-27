const eventRepository = require('../repositories/eventRepository');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_STATUS_TYPES = ['absent', 'anomaly', 'unregistered_uid', 'wrong_room'];

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function parseLimit(raw) {
  if (raw === undefined) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new ServiceError('limit은 1 이상의 정수여야 합니다.', 400);
  }
  return Math.min(n, MAX_LIMIT);
}

function parseOffset(raw) {
  if (raw === undefined) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new ServiceError('offset은 0 이상의 정수여야 합니다.', 400);
  }
  return n;
}

function parseDate(raw, fieldName) {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ServiceError(`${fieldName} 형식이 올바르지 않습니다.`, 400);
  }
  return date;
}

function assertStatusType(statusType) {
  if (statusType !== undefined && !VALID_STATUS_TYPES.includes(statusType)) {
    throw new ServiceError('status_type이 올바르지 않습니다.', 400);
  }
}

function parseAcknowledged(raw) {
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new ServiceError('acknowledged는 true 또는 false여야 합니다.', 400);
}

async function listRfidEvents({ roomCode, gatewayId, from, to, limit, offset }) {
  const parsedLimit = parseLimit(limit);
  const rows = await eventRepository.findRfidEvents({
    roomCode,
    gatewayId,
    from: parseDate(from, 'from'),
    to: parseDate(to, 'to'),
    limit: parsedLimit + 1,
    offset: parseOffset(offset),
  });
  const hasMore = rows.length > parsedLimit;
  return { items: hasMore ? rows.slice(0, parsedLimit) : rows, has_more: hasMore };
}

async function listDoorEvents({ roomCode, gatewayId, from, to, limit, offset }) {
  const parsedLimit = parseLimit(limit);
  const rows = await eventRepository.findDoorEvents({
    roomCode,
    gatewayId,
    from: parseDate(from, 'from'),
    to: parseDate(to, 'to'),
    limit: parsedLimit + 1,
    offset: parseOffset(offset),
  });
  const hasMore = rows.length > parsedLimit;
  return { items: hasMore ? rows.slice(0, parsedLimit) : rows, has_more: hasMore };
}

async function listStatusEvents({ statusType, roomCode, acknowledged, from, to, limit, offset }) {
  assertStatusType(statusType);
  const parsedLimit = parseLimit(limit);
  const rows = await eventRepository.findStatusEvents({
    statusType,
    roomCode,
    acknowledged: parseAcknowledged(acknowledged),
    from: parseDate(from, 'from'),
    to: parseDate(to, 'to'),
    limit: parsedLimit + 1,
    offset: parseOffset(offset),
  });
  const hasMore = rows.length > parsedLimit;
  return { items: hasMore ? rows.slice(0, parsedLimit) : rows, has_more: hasMore };
}

module.exports = { ServiceError, listRfidEvents, listDoorEvents, listStatusEvents };
