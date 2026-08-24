const gatewayRepository = require('../repositories/gatewayRepository');

const GATEWAY_ID_MAX = 40;
const ROOM_CODE_MAX = 30;
const FIRMWARE_VERSION_MAX = 30;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertGatewayId(gatewayId) {
  if (typeof gatewayId !== 'string' || gatewayId.trim() === '') {
    throw new ServiceError('gateway_id는 필수입니다.', 400);
  }
  if (gatewayId.length > GATEWAY_ID_MAX) {
    throw new ServiceError(`gateway_id는 ${GATEWAY_ID_MAX}자를 초과할 수 없습니다.`, 400);
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

function assertReaderCount(readerCount) {
  if (readerCount === undefined) return;
  if (!Number.isInteger(readerCount) || readerCount < 0 || readerCount > 255) {
    throw new ServiceError('reader_count는 0~255 사이의 정수여야 합니다.', 400);
  }
}

function assertFirmwareVersion(firmwareVersion) {
  if (firmwareVersion === undefined || firmwareVersion === null) return;
  if (typeof firmwareVersion !== 'string' || firmwareVersion.length > FIRMWARE_VERSION_MAX) {
    throw new ServiceError(`firmware_version은 ${FIRMWARE_VERSION_MAX}자 이하 문자열이어야 합니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 gateway_id입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 room_code입니다.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('연결된 이벤트 기록이 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listGateways(roomCode) {
  return gatewayRepository.findAll({ roomCode });
}

async function getGateway(gatewayId) {
  const gateway = await gatewayRepository.findById(gatewayId);
  if (!gateway) {
    throw new ServiceError('게이트웨이를 찾을 수 없습니다.', 404);
  }
  return gateway;
}

async function createGateway(data) {
  assertGatewayId(data.gatewayId);
  assertRoomCode(data.roomCode);
  assertReaderCount(data.readerCount);
  assertFirmwareVersion(data.firmwareVersion);

  try {
    return await gatewayRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateGateway(gatewayId, data) {
  assertGatewayId(gatewayId);
  if (data.roomCode !== undefined) assertRoomCode(data.roomCode);
  if (data.readerCount !== undefined) assertReaderCount(data.readerCount);
  if (data.firmwareVersion !== undefined) assertFirmwareVersion(data.firmwareVersion);

  await getGateway(gatewayId);

  try {
    return await gatewayRepository.update(gatewayId, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteGateway(gatewayId) {
  await getGateway(gatewayId);
  try {
    await gatewayRepository.remove(gatewayId);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
};
