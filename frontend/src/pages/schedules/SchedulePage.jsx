import { useEffect, useState } from 'react';
import { listBases } from '../../api/bases';
import { listBuildings } from '../../api/buildings';
import { listRooms } from '../../api/rooms';
import { listTemplates } from '../../api/doorScheduleTemplates';
import {
  cancelTempPolicy,
  createPolicy,
  getEffectivePolicy,
  getTempPolicy,
  listActiveTempPolicyGroups,
  listPolicies,
  saveTempPolicy,
} from '../../api/doorPolicies';
import { createOverride, cancelOverride, listActiveOverrides } from '../../api/doorOverrides';
import { getRoomSummaries } from '../../api/dashboard';
import WeekSlotGrid from '../../components/WeekSlotGrid';
import RoomStatusGrid from '../../components/RoomStatusGrid';
import TemplateManagerModal from '../../components/TemplateManagerModal';
import PolicyGroupBlock from '../../components/PolicyGroupBlock';
import { emptyWeekSlots } from '../../components/weekSlots';
import { formatDateTime } from '../../utils/formatDateTime';
import '../../styles/crud.css';

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반', global: '전체' };
const DOOR_STATE_LABEL = { open: '열림', closed: '닫힘' };
const LOCK_STATE_LABEL = { locked: '잠김', unlocked: '열림 허용' };

