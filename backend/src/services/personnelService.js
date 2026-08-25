const personnelRepository = require('../repositories/personnelRepository');

const SERVICE_NUMBER_MAX = 20;
const NAME_MAX = 50;
const PHONE_NUMBER_MAX = 20;
const ROOM_CODE_MAX = 30;
const RFID_UID_MAX = 32;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertServiceNumber(serviceNumber) {
  if (typeof serviceNumber !== 'string' || serviceNumber.trim() === '') {
    throw new ServiceError('군번(service_number)은 필수입니다.', 400);
  }
  if (serviceNumber.length > SERVICE_NUMBER_MAX) {
    throw new ServiceError(`군번은 ${SERVICE_NUMBER_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ServiceError('name은 필수입니다.', 400);
  }
  if (name.length > NAME_MAX) {
    throw new ServiceError(`name은 ${NAME_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertPhoneNumber(phoneNumber) {
  if (phoneNumber === undefined || phoneNumber === null) return;
  if (typeof phoneNumber !== 'string' || phoneNumber.length > PHONE_NUMBER_MAX) {
    throw new ServiceError(`phone_number는 ${PHONE_NUMBER_MAX}자 이하 문자열이어야 합니다.`, 400);
  }
}

function assertRoomCode(roomCode) {
  if (typeof roomCode !== 'string' || roomCode.trim() === '') {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }
  if (roomCode.length > ROOM_CODE_MAX) {
    throw new ServiceError(`room_code는 ${ROOM_CODE_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertRfidUid(rfidUid) {
  if (typeof rfidUid !== 'string' || rfidUid.trim() === '') {
    throw new ServiceError('rfid_uid는 필수입니다.', 400);
  }
  if (rfidUid.length > RFID_UID_MAX) {
    throw new ServiceError(`rfid_uid는 ${RFID_UID_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    if (err.sqlMessage && err.sqlMessage.includes('rfid_uid')) {
      return new ServiceError('이미 다른 인원에게 매칭된 RFID입니다.', 409);
    }
    return new ServiceError('이미 존재하는 군번입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 room_code입니다.', 400);
  }
  return err;
}

async function listPersonnel({ roomCode, matched }) {
  return personnelRepository.findAll({ roomCode, matched });
}

async function getPersonnel(serviceNumber) {
  const person = await personnelRepository.findById(serviceNumber);
  if (!person) {
    throw new ServiceError('인원을 찾을 수 없습니다.', 404);
  }
  return person;
}

async function createPersonnel(data) {
  assertServiceNumber(data.serviceNumber);
  assertName(data.name);
  assertPhoneNumber(data.phoneNumber);
  assertRoomCode(data.roomCode);

  try {
    return await personnelRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updatePersonnel(serviceNumber, data) {
  assertServiceNumber(serviceNumber);
  if (data.name !== undefined) assertName(data.name);
  if (data.phoneNumber !== undefined) assertPhoneNumber(data.phoneNumber);
  if (data.roomCode !== undefined) assertRoomCode(data.roomCode);

  await getPersonnel(serviceNumber);

  try {
    return await personnelRepository.update(serviceNumber, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deletePersonnel(serviceNumber) {
  await getPersonnel(serviceNumber);
  await personnelRepository.remove(serviceNumber);
}

async function matchPersonnel(serviceNumber, rfidUid) {
  assertRfidUid(rfidUid);
  await getPersonnel(serviceNumber);

  try {
    return await personnelRepository.setRfidUid(serviceNumber, rfidUid);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function unmatchPersonnel(serviceNumber) {
  await getPersonnel(serviceNumber);
  return personnelRepository.clearRfidUid(serviceNumber);
}

module.exports = {
  ServiceError,
  listPersonnel,
  getPersonnel,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  matchPersonnel,
  unmatchPersonnel,
};
