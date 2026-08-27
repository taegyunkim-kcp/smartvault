import { useEffect, useState } from 'react';
import WeekSlotGrid from './WeekSlotGrid';
import RoomStatusGrid from './RoomStatusGrid';
import { createOverride, cancelOverride } from '../api/doorOverrides';
import {
  addMember,
  removeMember,
  renamePolicy,
  updatePolicyContent,
  deletePolicy,
  saveTempPolicy,
  cancelTempPolicy,
} from '../api/doorPolicies';
import { formatDateTime } from '../utils/formatDateTime';
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
  const [tempDraft, setTempDraft] = useState(group.active_temp ? group.active_temp.week_slots : group.week_slots);
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
      setTempDraft(group.active_temp ? group.active_temp.week_slots : group.week_slots);
    }
    syncDraftsFromGroup();
  }, [group.name, group.week_slots, group.active_temp]);

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
    setEditing((v) => !v);
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
    const confirmMessage =
      group.direct_scopes.length > 0
        ? `"${group.name}" 정책을 삭제하시겠습니까? 소속된 조직/내무반(${group.direct_scopes.length}개)은 기본 정책으로 자동 복귀합니다.`
        : `"${group.name}" 정책을 삭제하시겠습니까?`;
    if (!window.confirm(confirmMessage)) return;
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

  // 이 카드가 실제로 적용된 조직/방(기본 정책이면 global까지) 목록 — 임시정책 적용/취소 대상.
  function tempTargetScopes() {
    return isGlobal ? [...group.direct_scopes, { scope_type: 'global', scope_code: 'ALL' }] : group.direct_scopes;
  }

  // "시간표 보기"에서 칸을 여러 개 선택해두고 누르는 버튼 — 정책 자체(편집/저장)는 그대로 두고,
  // 지금까지 고른 슬롯 조합을 이 정책의 소속 조직/방 전체에 이번 주만 유효한 임시정책으로 적용한다.
  async function handleApplyTempDraft() {
    const scopes = tempTargetScopes();
    if (scopes.length === 0) {
      setError('이 정책에 속한 조직/내무반이 없어 임시정책을 적용할 수 없습니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const scope of scopes) {
        await saveTempPolicy(scope.scope_type, scope.scope_code, tempDraft);
      }
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 별도 UI로 만들어진 임시정책 카드(group.is_temp)는 자기 scope 하나를 취소하고,
  // 정책 카드 안에 인라인으로 뜬 임시정책(group.active_temp)은 그 정책의 소속 스코프 전체를 취소한다.
  async function handleCancelActiveTemp() {
    const scopes = group.is_temp
      ? [{ scope_type: group.scope_type, scope_code: group.scope_code }]
      : tempTargetScopes();
    setSaving(true);
    setError(null);
    try {
      for (const scope of scopes) {
        await cancelTempPolicy(scope.scope_type, scope.scope_code);
      }
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (group.is_temp) return;
    const roomCode = e.dataTransfer.getData('text/room-code');
    if (!roomCode) return;
    setError(null);
    try {
      // 기본 정책도 door_policies 행 하나일 뿐이라 그냥 addMember로 처리한다 — 상속으로만
      // 이 카드에 있던 방(자기 소속 scope 행이 없는 방)을 드래그해도 명시적으로 새 행이
      // 생기면서 확실히 옮겨진다(removeMember는 지울 행이 애초에 없으면 조용히 아무 효과가 없었음).
      await addMember(group.id, 'room', roomCode);
      await onPoliciesChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className={`policy-group-block${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        if (group.is_temp) return;
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
        {!group.is_temp && group.active_temp && <span className="badge badge-temp">임시정책 적용 중</span>}
        {group.next_change_at && (
          <span className="policy-group-countdown">
            {formatRemaining(new Date(group.next_change_at) - now)}
          </span>
        )}
        {!group.is_temp && (
          <button type="button" className="policy-group-toggle" onClick={openEdit}>
            {editing ? '편집 닫기' : '편집'}
          </button>
        )}
        <button type="button" className="policy-group-toggle" onClick={openExpanded}>
          {expanded ? '시간표 접기' : '시간표 보기'}
        </button>
        {group.is_temp && (
          <button type="button" className="policy-group-toggle" disabled={saving} onClick={handleCancelActiveTemp}>
            지금 취소
          </button>
        )}
      </div>

      {error && <div className="banner-error">{error}</div>}

      <p className="policy-group-hint">
        {group.is_temp
          ? `이번 주 임시정책 — ${formatDateTime(group.valid_until)}까지 적용되고 다음 주부터 원래 정책으로 자동 복귀합니다.`
          : '내무반 타일을 클릭하면 지금 상태의 반대로 즉각 전환됩니다(남은 슬롯 시간만큼 적용, 다시 클릭하면 취소). 다른 정책 카드로 드래그하면 그 정책으로 옮겨집니다.'}
      </p>

      <RoomStatusGrid
        rooms={groupRoomSummaries}
        onSelectRoom={pendingRoomCode || editing ? undefined : handleToggleRoom}
        overridesByRoomCode={overridesByRoomCode}
        now={now}
        draggable={!editing && !group.is_temp}
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
              <button type="button" disabled={saving} onClick={handleDeletePolicy}>
                정책 삭제
              </button>
            )}
          </div>

          <div className="policy-group-members">
            <h5 className="policy-group-members-title">
              {isGlobal ? '명시적으로 지정된 조직/내무반' : '소속 조직/내무반'}
            </h5>
            {group.direct_scopes.length === 0 ? (
              <p className="policy-group-room-empty">
                {isGlobal
                  ? '명시적으로 지정된 조직/내무반이 없습니다 — 다른 정책에 속하지 않은 나머지가 전부 여기 해당합니다.'
                  : '직접 지정된 조직/내무반이 없습니다.'}
              </p>
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
          </div>
        </div>
      )}

      {expanded && (
        <div className="policy-group-detail">
          <div className="policy-group-detail-grid">
            {!group.is_temp && group.active_temp && (
              <div className="policy-group-temp-banner">
                <span>
                  이번 주 임시정책 적용 중 — {formatDateTime(group.active_temp.valid_until)}까지(다음 주부터 원래
                  정책 복귀)
                </span>
                <button type="button" disabled={saving} onClick={handleCancelActiveTemp}>
                  지금 취소
                </button>
              </div>
            )}

            <WeekSlotGrid
              value={group.is_temp ? group.week_slots : tempDraft}
              readOnly={group.is_temp}
              onChange={group.is_temp ? undefined : setTempDraft}
              tempMode={group.is_temp}
              baseValue={group.is_temp ? undefined : group.week_slots}
            />

            {!group.is_temp && (
              <>
                <p className="policy-group-hint">
                  여기서 여러 칸을 골라두고(주황색) "임시정책으로 적용"을 누르면 정책 자체는 그대로 두고 이번
                  주만 그 내용으로 적용됩니다. 정책 내용을 영구적으로 바꾸려면 "편집"을 사용하세요.
                </p>
                <div className="form-actions">
                  <button type="button" className="primary" disabled={saving} onClick={handleApplyTempDraft}>
                    임시정책으로 적용
                  </button>
                </div>
              </>
            )}
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