function SchedulePage() {
  const [bases, setBases] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [policyGroups, setPolicyGroups] = useState([]);
  const [tempPolicyGroups, setTempPolicyGroups] = useState([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [activeOverrides, setActiveOverrides] = useState([]);

  const [tempScopeType, setTempScopeType] = useState('room');
  const [tempScopeCode, setTempScopeCode] = useState('');
  const [tempWeekSlots, setTempWeekSlots] = useState(emptyWeekSlots());
  const [activeTempPolicy, setActiveTempPolicy] = useState(null);
  const [tempDoorState, setTempDoorState] = useState(null);
  const [tempReportedLockState, setTempReportedLockState] = useState(null);
  const [tempActiveOverride, setTempActiveOverride] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [overrideApplicant, setOverrideApplicant] = useState('');
  const [overrideApprover, setOverrideApprover] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [tempPolicyReason, setTempPolicyReason] = useState('');
  const [tempLoading, setTempLoading] = useState(false);
  const [tempSaving, setTempSaving] = useState(false);
  const [tempError, setTempError] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function loadActiveOverrides() {
    return listActiveOverrides()
      .then(setActiveOverrides)
      .catch((err) => setError(err.message));
  }

  // 내무반 타일의 좌측 하단 각(scheduled_lock_state)은 allRooms에서 오는데, 정책 소속이
  // 바뀌는 동작(드래그 이동, 멤버 추가/제거, 임시정책 적용/취소, 정책 삭제·편집)이 일어나도
  // allRooms를 같이 갱신하지 않으면 카드는 새 정책으로 옮겨졌는데 타일은 예전 정책 기준
  // 상태를 계속 보여줘서, 같은 정책 안의 내무반끼리 서로 다른 각으로 보이는 문제가 있었다.
  function reloadPolicies() {
    return Promise.all([listPolicies(), listActiveTempPolicyGroups(), getRoomSummaries()])
      .then(([groups, tempGroups, roomSummaries]) => {
        setPolicyGroups(groups);
        setTempPolicyGroups(tempGroups);
        setAllRooms(roomSummaries);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [baseList, buildingList, roomList, roomSummaries, templateList, groups, tempGroups] = await Promise.all([
          listBases(),
          listBuildings(),
          listRooms(),
          getRoomSummaries(),
          listTemplates(),
          listPolicies(),
          listActiveTempPolicyGroups(),
        ]);
        setBases(baseList);
        setBuildings(buildingList);
        setRooms(roomList);
        setAllRooms(roomSummaries);
        setTemplates(templateList);
        setPolicyGroups(groups);
        setTempPolicyGroups(tempGroups);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    loadActiveOverrides();
  }, []);

  function handleCloseTemplateModal(changed) {
    setShowTemplateModal(false);
    if (changed) {
      listTemplates()
        .then(setTemplates)
        .catch((err) => setError(err.message));
    }
  }

  async function handleCreatePolicy() {
    if (!newPolicyName.trim()) return;
    setCreatingPolicy(true);
    setError(null);
    try {
      await createPolicy(newPolicyName.trim());
      setNewPolicyName('');
      await reloadPolicies();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingPolicy(false);
    }
  }

  function handleTempScopeTypeChange(nextType) {
    setTempScopeType(nextType);
    setTempScopeCode(nextType === 'global' ? 'ALL' : '');
  }

  function handleSelectRoomFromOverview(roomCode) {
    setTempScopeType('room');
    setTempScopeCode(roomCode);
  }

  useEffect(() => {
    async function resetTempSectionState() {
      setTempWeekSlots(emptyWeekSlots());
      setActiveTempPolicy(null);
      setTempDoorState(null);
      setTempReportedLockState(null);
      setTempActiveOverride(null);
    }

    if (!tempScopeCode) {
      resetTempSectionState();
      return;
    }

    async function load() {
      setTempLoading(true);
      setTempError(null);
      try {
        const existing = await getTempPolicy(tempScopeType, tempScopeCode);
        setActiveTempPolicy(existing);

        if (tempScopeType === 'room') {
          const policy = await getEffectivePolicy(tempScopeCode);
          setTempActiveOverride(policy.active_override);
          if (!existing) {
            setTempWeekSlots(policy.effective_schedule ? policy.effective_schedule.week_slots : emptyWeekSlots());
          }

          const room = rooms.find((r) => r.room_code === tempScopeCode);
          if (room) {
            const summaries = await getRoomSummaries(room.building_code);
            const summary = summaries.find((r) => r.room_code === tempScopeCode);
            setTempDoorState(summary ? summary.last_door_state : null);
            setTempReportedLockState(summary ? summary.reported_lock_state : null);
          }
        } else {
          setTempActiveOverride(null);
          setTempDoorState(null);
          setTempReportedLockState(null);
          if (!existing) setTempWeekSlots(emptyWeekSlots());
        }

        if (existing) setTempWeekSlots(existing.week_slots);
      } catch (err) {
        setTempError(err.message);
      } finally {
        setTempLoading(false);
      }
    }

    load();
  }, [tempScopeType, tempScopeCode, rooms]);

  async function handleSaveTempPolicy() {
    setTempSaving(true);
    setTempError(null);
    try {
      const saved = await saveTempPolicy(tempScopeType, tempScopeCode, tempWeekSlots, tempPolicyReason.trim());
      setActiveTempPolicy(saved);
      setTempPolicyReason('');
      await reloadPolicies();
    } catch (err) {
      setTempError(err.message);
    } finally {
      setTempSaving(false);
    }
  }

  async function handleCancelTempPolicy() {
    setTempSaving(true);
    setTempError(null);
    try {
      await cancelTempPolicy(tempScopeType, tempScopeCode, tempPolicyReason.trim());
      setTempPolicyReason('');
      setActiveTempPolicy(null);
      if (tempScopeType === 'room') {
        const policy = await getEffectivePolicy(tempScopeCode);
        setTempWeekSlots(policy.effective_schedule ? policy.effective_schedule.week_slots : emptyWeekSlots());
      } else {
        setTempWeekSlots(emptyWeekSlots());
      }
      await reloadPolicies();
    } catch (err) {
      setTempError(err.message);
    } finally {
      setTempSaving(false);
    }
  }

  async function handleCreateOverride() {
    setTempSaving(true);
    setTempError(null);
    try {
      await createOverride(tempScopeCode, 'open', Number(durationMinutes), {
        applicant: overrideApplicant.trim(),
        approver: overrideApprover.trim(),
        reason: overrideReason.trim(),
      });
      const policy = await getEffectivePolicy(tempScopeCode);
      setTempActiveOverride(policy.active_override);
      setOverrideApplicant('');
      setOverrideApprover('');
      setOverrideReason('');
      await loadActiveOverrides();
    } catch (err) {
      setTempError(err.message);
    } finally {
      setTempSaving(false);
    }
  }

  async function handleCancelOverride() {
    if (!tempActiveOverride) return;
    setTempSaving(true);
    setTempError(null);
    try {
      await cancelOverride(tempActiveOverride.id);
      const policy = await getEffectivePolicy(tempScopeCode);
      setTempActiveOverride(policy.active_override);
      await loadActiveOverrides();
    } catch (err) {
      setTempError(err.message);
    } finally {
      setTempSaving(false);
    }
  }

  const tempScopeOptions =
    tempScopeType === 'base'
      ? bases.map((b) => ({ code: b.base_code, label: `${b.base_code} — ${b.base_name}` }))
      : tempScopeType === 'building'
        ? buildings.map((b) => ({ code: b.building_code, label: `${b.building_code} — ${b.building_name}` }))
        : tempScopeType === 'room'
          ? rooms.map((r) => ({ code: r.room_code, label: `${r.room_code} — ${r.room_name || '(이름 없음)'}` }))
          : [];

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>보관함 개폐 관리/제어</h2>
      <p className="breadcrumb">
        정책 템플릿은{' '}
        <button type="button" className="link-button" onClick={() => setShowTemplateModal(true)}>
          여기서
        </button>{' '}
        미리 만들어 두면 환원 시 선택할 수 있습니다.
      </p>

      {error && <div className="banner-error">{error}</div>}

      <h3 className="section-title">현재 정책 적용 현황</h3>
      <div className="page-toolbar">
        <input
          type="text"
          placeholder="새 정책 이름"
          value={newPolicyName}
          onChange={(e) => setNewPolicyName(e.target.value)}
        />
        <button
          type="button"
          className="primary"
          disabled={creatingPolicy || !newPolicyName.trim()}
          onClick={handleCreatePolicy}
        >
          + 새 정책
        </button>
      </div>
      {[...policyGroups, ...tempPolicyGroups].map((group) => (
        <PolicyGroupBlock
          key={group.id}
          group={group}
          allRooms={allRooms}
          activeOverrides={activeOverrides}
          onOverrideChanged={loadActiveOverrides}
          onPoliciesChanged={reloadPolicies}
          bases={bases}
          buildings={buildings}
          rooms={rooms}
          templates={templates}
        />
      ))}

      <h3 className="section-title">전체 내무반 현황</h3>
      <RoomStatusGrid rooms={allRooms} onSelectRoom={handleSelectRoomFromOverview} />

      <h3 className="section-title">임시 정책 적용 (이번 주만)</h3>
      <p className="breadcrumb">
        저장 즉시 적용되고, 이번 주가 끝나면(다음 일요일 0시) 자동으로 원래 정책으로 돌아갑니다.
      </p>

      <div className="page-toolbar">
        <select value={tempScopeType} onChange={(e) => handleTempScopeTypeChange(e.target.value)}>
          <option value="base">중대 단위</option>
          <option value="building">소대 단위</option>
          <option value="room">내무반 단위</option>
          <option value="global">전체</option>
        </select>
        {tempScopeType !== 'global' && (
          <select value={tempScopeCode} onChange={(e) => setTempScopeCode(e.target.value)}>
            <option value="">{SCOPE_TYPE_LABELS[tempScopeType]} 선택</option>
            {tempScopeOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {tempError && <div className="banner-error">{tempError}</div>}

      {tempScopeCode && (
        <>
          {tempScopeType === 'room' && (
            <div className="page-toolbar">
              <span>
                게이트웨이 보고 설정:{' '}
                {tempReportedLockState ? (
                  <span className={`badge ${tempReportedLockState === 'unlocked' ? 'badge-online' : 'badge-offline'}`}>
                    {LOCK_STATE_LABEL[tempReportedLockState]}
                  </span>
                ) : (
                  '미보고'
                )}
              </span>
              <span className="spacer" />
              <span>
                실제 도어 상태:{' '}
                <span className={`badge ${tempDoorState === 'open' ? 'badge-online' : 'badge-offline'}`}>
                  {tempDoorState ? DOOR_STATE_LABEL[tempDoorState] : '기록 없음'}
                </span>
              </span>
            </div>
          )}

          {tempLoading ? (
            <p>불러오는 중...</p>
          ) : (
            <>
              {activeTempPolicy && (
                <div className="page-toolbar">
                  <span>활성 임시정책 — {formatDateTime(activeTempPolicy.valid_until)}까지(다음 주부터 원래 정책 복귀)</span>
                  <button
                    type="button"
                    disabled={tempSaving || !tempPolicyReason.trim()}
                    onClick={handleCancelTempPolicy}
                  >
                    지금 취소
                  </button>
                </div>
              )}

              <WeekSlotGrid value={tempWeekSlots} onChange={setTempWeekSlots} tempMode />

              <div className="form-actions">
                <input
                  type="text"
                  placeholder="사유"
                  value={tempPolicyReason}
                  onChange={(e) => setTempPolicyReason(e.target.value)}
                  style={{ width: 200 }}
                />
                <button
                  type="button"
                  className="primary"
                  disabled={tempSaving || !tempPolicyReason.trim()}
                  onClick={handleSaveTempPolicy}
                >
                  이번 주만 임시 적용
                </button>
              </div>
            </>
          )}

          {tempScopeType === 'room' && !tempLoading && (
            <>
              <h3 className="section-title">즉각 실행</h3>
              {tempActiveOverride ? (
                <div className="page-toolbar">
                  <span>활성 즉각 개방 — {formatDateTime(tempActiveOverride.expires_at)}까지</span>
                  <button type="button" disabled={tempSaving} onClick={handleCancelOverride}>
                    취소
                  </button>
                </div>
              ) : (
                <div className="page-toolbar">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{ width: 80 }}
                  />
                  <span>분 동안</span>
                  <input
                    type="text"
                    placeholder="신청자"
                    value={overrideApplicant}
                    onChange={(e) => setOverrideApplicant(e.target.value)}
                    style={{ width: 100 }}
                  />
                  <input
                    type="text"
                    placeholder="승인자"
                    value={overrideApprover}
                    onChange={(e) => setOverrideApprover(e.target.value)}
                    style={{ width: 100 }}
                  />
                  <input
                    type="text"
                    placeholder="사유"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    style={{ width: 160 }}
                  />
                  <button
                    type="button"
                    className="primary"
                    disabled={
                      tempSaving || !overrideApplicant.trim() || !overrideApprover.trim() || !overrideReason.trim()
                    }
                    onClick={handleCreateOverride}
                  >
                    즉시 개방
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showTemplateModal && <TemplateManagerModal onClose={handleCloseTemplateModal} />}
    </div>
  );
}

export default SchedulePage;
