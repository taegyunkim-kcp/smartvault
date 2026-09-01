const doorPolicyRepository = require('../repositories/doorPolicyRepository');
const policyRepository = require('../repositories/policyRepository');
const tempPolicyRepository = require('../repositories/tempPolicyRepository');
const roomRepository = require('../repositories/roomRepository');
const personnelStatusRepository = require('../repositories/personnelStatusRepository');
const { DAY_KEYS, isLocked, getNextChangeAt, assertValidWeekSlots } = require('./doorScheduleUtil');

const SCOPE_TYPES = ['base', 'building', 'room'];
const SCOPE_TYPES_WITH_GLOBAL = ['base', 'building', 'room', 'global'];
const POLICY_NAME_MAX = 100;
const REASON_MAX = 200;

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

// 정책 소속 변경(드래그이동/멤버 추가삭제)과 임시정책 저장/취소는 사유를 기록해야 한다 —
// "작업자(관리자)"는 로그인 도입 전까지 항상 null로 남긴다([[door_policy_change_events]]).
function assertReason(reason) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new ServiceError('사유는 필수입니다.', 400);
  }
  if (reason.length > REASON_MAX) {
    throw new ServiceError(`사유는 ${REASON_MAX}자를 초과할 수 없습니다.`, 400);
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

// 어떤 정책이 지금 실제로 적용하는 내용 — 그 정책 소속(직접 지정 + 기본 정책이면 global)
// 스코프 중 하나라도 임시정책이 활성이면 그 내용을, 아니면 정책 자체 내용을 쓴다.
// "정책 적용 현황" 카드의 active_temp/currently_locked도 이 규칙을 그대로 쓴다 — 방이
// 어떤 스코프(직접 room 지정이든 building/base 상속이든)를 통해 이 정책에 속했든, 그
// 정책에 임시정책이 걸려 있으면 방 타일도 동일하게 반영되어야 카드와 타일 상태가 어긋나지
// 않는다(예: 카드에서 base 스코프에 임시정책을 걸어도, room 스코프로 직접 이 정책에 속한
// 방은 옛날엔 room 레벨에서 바로 멈춰버려 임시정책을 못 보고 정책 원본 내용을 보여줬음).
async function getPolicyEffectiveWeekSlots(policy) {
  const directScopes = await policyRepository.findScopesByPolicy(policy.id);
  const scopesForTemp = policy.is_default
    ? [...directScopes, { scope_type: 'global', scope_code: 'ALL' }]
    : directScopes;
  const activeTemp = await findActiveTempForScopes(scopesForTemp);
  return activeTemp ? activeTemp.week_slots : policy.week_slots;
}

// 지금 실제로 적용받는 내용 — 레벨(room→building→base→global)별로 "이번 주 임시정책이
// 있으면 그걸, 없으면 그 레벨의 영구 정책(및 그 정책 자체의 임시정책)"을 먼저 확인하고,
// 없으면 상위 레벨로 올라간다. (즉 room 레벨 영구 정책이 building 레벨의, 이 정책과 무관한
// 임시정책보다 항상 우선 — 기존 상속 우선순위와 일관)
async function resolveEffectiveAtLevel(scopeType, scopeCode) {
  const temp = await tempPolicyRepository.find(scopeType, scopeCode);
  if (temp) {
    return { week_slots: temp.week_slots, source: 'temp', valid_until: temp.valid_until };
  }
  const policy = await resolvePolicyForScope(scopeType, scopeCode);
  if (policy) {
    const weekSlots = await getPolicyEffectiveWeekSlots(policy);
    return { week_slots: weekSlots, source: 'policy', policy_id: policy.id, policy_name: policy.name };
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

// 이 정책 소속(직접 지정 + 기본 정책이면 global) 스코프 중 하나라도 지금 활성 임시정책이
// 있으면 그걸 돌려준다 — 정책 카드 안에 "이번 주만 다른 내용 적용 중"을 표시하기 위한 것.
async function findActiveTempForScopes(scopes) {
  for (const scope of scopes) {
    const temp = await tempPolicyRepository.find(scope.scope_type, scope.scope_code);
    if (temp) return temp;
  }
  return null;
}

// 보관함 개폐 관리/제어 화면 상단의 "현재 정책 적용 현황"용 — 정책마다 실제로 속한(직접
// 지정된) 조직/방 목록과, 상속까지 반영해서 그 정책을 따르는 전체 내무반 목록을 함께 준다.
async function getPolicyGroups() {
  const policies = await policyRepository.findAll();
  const rooms = await roomRepository.findAll();

  const groups = new Map();
  for (const policy of policies) {
    const directScopes = await policyRepository.findScopesByPolicy(policy.id);
    const scopesForTemp = policy.is_default
      ? [...directScopes, { scope_type: 'global', scope_code: 'ALL' }]
      : directScopes;
    const activeTemp = await findActiveTempForScopes(scopesForTemp);
    const effectiveWeekSlots = activeTemp ? activeTemp.week_slots : policy.week_slots;
    const nextChangeAt = getNextChangeAt({ week_slots: effectiveWeekSlots });
    groups.set(policy.id, {
      id: policy.id,
      name: policy.name,
      is_default: Boolean(policy.is_default),
      week_slots: policy.week_slots,
      direct_scopes: directScopes,
      active_temp: activeTemp ? { week_slots: activeTemp.week_slots, valid_until: activeTemp.valid_until } : null,
      currently_locked: isLocked({ effective_schedule: { week_slots: effectiveWeekSlots }, active_override: null }),
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

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반', global: '전체' };

// 어떤 조직/방이 지금 임시정책의 영향을 받는지 — resolvePolicyForRoom과 같은 모양으로
// room→building→base→global 순서로 활성 임시정책을 찾는다(레벨 우선순위는 영구정책과 동일).
async function resolveTempPolicyForRoom(hierarchy) {
  const candidates = [
    ['room', hierarchy.room_code],
    ['building', hierarchy.building_code],
    ['base', hierarchy.base_code],
    ['global', 'ALL'],
  ];
  for (const [scopeType, scopeCode] of candidates) {
    const temp = await tempPolicyRepository.find(scopeType, scopeCode);
    if (temp) return temp;
  }
  return null;
}

// 별도 "임시 정책 적용" UI로 만든 예외 중, 어떤 정책의 소속 스코프와도 겹치지 않는 것만
// "정책 적용 현황"에 별도 카드로 보여준다 — 정책 소속 스코프와 겹치는 임시정책은 그 정책
// 카드 안에 인라인으로(getPolicyGroups의 active_temp) 이미 표시되므로 여기서 제외한다.
async function getActiveTempPolicyGroups() {
  const policies = await policyRepository.findAll();
  const ownedScopeKeys = new Set();
  for (const policy of policies) {
    const scopes = await policyRepository.findScopesByPolicy(policy.id);
    for (const scope of scopes) ownedScopeKeys.add(`${scope.scope_type}:${scope.scope_code}`);
    if (policy.is_default) ownedScopeKeys.add('global:ALL');
  }

  const rooms = await roomRepository.findAll();
  const groups = new Map();

  for (const room of rooms) {
    const hierarchy = await doorPolicyRepository.findRoomHierarchy(room.room_code);
    if (!hierarchy) continue;
    const temp = await resolveTempPolicyForRoom(hierarchy);
    if (!temp) continue;
    if (ownedScopeKeys.has(`${temp.scope_type}:${temp.scope_code}`)) continue;

    if (!groups.has(temp.id)) {
      const nextChangeAt = getNextChangeAt({ week_slots: temp.week_slots });
      groups.set(temp.id, {
        id: `temp-${temp.id}`,
        is_temp: true,
        is_default: false,
        name: `임시정책 — ${SCOPE_TYPE_LABELS[temp.scope_type] || temp.scope_type} ${temp.scope_code}`,
        scope_type: temp.scope_type,
        scope_code: temp.scope_code,
        week_slots: temp.week_slots,
        valid_until: temp.valid_until,
        direct_scopes: [],
        currently_locked: isLocked({ effective_schedule: { week_slots: temp.week_slots }, active_override: null }),
        next_change_at: nextChangeAt ? nextChangeAt.toISOString() : null,
        rooms: [],
      });
    }
    groups.get(temp.id).rooms.push({ room_code: room.room_code, room_name: room.room_name });
  }

  return [...groups.values()];
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

// 정책을 지우면 거기 속해 있던 조직/방은 전부 즉시 상속(기본 정책)으로 복귀한다 —
// 그래서 멤버가 남아있어도 삭제를 막지 않는다. 기본 정책만 예외.
async function deletePolicy(policyId) {
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  if (policy.is_default) {
    throw new ServiceError('기본 정책은 삭제할 수 없습니다.', 400);
  }
  await policyRepository.remove(policyId);
}

async function addMember(policyId, scopeType, scopeCode, reason) {
  assertScopeType(scopeType);
  if (typeof scopeCode !== 'string' || scopeCode.trim() === '') {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  assertReason(reason);
  const policy = await policyRepository.findById(policyId);
  if (!policy) {
    throw new ServiceError('정책을 찾을 수 없습니다.', 404);
  }
  await policyRepository.addScope(policyId, scopeType, scopeCode);
  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode: scopeType === 'room' ? scopeCode : null,
    detail: {
      event_type: 'scope_assign',
      scope_type: scopeType,
      scope_code: scopeCode,
      policy_id: policyId,
      policy_name: policy.name,
      reason,
    },
  });
}

async function removeMember(scopeType, scopeCode, reason) {
  assertScopeType(scopeType);
  assertReason(reason);
  const existing = await policyRepository.findScopeAssignment(scopeType, scopeCode);
  await policyRepository.removeScope(scopeType, scopeCode);
  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode: scopeType === 'room' ? scopeCode : null,
    detail: {
      event_type: 'scope_unassign',
      scope_type: scopeType,
      scope_code: scopeCode,
      policy_id: existing ? existing.policy_id : null,
      policy_name: existing ? existing.policy_name : null,
      reason,
    },
  });
}

async function getTempPolicy(scopeType, scopeCode) {
  assertScopeTypeWithGlobal(scopeType);
  if (!scopeCode) {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  return tempPolicyRepository.find(scopeType, scopeCode);
}

async function saveTempPolicy(scopeType, scopeCode, weekSlots, reason) {
  assertScopeTypeWithGlobal(scopeType);
  if (!scopeCode) {
    throw new ServiceError('scope_code는 필수입니다.', 400);
  }
  assertWeekSlots(weekSlots);
  assertReason(reason);

  const now = new Date();
  // mysql2가 DATETIME(초 단위, 밀리초 없음) 컬럼에 바인딩할 때 밀리초를 반올림하므로,
  // ms>=500이면 valid_from이 다음 초로 올림되어 저장 직후 조회(NOW())에서 "아직 유효하지
  // 않음"으로 보이는 경합이 생긴다. 밀리초를 미리 0으로 잘라내 항상 내림되게 한다.
  now.setMilliseconds(0);
  const validUntil = computeNextWeekBoundaryUTC(now);
  const saved = await tempPolicyRepository.upsert(scopeType, scopeCode, { weekSlots, validFrom: now, validUntil });
  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode: scopeType === 'room' ? scopeCode : null,
    detail: {
      event_type: 'temp_policy_save',
      scope_type: scopeType,
      scope_code: scopeCode,
      valid_until: validUntil,
      reason,
    },
  });
  return saved;
}

async function cancelTempPolicy(scopeType, scopeCode, reason) {
  assertScopeTypeWithGlobal(scopeType);
  assertReason(reason);
  await tempPolicyRepository.remove(scopeType, scopeCode);
  await personnelStatusRepository.insertStatusEvent({
    statusType: 'admin_action',
    roomCode: scopeType === 'room' ? scopeCode : null,
    detail: {
      event_type: 'temp_policy_cancel',
      scope_type: scopeType,
      scope_code: scopeCode,
      reason,
    },
  });
}

module.exports = {
  ServiceError,
  getEffectivePolicy,
  getPolicyGroups,
  getActiveTempPolicyGroups,
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
