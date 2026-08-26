import { useEffect, useState } from 'react';
import WeekSlotGrid from './WeekSlotGrid';
import RoomStatusGrid from './RoomStatusGrid';
import { createOverride, cancelOverride } from '../api/doorOverrides';
import '../styles/crud.css';
import './policyGroupBlock.css';

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반' };
const SLOT_MINUTES = 30;

function formatRemaining(ms) {
  if (ms <= 0) return '곧 변경';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분 후 변경`;
  return `${minutes}분 ${seconds}초 후 변경`;
}

// 지금 슬롯(30분)이 끝날 때까지 남은 시간(분, 올림) — 즉각 실행 지속 시간으로 사용.
function minutesUntilSlotEnd(now) {
  const secondsIntoSlot = (now.getUTCMinutes() % SLOT_MINUTES) * 60 + now.getUTCSeconds();
  const remainingSeconds = SLOT_MINUTES * 60 - secondsIntoSlot;
  return Math.min(SLOT_MINUTES, Math.max(1, Math.ceil(remainingSeconds / 60)));
}

function PolicyGroupBlock({ group, allRooms, activeOverrides, onOverrideChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pendingRoomCode, setPendingRoomCode] = useState(null);
  const [error, setError] = useState(null);
  const isGlobal = group.scope_type === 'global';
  const title = isGlobal
    ? '기본 정책 (전체 적용)'
    : `개별 정책 — ${SCOPE_TYPE_LABELS[group.scope_type] || group.scope_type} ${group.scope_code}`;

  const groupRoomCodes = new Set(group.rooms.map((room) => room.room_code));
  const groupRoomSummaries = allRooms.filter((room) => groupRoomCodes.has(room.room_code));
  const overridesByRoomCode = {};
  for (const override of activeOverrides) {
    if (groupRoomCodes.has(override.room_code)) {
      overridesByRoomCode[override.room_code] = override;
    }
  }
  const hasActiveOverride = Object.keys(overridesByRoomCode).length > 0;

  useEffect(() => {
    if (!group.next_change_at && !hasActiveOverride) return undefined;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [group.next_change_at, hasActiveOverride]);

  async function handleToggleRoom(roomCode) {
    setPendingRoomCode(roomCode);
    setError(null);
    try {
      const existing = overridesByRoomCode[roomCode];
      if (existing) {
        await cancelOverride(existing.id);
      } else {
        const doorCommand = group.currently_locked ? 'open' : 'lock';
        await createOverride(roomCode, doorCommand, minutesUntilSlotEnd(new Date()));
      }
      await onOverrideChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingRoomCode(null);
    }
  }

  return (
    <div className="policy-group-block">
      <div className="policy-group-header">
        <h4>{title}</h4>
        <span className={`badge ${group.currently_locked ? 'badge-offline' : 'badge-online'}`}>
          {group.currently_locked ? '잠김' : '열림 허용'}
        </span>
        {group.next_change_at && (
          <span className="policy-group-countdown">
            {formatRemaining(new Date(group.next_change_at) - now)}
          </span>
        )}
        <button type="button" className="policy-group-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '시간표 접기' : '시간표 보기'}
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <p className="policy-group-hint">
        내무반 타일을 클릭하면 지금 상태의 반대로 즉각 전환됩니다(남은 슬롯 시간만큼 적용, 다시 클릭하면 취소).
      </p>

      <RoomStatusGrid
        rooms={groupRoomSummaries}
        onSelectRoom={pendingRoomCode ? undefined : handleToggleRoom}
        overridesByRoomCode={overridesByRoomCode}
        now={now}
      />

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
