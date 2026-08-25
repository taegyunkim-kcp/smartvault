const ingestRepository = require('../repositories/ingestRepository');

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const VALID_KINDS = ['rfid', 'door', 'lock_status'];
const VALID_LOCK_STATES = ['locked', 'unlocked'];

function isValidEventShape(event) {
  if (!event || typeof event !== 'object') return false;
  if (!event.gateway_id || !VALID_KINDS.includes(event.kind)) return false;
  if (event.kind === 'lock_status' && !VALID_LOCK_STATES.includes(event.lock_state)) return false;
  return true;
}

async function ingestEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new ServiceError('events 배열이 비어 있습니다.', 400);
  }

  const uniqueGatewayIds = [...new Set(events.map((e) => e && e.gateway_id).filter(Boolean))];
  const existingGatewayIds = new Set(await ingestRepository.findExistingGatewayIds(uniqueGatewayIds));

  let inserted = 0;
  let skipped = 0;
  const seenGatewayIds = new Set();

  for (const event of events) {
    const occurredAt = event && event.occurred_at ? new Date(event.occurred_at) : new Date();

    if (!isValidEventShape(event) || Number.isNaN(occurredAt.getTime()) || !existingGatewayIds.has(event.gateway_id)) {
      skipped += 1;
      continue;
    }

    if (event.kind === 'rfid') {
      await ingestRepository.insertRfidEvent({
        gatewayId: event.gateway_id,
        readerIndex: event.reader_index,
        rfidUid: event.rfid_uid,
        eventType: event.event_type,
        occurredAt,
      });
    } else if (event.kind === 'door') {
      await ingestRepository.insertDoorEvent({
        gatewayId: event.gateway_id,
        doorState: event.door_state,
        occurredAt,
      });
    } else {
      await ingestRepository.updateReportedLockState({
        gatewayId: event.gateway_id,
        lockState: event.lock_state,
        occurredAt,
      });
    }

    inserted += 1;
    seenGatewayIds.add(event.gateway_id);
  }

  await ingestRepository.touchLastSeen([...seenGatewayIds]);

  return { inserted, skipped };
}

module.exports = { ServiceError, ingestEvents };
