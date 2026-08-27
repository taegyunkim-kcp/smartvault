import { DAY_KEYS, DAY_LABELS, emptyWeekSlots } from './weekSlots';
import './weekSlotGrid.css';

function currentSlot() {
  const now = new Date();
  return { dayKey: DAY_KEYS[now.getUTCDay()], slotIndex: Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30) };
}

function WeekSlotGrid({ value, onChange, readOnly, tempMode, baseValue }) {
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

  function toggleColumn(index) {
    if (readOnly) return;
    const allLocked = DAY_KEYS.every((day) => weekSlots[day][index]);
    const next = {};
    for (const day of DAY_KEYS) {
      const nextDay = weekSlots[day].slice();
      nextDay[index] = !allLocked;
      next[day] = nextDay;
    }
    onChange({ ...weekSlots, ...next });
  }

  return (
    <div className={`week-slot-grid${tempMode ? ' week-slot-grid-temp' : ''}`}>
      <div className="week-slot-header">
        <div className="week-slot-day-label" />
        {Array.from({ length: 48 }, (_, index) => {
          const isHourStart = index % 2 === 0;
          return (
            <button
              key={index}
              type="button"
              className={`week-slot-hour-label${isHourStart ? ' week-slot-hour-label-start' : ''}`}
              onClick={() => toggleColumn(index)}
            >
              {isHourStart ? index / 2 : ''}
            </button>
          );
        })}
      </div>
      {DAY_KEYS.map((day) => (
        <div key={day} className="week-slot-row">
          <button type="button" className="week-slot-day-label" onClick={() => toggleDay(day)}>
            {DAY_LABELS[day]}
          </button>
          <div className="week-slot-cells">
            {weekSlots[day].map((locked, index) => {
              const differsFromBase = baseValue ? locked !== baseValue[day][index] : false;
              return (
                <div
                  key={index}
                  className={`week-slot-cell${locked ? ' locked' : ''}${differsFromBase ? ' temp-diff' : ''}${
                    day === currentDayKey && index === currentSlotIndex ? ' current' : ''
                  }`}
                  onClick={() => toggleSlot(day, index)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <p className="week-slot-legend">
        색칠된 칸 = 잠김(closed) 유지 시간대. 칸 클릭으로 토글, 요일 클릭으로 하루 전체 토글, 상단
        시간 헤더 클릭으로 그 30분 슬롯 전체 요일 토글.
      </p>
    </div>
  );
}

export default WeekSlotGrid;
