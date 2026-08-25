import './roomStatusGrid.css';

const LOCK_LABEL = { locked: '잠김', unlocked: '열림 허용' };
const DOOR_LABEL = { open: '열림', closed: '닫힘' };

function roomTitle(room) {
  const scheduled = room.scheduled_lock_state ? LOCK_LABEL[room.scheduled_lock_state] : '정책 없음';
  const reported = room.reported_lock_state ? LOCK_LABEL[room.reported_lock_state] : '미보고';
  const door = room.last_door_state ? DOOR_LABEL[room.last_door_state] : '기록 없음';
  return `${room.room_code} — ${room.room_name || '(이름 없음)'}\n문 상태: ${door}\n게이트웨이 보고: ${reported}\n서버 계획: ${scheduled}`;
}

function RoomStatusGrid({ rooms, onSelectRoom }) {
  if (rooms.length === 0) {
    return <div className="empty-state">등록된 내무반이 없습니다.</div>;
  }

  return (
    <div>
      <div className="room-status-grid">
        {rooms.map((room, index) => (
          <div
            key={room.room_code}
            className={`room-tile door-${room.last_door_state || 'unknown'}${onSelectRoom ? ' clickable' : ''}`}
            title={roomTitle(room)}
            onClick={onSelectRoom ? () => onSelectRoom(room.room_code) : undefined}
          >
            <span className={`room-tile-reported lock-${room.reported_lock_state || 'unknown'}`} />
            <span className={`room-tile-scheduled scheduled-${room.scheduled_lock_state || 'unknown'}`} />
            <span className="room-tile-index">{index + 1}</span>
          </div>
        ))}
      </div>
      <p className="room-status-legend">
        칸 배경(문 상태) — <span className="legend-swatch door-open" /> 열림{' '}
        <span className="legend-swatch door-closed" /> 닫힘 <span className="legend-swatch door-unknown" /> 기록
        없음 · 우측 상단 점(게이트웨이 보고 설정) — <span className="legend-dot lock-locked" /> 잠김{' '}
        <span className="legend-dot lock-unlocked" /> 열림 허용 <span className="legend-dot lock-unknown" /> 미보고 ·
        좌측 하단 각(서버 계획 상태) — <span className="legend-square scheduled-locked" /> 잠김{' '}
        <span className="legend-square scheduled-unlocked" /> 열림 허용{' '}
        <span className="legend-square scheduled-unknown" /> 정책 없음 · 칸에 커서를 올리면 내무반 이름과 세 상태값이
        모두 표시됩니다.
      </p>
    </div>
  );
}

export default RoomStatusGrid;
