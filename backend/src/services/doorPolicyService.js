const doorPolicyRepository = require('../repositories/doorPolicyRepository');
const policyRepository = require('../repositories/policyRepository');
const tempPolicyRepository = require('../repositories/tempPolicyRepository');
const roomRepository = require('../repositories/roomRepository');
const { DAY_KEYS, isLocked, getNextChangeAt, assertValidWeekSlots } = require('./doorScheduleUtil');

const SCOPE_TYPES = ['base', 'building', 'room'];
const SCOPE_TYPES_WITH_GLOBAL = ['base', 'building', 'room', 'global'];
const POLICY_NAME_MAX = 100;

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

function assertScopeTypeWithGlobal(scopeType) {
  if (!SCOPE_TYPES_WITH_GLOBAL.includes(scopeType)) {
    throw new ServiceError('scope_type은 base/building/room/global 중 하나여야 합니다.', 400);
  }
}

function assertPolicyName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ServiceError('정책 이름은 필수입니다.', 400);
  }
  if (name.length > POLICY_NAME_MAX) {
    throw new ServiceError(`정책 이름은 ${POLICY_NAME_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertWeekSlots(weekSlots) {
  try {
    assertValidWeekSlots(weekSlots);
  } catch (err) {
    throw new ServiceError(err.message, 400);
  }
}

function emptyWeekSlots() {
  const week = {};
  for (const day of DAY_KEYS) {
    week[day] = new Array(48).fill(false);
  }
  return week;
}

// 다음 주 경계(다음 일요일 00:00 UTC) — 임시정책은 저장 즉시 적용되어 이 시각까지만 유효.
function computeNextWeekBoundaryUTC(now) {
  const day = now.getUTCDay(); // 0 = 일요일
  const daysUntilNextSunday = day === 0 ? 7 : 7 - day;
  const boundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  boundary.setUTCDate(boundary.getUTCDate() + daysUntilNextSunday);
  return boundary;
}

// 어떤 조직/방이 실제로 속한(=편집·드래그이동 대상이 되는) 정책 — 임시정책은 무시하고
// door_policy_scopes/기본 정책만 본다. "정책 적용 현황" 카드가 이 기준으로 방을 묶는다.
async function resolvePolicyForScope(scopeType, scopeCode) {
  if (scopeType === 'global') {
    return policyRepository.findDefault();
  }
  const assignment = await policyRepository.findScopeAssignment(scopeType, scopeCode);
  if (assignment) {
    return policyRepository.findById(assignment.policy_id);
  }
  return null;
}

async function resolvePolicyForRoom(hierarchy) {
  const candidates = [
    ['room', hierarchy.room_code],
    ['building', hierarchy.building_code],
    ['base', hierarchy.base_code],
  ];
  for (const [scopeType, scopeCode] of candidates) {
    const policy = await resolvePolicyForScope(scopeType, scopeCode);
    if (policy) return policy;
  }
  return policyRepository.findDefault();
}

// 지금 실제로 적용받는 내용 — 레벨(room→building→base→global)별로 "이번 주 임시정책이
// 있으면 그걸, 없으면 그 레벨의 영구 정책"을 먼저 확인하고, 없으면 상위 레벨로 올라간다.
// (즉 room 레벨 영구 정책이 building 레벨 임시정책보다 항상 우선 — 기존 상속 우선순위와 일관)
async function resolveEffectiveAtLevel(scopeType, scopeCode) {
  const temp = await tempPolicyRepository.find(scopeType, scopeCode);
  if (temp) {
    return { week_slots: temp.week_slots, source: 'temp', valid_until: temp.valid_until };
  }
  const policy = await resolvePolicyForScope(scopeType, scopeCode);
  if (policy) {
    return { week_slots: policy.week_slots, source: 'policy', policy_id: policy.id, policy_name: policy.name };
  }
  return null;
}

async function getEffectivePolicy(roomCode) {
  if (!roomCode) {
    throw new ServiceError('room_code는 필수입니다.', 400);
  }

  const hierarchy = await doorPolicyRepository.findRoomHierarchy(roomCode);
  if (!hierarchy) {
    throw new ServiceError('방을 찾을 수 없습니다.', 404);
  }

  const scopeCandidates = [
    ['room', hierarchy.room_code],
    ['building', hierarchy.building_code],
    ['base', hierarchy.base_code],
    ['global', 'ALL'],
  ];

  let effectiveSchedule = null;
  for (const [scopeType, scopeCode] of scopeCandidates) {
    effectiveSchedule = await resolveEffectiveAtLevel(scopeType, scopeCode);
    if (effectiveSchedule) break;
  }

  const activeOverride = await doorPolicyRepository.findActiveOverride(roomCode);

  return { effective_schedule: effectiveSchedule, active_override: activeOverride };
}

// 보관함 개폐 관리/제어 화면 상단의 "현재 정책 적용 현황"용 — 정책마다 실제로 속한(직접
// 지정된) 조직/방 목록과, 상속까지 반영해서 그 정책을 따르는 전체 내무반 목록을 함께 준다.
async function getPolicyGroups() {
  const policies = await policyRepository.findAll();
  const rooms = await roomRepository.findAll();

  const groups = new Map();
  for (const policy of policies) {
    const directScopes = await policyRepository.findScopesByPolicy(policy.id);
    const nextChangeAt = getNextChangeAt({ week_slots: policy.week_slots });
    groups.set(policy.id, {
      id: policy.id,
      name: policy.name,
      is_default: Boolean(policy.is_default),
      week_slots: policy.week_slots,
      direct_scopes: directScopes,
      currently_locked: isLocked({ effective_schedule: { week_slots: policy.week_slots }, active_override: null }),
      next_change_at: nextChangeAt ? nextChangeAt.toISOString() : null,
      rooms: [],
    });
  }

  for (const room of rooms) {
    const hierarchy = await doorPolicyRepository.findRoomHierarchy(room.room_code);
    if (!hierarchy) continue;
    const policy = await resolvePolicyForRoom(hierarchy);
    if (policy && groups.has(policy.id)) {
      groups.get(policy.id).rooms.push({ room_code: room.room_code, room_name: room.room_name });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    return a.name.localeCompare(b.name, 'ko');
  });
}

async function createPolicy({ name, weekSlots }) {
  assertPolicyName(name);
  const slots = weekSlots || emptyWeekSlots();
  assertWeekSlots(slots);
  return policyRepository.create({ name, weekSlots: slots });
}

async function updatePolicyContent(policyId, weekSlots) {
  assertWeekSlots(weekSlots);
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  return policyRepository.updateContent(policyId, weekSlots);
}

async function renamePolicy(policyId, name) {
  assertPolicyName(name);
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  return policyRepository.rename(policyId, name);
}

async function deletePolicy(policyId) {
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  if (policy.is_default) {
    throw new ServiceError('기본 정책은 삭제할 수 없습니다.', 400);
  }
  const memberCount = await policyRepository.countScopes(policyId);
  if (memberCount > 0) {
    throw new ServiceError('이 정책에 속한 조직/내무반이 있어 삭제할 수 없습니다.', 409);
  }
  await policyRepository.remove(policyId);
}

async function addMember(policyId, scopeType, scopeCode) {
  assertScopeType(scopeType);
  if (typeof scopeCode !== 'string' || scopeCode.trim() === '') {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  await policyRepository.addScope(policyId, scopeType, scopeCode);
}

async function removeMember(scopeType, scopeCode) {
  assertScopeType(scopeType);
  await policyRepository.removeScope(scopeType, scopeCode);
}

async function getTempPolicy(scopeType, scopeCode) {
  assertScopeTypeWithGlobal(scopeType);
  if (!scopeCode) {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  return tempPolicyRepository.find(scopeType, scopeCode);
}

async function saveTempPolicy(scopeType, scopeCode, weekSlots) {
  assertScopeTypeWithGlobal(scopeType);
  if (!scopeCode) {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  assertWeekSlots(weekSlots);

  const now = new Date();
  const validUntil = computeNextWeekBoundaryUTC(now);
  return tempPolicyRepository.upsert(scopeType, scopeCode, { weekSlots, validFrom: now, validUntil });
}

async function cancelTempPolicy(scopeType, scopeCode) {
  assertScopeTypeWithGlobal(scopeType);
  await tempPolicyRepository.remove(scopeType, scopeCode);
}

module.exports = {
  ServiceError,
  getEffectivePolicy,
  getPolicyGroups,
  createPolicy,
  updatePolicyContent,
  renamePolicy,
  deletePolicy,
  addMember,
  removeMember,
  getTempPolicy,
  saveTempPolicy,
  cancelTempPolicy,
};
