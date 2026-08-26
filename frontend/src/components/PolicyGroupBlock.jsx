import { useState } from 'react';
import WeekSlotGrid from './WeekSlotGrid';
import RoomStatusGrid from './RoomStatusGrid';
import '../styles/crud.css';
import './policyGroupBlock.css';

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반' };

function PolicyGroupBlock({ group, allRooms }) {
  const [expanded, setExpanded] = useState(false);
  const isGlobal = group.scope_type === 'global';
  const title = isGlobal
    ? '기본 정책 (전체 적용)'
    : `개별 정책 — ${SCOPE_TYPE_LABELS[group.scope_type] || group.scope_type} ${group.scope_code}`;

  const groupRoomCodes = new Set(group.rooms.map((room) => room.room_code));
  const groupRoomSummaries = allRooms.filter((room) => groupRoomCodes.has(room.room_code));

  return (
    <div className="policy-group-block">
      <div className="policy-group-header">
        <h4>{title}</h4>
        <span className={`badge ${group.currently_locked ? 'badge-offline' : 'badge-online'}`}>
          {group.currently_locked ? '잠김' : '열림 허용'}
        </span>
        <button type="button" className="policy-group-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '시간표 접기' : '시간표 보기'}
        </button>
      </div>

      <RoomStatusGrid rooms={groupRoomSummaries} />

      {expanded && (
        <div className="policy-group-detail">
          <div className="policy-group-detail-grid">
            <WeekSlotGrid value={group.week_slots} readOnly />
          </div>
          <div className="policy-group-detail-rooms">
            <h5>적용 내무반 ({group.rooms.length})</h5>
            {group.rooms.length === 0 ? (
              <p className="policy-group-room-empty">해당하는 내무반이 없습니다.</p>
            ) : (
              <ul className="policy-group-room-list">
                {group.rooms.map((room) => (
                  <li key={room.room_code}>
                    {room.room_code} — {room.room_name || '(이름 없음)'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PolicyGroupBlock;
