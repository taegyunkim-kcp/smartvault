import { useEffect, useState } from 'react';
import WeekSlotGrid from './WeekSlotGrid';
import RoomStatusGrid from './RoomStatusGrid';
import { createOverride, cancelOverride } from '../api/doorOverrides';
import { addMember, removeMember, renamePolicy, updatePolicyContent, deletePolicy } from '../api/doorPolicies';
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

function scopeOptionsFor(scopeType, { bases, buildings, rooms }) {
  if (scopeType === 'base') {
    return bases.map((b) => ({ code: b.base_code, label: `${b.base_code} — ${b.base_name}` }));
  }
  if (scopeType === 'building') {
    return buildings.map((b) => ({ code: b.building_code, label: `${b.building_code} — ${b.building_name}` }));
  }
  return rooms.map((r) => ({ code: r.room_code, label: `${r.room_code} — ${r.room_name || '(이름 없음)'}` }));
}

function PolicyGroupBlock({
  group,
  allRooms,
  activeOverrides,
  onOverrideChanged,
  onPoliciesChanged,
  bases,
  buildings,
  rooms,
  templates,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pendingRoomCode, setPendingRoomCode] = useState(null);
  const [error, setError] = useState(null);
  const [nameDraft, setNameDraft] = useState(group.name);
  const [weekSlotsDraft, setWeekSlotsDraft] = useState(group.week_slots);
  const [saving, setSaving] = useState(false);
  const [newMemberScopeType, setNewMemberScopeType] = useState('room');
  const [newMemberScopeCode, setNewMemberScopeCode] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isGlobal = group.is_default;
  const title = isGlobal ? '기본 정책 (전체 적용)' : group.name;

  useEffect(() => {
    async function syncDraftsFromGroup() {
      setNameDraft(group.name);
      setWeekSlotsDraft(group.week_slots);
    }
    syncDraftsFromGroup();
  }, [group.name, group.week_slots]);

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

  function openEdit() {
    setEditing(true);
    setExpanded(false);
  }

  function openExpanded() {
    setExpanded((v) => !v);
    setEditing(false);
  }

  async function handleSaveContent() {
    setSaving(true);
    setError(null);
    try {
      if (!isGlobal && nameDraft !== group.name) {
        await renamePolicy(group.id, nameDraft);
      }
      await updatePolicyContent(group.id, weekSlotsDraft);
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!newMemberScopeCode) return;
    setSaving(true);
    setError(null);
    try {
      await addMember(group.id, newMemberScopeType, newMemberScopeCode);
      setNewMemberScopeCode('');
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(scopeType, scopeCode) {
    setSaving(true);
    setError(null);
    try {
      await removeMember(scopeType, scopeCode);
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePolicy() {
    if (!window.confirm(`"${group.name}" 정책을 삭제하시겠습니까?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deletePolicy(group.id);
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const roomCode = e.dataTransfer.getData('text/room-code');
    if (!roomCode) return;
    setError(null);
    try {
      if (isGlobal) {
        await removeMember('room', roomCode);
      } else {
        await addMember(group.id, 'room', roomCode);
      }
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className={`policy-group-block${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
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
        <button type="button" className="policy-group-toggle" onClick={openEdit}>
          {editing ? '편집 닫기' : '편집'}
        </button>
        <button type="button" className="policy-group-toggle" onClick={openExpanded}>
          {expanded ? '시간표 접기' : '시간표 보기'}
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <p className="policy-group-hint">
        내무반 타일을 클릭하면 지금 상태의 반대로 즉각 전환됩니다(남은 슬롯 시간만큼 적용, 다시 클릭하면 취소).
        다른 정책 카드로 드래그하면 그 정책으로 옮겨집니다.
      </p>

      <RoomStatusGrid
        rooms={groupRoomSummaries}
        onSelectRoom={pendingRoomCode || editing ? undefined : handleToggleRoom}
        overridesByRoomCode={overridesByRoomCode}
        now={now}
        draggable={!editing}
      />

      {editing && (
        <div className="policy-group-edit">
          {!isGlobal && (
            <div className="form-field">
              <label>정책 이름</label>
              <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            </div>
          )}

          <WeekSlotGrid value={weekSlotsDraft} onChange={setWeekSlotsDraft} />

          <div className="form-actions">
            <button type="button" className="primary" disabled={saving} onClick={handleSaveContent}>
              저장
            </button>
            <select
              value=""
              onChange={(e) => {
                const template = templates.find((t) => t.template_code === e.target.value);
                if (template) setWeekSlotsDraft(template.week_slots);
              }}
            >
              <option value="">템플릿에서 불러오기</option>
              {templates.map((t) => (
                <option key={t.template_code} value={t.template_code}>
                  {t.template_code} — {t.template_name}
                </option>
              ))}
            </select>
            {!isGlobal && (
              <button
                type="button"
                disabled={saving || group.direct_scopes.length > 0}
                onClick={handleDeletePolicy}
                title={group.direct_scopes.length > 0 ? '소속 조직/내무반이 있어 삭제할 수 없습니다' : undefined}
              >
                정책 삭제
              </button>
            )}
          </div>

          {!isGlobal && (
            <>
              <h5 className="policy-group-members-title">소속 조직/내무반</h5>
              {group.direct_scopes.length === 0 ? (
                <p className="policy-group-room-empty">직접 지정된 조직/내무반이 없습니다.</p>
              ) : (
                <ul className="policy-group-member-list">
                  {group.direct_scopes.map((scope) => (
                    <li key={`${scope.scope_type}:${scope.scope_code}`}>
                      <span>
                        {SCOPE_TYPE_LABELS[scope.scope_type]} {scope.scope_code}
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleRemoveMember(scope.scope_type, scope.scope_code)}
                      >
                        제거
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="page-toolbar">
                <select
                  value={newMemberScopeType}
                  onChange={(e) => {
                    setNewMemberScopeType(e.target.value);
                    setNewMemberScopeCode('');
                  }}
                >
                  <option value="base">중대</option>
                  <option value="building">소대</option>
                  <option value="room">내무반</option>
                </select>
                <select value={newMemberScopeCode} onChange={(e) => setNewMemberScopeCode(e.target.value)}>
                  <option value="">선택하세요</option>
                  {scopeOptionsFor(newMemberScopeType, { bases, buildings, rooms }).map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={saving || !newMemberScopeCode} onClick={handleAddMember}>
                  이 정책에 추가
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
