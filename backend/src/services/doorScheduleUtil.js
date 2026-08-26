const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// week_slots[day][slotIndex] === true 는 그 30분 구간이 "잠김(closed) 유지" 시간대라는 뜻.
// 활성 즉각실행(open) 오버라이드가 있으면 스케줄상 잠김이어도 지금은 열려있는 것으로 본다.
function isLocked({ effective_schedule: effectiveSchedule, active_override: activeOverride } = {}) {
  if (activeOverride && activeOverride.door_command === 'open') {
    return false;
  }
  if (!effectiveSchedule || !effectiveSchedule.week_slots) {
    return false;
  }

  // DB(door_schedules)와 마찬가지로 UTC 기준으로 계산한다 — config/db.js의
  // timezone: 'Z' 설정과 일관성을 맞추기 위해 로컬 타임존 메서드 대신 UTC 메서드 사용.
  const now = new Date();
  const dayKey = DAY_KEYS[now.getUTCDay()];
  const slots = effectiveSchedule.week_slots[dayKey];
  if (!Array.isArray(slots)) return false;

  const slotIndex = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30);
  return Boolean(slots[slotIndex]);
}

// 지금 적용 중인 상태(잠김/열림)가 언제 바뀌는지 — 다음으로 값이 달라지는 슬롯의
// 시작 시각(UTC)을 반환한다. 한 주(336슬롯) 안에서 값이 전혀 안 바뀌면 null.
function getNextChangeAt(effectiveSchedule, now = new Date()) {
  if (!effectiveSchedule || !effectiveSchedule.week_slots) return null;

  const currentDayIdx = now.getUTCDay();
  const currentSlotIdx = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30);
  const currentSlots = effectiveSchedule.week_slots[DAY_KEYS[currentDayIdx]];
  if (!Array.isArray(currentSlots)) return null;
  const currentValue = Boolean(currentSlots[currentSlotIdx]);

  const slotHour = Math.floor(currentSlotIdx / 2);
  const slotMinute = (currentSlotIdx % 2) * 30;
  const currentSlotStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), slotHour, slotMinute, 0, 0)
  );

  for (let k = 1; k <= 336; k += 1) {
    const totalSlot = currentSlotIdx + k;
    const dayOffset = Math.floor(totalSlot / 48);
    const slotInDay = totalSlot % 48;
    const dayIdx = (currentDayIdx + dayOffset) % 7;
    const slots = effectiveSchedule.week_slots[DAY_KEYS[dayIdx]];
    const value = Array.isArray(slots) ? Boolean(slots[slotInDay]) : currentValue;

    if (value !== currentValue) {
      return new Date(currentSlotStart.getTime() + k * 30 * 60 * 1000);
    }
  }

  return null;
}

function assertValidWeekSlots(weekSlots) {
  if (!weekSlots || typeof weekSlots !== 'object') {
    throw new Error('week_slots는 객체여야 합니다.');
  }
  for (const day of DAY_KEYS) {
    const slots = weekSlots[day];
    if (!Array.isArray(slots) || slots.length !== 48 || slots.some((v) => typeof v !== 'boolean')) {
      throw new Error(`week_slots.${day}는 boolean 48개짜리 배열이어야 합니다.`);
    }
  }
}

module.exports = { DAY_KEYS, isLocked, getNextChangeAt, assertValidWeekSlots };
