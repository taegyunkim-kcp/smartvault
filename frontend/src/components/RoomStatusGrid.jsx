import './roomStatusGrid.css';

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
            className={`room-tile lock-${room.reported_lock_state || 'unknown'}${onSelectRoom ? ' clickable' : ''}`}
            title={`${room.room_code} — ${room.room_name || '(이름 없음)'}`}
            onClick={onSelectRoom ? () => onSelectRoom(room.room_code) : undefined}
          >
            <span className={`room-tile-door door-${room.last_door_state || 'unknown'}`} />
            <span className="room-tile-index">{index + 1}</span>
          </div>
        ))}
      </div>
      <p className="room-status-legend">
        칸 배경(개폐 설정) — <span className="legend-swatch lock-locked" /> 잠김{' '}
        <span className="legend-swatch lock-unlocked" /> 열림 허용{' '}
        <span className="legend-swatch lock-unknown" /> 미보고 · 우측 상단 점(문 상태) —{' '}
        <span className="legend-dot door-open" /> 열림 <span className="legend-dot door-closed" /> 닫힘{' '}
        <span className="legend-dot door-unknown" /> 기록 없음 · 칸에 커서를 올리면 내무반 이름이 표시됩니다.
      </p>
    </div>
  );
}

export default RoomStatusGrid;
