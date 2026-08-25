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

module.exports = { isLocked };
