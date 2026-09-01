const doorOverrideRepository = require('../repositories/doorOverrideRepository');
const roomRepository = require('../repositories/roomRepository');
const personnelStatusRepository = require('../repositories/personnelStatusRepository');

const MAX_DURATION_MINUTES = 30;
const DOOR_COMMANDS = ['open', 'lock'];
const REQUEST_FIELD_MAX = 50;
const REASON_MAX = 200;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// 신청자/승인자/사유는 타일 클릭 시점에 입력받아 즉각 실행 이벤트(door_overrides 행)에
// 함께 기록한다. 로그인 도입 전이라 "작업자(관리자)"는 requested_by 컬럼에 아직 채우지 않는다.
function assertRequestField(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ServiceError(`${label}는 필수입니다.`, 400);
  }
  if (value.length > REQUEST_FIELD_MAX) {
    throw new ServiceError(`${label}는 ${REQUEST_FIELD_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertReason(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ServiceError('사유는 필수입니다.', 400);
  }
  if (value.length > REASON_MAX) {
    throw new ServiceError(`사유는 ${REASON_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

// duration_minutes를 생략하면(내무반 타일 클릭으로 만드는 즉각 실행) 지금 슬롯(30분)이
// 끝나는 시각까지만 유지된다. 명시하면(하단 "즉각 실행" 폼) 그 분만큼 지금부터 유지된다.
async function createOverride({ roomCode, durationMinutes, doorCommand, applicant, approver, reason }) {
  if (typeof roomCode !== 'string' || roomCode.trim() === '') {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }
  const command = doorCommand || 'open';
  if (!DOOR_COMMANDS.includes(command)) {
    throw new ServiceError('door_command는 open/lock 중 하나여야 합니다.', 400);
  }
  assertRequestField(applicant, '신청자');
  assertRequestField(approver, '승인자');
  assertReason(reason);

  const room = await roomRepository.findById(roomCode);
  if (!room) {
    throw new ServiceError('존재하지 않는 room_code입니다.', 400);
  }

  let override;
  if (durationMinutes === undefined || durationMinutes === null) {
    override = await doorOverrideRepository.createUntilSlotEnd({
      roomCode,
      doorCommand: command,
      applicant,
      approver,
      reason,
    });
  } else {
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      throw new ServiceError(`duration_minutes는 1~${MAX_DURATION_MINUTES} 사이의 정수여야 합니다.`, 400);
    }
    override = await doorOverrideRepository.create({
      roomCode,
      durationMinutes,
      doorCommand: command,
      applicant,
      approver,
      reason,
    });
  }

  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode,
    detail: {
      event_type: 'door_override_start',
      door_command: command,
      applicant,
      approver,
      reason,
      expires_at: override.expires_at,
      override_id: override.id,
    },
  });

  return override;
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
  const cancelled = await doorOverrideRepository.cancel(id);
  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode: override.room_code,
    detail: {
      event_type: 'door_override_cancel',
      door_command: override.door_command,
      applicant: override.applicant,
      approver: override.approver,
      reason: override.reason,
      override_id: override.id,
    },
  });
  return cancelled;
}

module.exports = { ServiceError, createOverride, listOverrides, listActiveOverrides, cancelOverride };
