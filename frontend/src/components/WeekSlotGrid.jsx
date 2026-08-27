import { DAY_KEYS, DAY_LABELS, emptyWeekSlots } from './weekSlots';
import './weekSlotGrid.css';

function currentSlot() {
  const now = new Date();
  return { dayKey: DAY_KEYS[now.getUTCDay()], slotIndex: Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30) };
}

function WeekSlotGrid({ value, onChange, readOnly }) {
  const weekSlots = value || emptyWeekSlots();
  const { dayKey: currentDayKey, slotIndex: currentSlotIndex } = currentSlot();

  function toggleSlot(day, index) {
    if (readOnly) return;
    const nextDay = weekSlots[day].slice();
    nextDay[index] = !nextDay[index];
    onChange({ ...weekSlots, [day]: nextDay });
  }

  function toggleDay(day) {
    if (readOnly) return;
    const allLocked = weekSlots[day].every(Boolean);
    onChange({ ...weekSlots, [day]: new Array(48).fill(!allLocked) });
  }

  function toggleHour(hour) {
    if (readOnly) return;
    const first = hour * 2;
    const second = hour * 2 + 1;
    const allLocked = DAY_KEYS.every((day) => weekSlots[day][first] && weekSlots[day][second]);
    const next = {};
    for (const day of DAY_KEYS) {
      const nextDay = weekSlots[day].slice();
      nextDay[first] = !allLocked;
      nextDay[second] = !allLocked;
      next[day] = nextDay;
    }
    onChange({ ...weekSlots, ...next });
  }

  return (
    <div className="week-slot-grid">
      <div className="week-slot-header">
        <div className="week-slot-day-label" />
        {Array.from({ length: 24 }, (_, hour) => (
          <button key={hour} type="button" className="week-slot-hour-label" onClick={() => toggleHour(hour)}>
            {hour}
          </button>
        ))}
      </div>
      {DAY_KEYS.map((day) => (
        <div key={day} className="week-slot-row">
          <button type="button" className="week-slot-day-label" onClick={() => toggleDay(day)}>
            {DAY_LABELS[day]}
          </button>
          <div className="week-slot-cells">
            {weekSlots[day].map((locked, index) => (
              <div
                key={index}
                className={`week-slot-cell${locked ? ' locked' : ''}${
                  day === currentDayKey && index === currentSlotIndex ? ' current' : ''
                }`}
                onClick={() => toggleSlot(day, index)}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="week-slot-legend">
        색칠된 칸 = 잠김(closed) 유지 시간대. 칸 클릭으로 토글, 요일 클릭으로 하루 전체 토글, 시간
        헤더 클릭으로 그 시간대 전체 요일 토글.
      </p>
    </div>
  );
}

export default WeekSlotGrid;
