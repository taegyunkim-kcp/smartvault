const roomRepository = require('../repositories/roomRepository');

const ROOM_CODE_MAX = 30;
const BUILDING_CODE_MAX = 20;
const ROOM_NAME_MAX = 100;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
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

function assertBuildingCode(buildingCode) {
  if (typeof buildingCode !== 'string' || buildingCode.trim() === '') {
    throw new ServiceError('building_code는 필수입니다.', 400);
  }
  if (buildingCode.length > BUILDING_CODE_MAX) {
    throw new ServiceError(`building_code는 ${BUILDING_CODE_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertRoomName(roomName) {
  if (roomName === undefined || roomName === null) return;
  if (typeof roomName !== 'string' || roomName.length > ROOM_NAME_MAX) {
    throw new ServiceError(`room_name은 ${ROOM_NAME_MAX}자 이하 문자열이어야 합니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 room_code입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 building_code입니다.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('게이트웨이가 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listRooms(buildingCode) {
  return roomRepository.findAll({ buildingCode });
}

async function getRoom(roomCode) {
  const room = await roomRepository.findById(roomCode);
  if (!room) {
    throw new ServiceError('방을 찾을 수 없습니다.', 404);
  }
  return room;
}

async function createRoom(data) {
  assertRoomCode(data.roomCode);
  assertBuildingCode(data.buildingCode);
  assertRoomName(data.roomName);

  try {
    return await roomRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateRoom(roomCode, data) {
  assertRoomCode(roomCode);
  if (data.roomName !== undefined) assertRoomName(data.roomName);

  await getRoom(roomCode);

  try {
    return await roomRepository.update(roomCode, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteRoom(roomCode) {
  await getRoom(roomCode);
  try {
    await roomRepository.remove(roomCode);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
};
