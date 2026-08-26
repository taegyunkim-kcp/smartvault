const doorOverrideRepository = require('../repositories/doorOverrideRepository');
const roomRepository = require('../repositories/roomRepository');

const MAX_DURATION_MINUTES = 30;
const DOOR_COMMANDS = ['open', 'lock'];

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function createOverride({ roomCode, durationMinutes, doorCommand }) {
  if (typeof roomCode !== 'string' || roomCode.trim() === '') {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
    throw new ServiceError(`duration_minutes는 1~${MAX_DURATION_MINUTES} 사이의 정수여야 합니다.`, 400);
  }
  const command = doorCommand || 'open';
  if (!DOOR_COMMANDS.includes(command)) {
    throw new ServiceError('door_command는 open/lock 중 하나여야 합니다.', 400);
  }

  const room = await roomRepository.findById(roomCode);
  if (!room) {
    throw new ServiceError('존재하지 않는 room_code입니다.', 400);
  }

  return doorOverrideRepository.create({ roomCode, durationMinutes, doorCommand: command });
}

async function listOverrides(roomCode) {
  if (!roomCode) {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }
  return doorOverrideRepository.findByRoom(roomCode);
}

// 정책 적용 현황 화면에서 활성 즉각 실행을 전부 표시하기 위한 용도.
async function listActiveOverrides() {
  return doorOverrideRepository.findAllActive();
}

async function cancelOverride(id) {
  const override = await doorOverrideRepository.findById(id);
  if (!override) {
    throw new ServiceError('오버라이드를 찾을 수 없습니다.', 404);
  }
  return doorOverrideRepository.cancel(id);
}

module.exports = { ServiceError, createOverride, listOverrides, listActiveOverrides, cancelOverride };
