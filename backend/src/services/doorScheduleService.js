const doorScheduleRepository = require('../repositories/doorScheduleRepository');
const doorScheduleTemplateRepository = require('../repositories/doorScheduleTemplateRepository');
const { assertValidWeekSlots } = require('./doorScheduleUtil');

const SCOPE_TYPES = ['base', 'building', 'room'];

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertScopeType(scopeType) {
  if (!SCOPE_TYPES.includes(scopeType)) {
    throw new ServiceError('scope_type은 base/building/room 중 하나여야 합니다.', 400);
  }
}

function assertWeekSlots(weekSlots) {
  try {
    assertValidWeekSlots(weekSlots);
  } catch (err) {
    throw new ServiceError(err.message, 400);
  }
}

async function getSchedule(scopeType, scopeCode) {
  assertScopeType(scopeType);
  if (!scopeCode) {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  return doorScheduleRepository.find(scopeType, scopeCode);
}

async function saveSchedule(scopeType, scopeCode, { weekSlots, basedOnTemplate }) {
  assertScopeType(scopeType);
  assertWeekSlots(weekSlots);
  return doorScheduleRepository.upsert(scopeType, scopeCode, { weekSlots, basedOnTemplate });
}

async function resetFromTemplate(scopeType, scopeCode, templateCode) {
  assertScopeType(scopeType);
  const template = await doorScheduleTemplateRepository.findById(templateCode);
  if (!template) {
    throw new ServiceError('템플릿을 찾을 수 없습니다.', 404);
  }
  return doorScheduleRepository.upsert(scopeType, scopeCode, {
    weekSlots: template.week_slots,
    basedOnTemplate: templateCode,
  });
}

async function deleteSchedule(scopeType, scopeCode) {
  assertScopeType(scopeType);
  await doorScheduleRepository.remove(scopeType, scopeCode);
}

module.exports = { ServiceError, getSchedule, saveSchedule, resetFromTemplate, deleteSchedule };
