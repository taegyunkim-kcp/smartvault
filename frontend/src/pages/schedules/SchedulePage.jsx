import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBases } from '../../api/bases';
import { listBuildings } from '../../api/buildings';
import { listRooms } from '../../api/rooms';
import { listTemplates } from '../../api/doorScheduleTemplates';
import {
  deleteSchedule,
  getEffectivePolicy,
  getSchedule,
  resetFromTemplate,
  saveSchedule,
} from '../../api/doorSchedules';
import { createOverride, cancelOverride } from '../../api/doorOverrides';
import { getRoomSummaries } from '../../api/dashboard';
import WeekSlotGrid from '../../components/WeekSlotGrid';
import { emptyWeekSlots } from '../../components/weekSlots';
import '../../styles/crud.css';

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반' };
const DOOR_STATE_LABEL = { open: '열림', closed: '닫힘' };
const LOCK_STATE_LABEL = { locked: '잠김', unlocked: '열림 허용' };

function SchedulePage() {
  const [scopeType, setScopeType] = useState('room');
  const [scopeOptions, setScopeOptions] = useState([]);
  const [scopeCode, setScopeCode] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [directSchedule, setDirectSchedule] = useState(null);
  const [weekSlots, setWeekSlots] = useState(emptyWeekSlots());
  const [effectivePolicy, setEffectivePolicy] = useState(null);
  const [doorState, setDoorState] = useState(null);
  const [reportedLockState, setReportedLockState] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [allRooms, setAllRooms] = useState([]);
  const [pendingScopeCode, setPendingScopeCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message));
    getRoomSummaries()
      .then(setAllRooms)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    async function resetAndLoadOptions() {
      setDirectSchedule(null);
      setEffectivePolicy(null);
      setDoorState(null);
      setReportedLockState(null);

      try {
        const options =
          scopeType === 'base' ? await listBases() : scopeType === 'building' ? await listBuildings() : await listRooms();
        setScopeOptions(options);

        if (scopeType === 'room' && pendingScopeCode && options.some((o) => o.room_code === pendingScopeCode)) {
          setScopeCode(pendingScopeCode);
        } else {
          setScopeCode('');
        }
        setPendingScopeCode(null);
      } catch (err) {
        setError(err.message);
      }
    }

    resetAndLoadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeType]);

  function handleSelectRoomFromOverview(roomCode) {
    if (scopeType === 'room') {
      setScopeCode(roomCode);
    } else {
      setPendingScopeCode(roomCode);
      setScopeType('room');
    }
  }

  useEffect(() => {
    if (!scopeCode) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const schedule = await getSchedule(scopeType, scopeCode);
        setDirectSchedule(schedule);
        setWeekSlots(schedule ? schedule.week_slots : emptyWeekSlots());

        if (scopeType === 'room') {
          const policy = await getEffectivePolicy(scopeCode);
          setEffectivePolicy(policy);

          const room = scopeOptions.find((r) => r.room_code === scopeCode);
          if (room) {
            const roomSummaries = await getRoomSummaries(room.building_code);
            const summary = roomSummaries.find((r) => r.room_code === scopeCode);
            setDoorState(summary ? summary.last_door_state : null);
            setReportedLockState(summary ? summary.reported_lock_state : null);
          }
        } else {
          setEffectivePolicy(null);
          setDoorState(null);
          setReportedLockState(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [scopeType, scopeCode, scopeOptions]);

  async function refreshScopeData() {
    const schedule = await getSchedule(scopeType, scopeCode);
    setDirectSchedule(schedule);
    setWeekSlots(schedule ? schedule.week_slots : emptyWeekSlots());
    if (scopeType === 'room') {
      setEffectivePolicy(await getEffectivePolicy(scopeCode));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveSchedule(scopeType, scopeCode, weekSlots, directSchedule?.based_on_template);
      await refreshScopeData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetFromTemplate() {
    if (!selectedTemplate) return;
    setSaving(true);
    setError(null);
    try {
      await resetFromTemplate(scopeType, scopeCode, selectedTemplate);
      await refreshScopeData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDirect() {
    if (!window.confirm('이 스코프의 직접 설정을 삭제하고 상위 상속으로 되돌리시겠습니까?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteSchedule(scopeType, scopeCode);
      await refreshScopeData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateOverride() {
    setSaving(true);
    setError(null);
    try {
      await createOverride(scopeCode, Number(durationMinutes));
      setEffectivePolicy(await getEffectivePolicy(scopeCode));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelOverride() {
    if (!effectivePolicy?.active_override) return;
    setSaving(true);
    setError(null);
    try {
      await cancelOverride(effectivePolicy.active_override.id);
      setEffectivePolicy(await getEffectivePolicy(scopeCode));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const optionLabel = (option) => {
    if (scopeType === 'base') return `${option.base_code} — ${option.base_name}`;
    if (scopeType === 'building') return `${option.building_code} — ${option.building_name}`;
    return `${option.room_code} — ${option.room_name || '(이름 없음)'}`;
  };
  const optionCode = (option) => {
    if (scopeType === 'base') return option.base_code;
    if (scopeType === 'building') return option.building_code;
    return option.room_code;
  };

  return (
    <div>
      <h2>개폐 시간표 관리</h2>
      <p className="breadcrumb">
        정책 템플릿은 <Link to="/schedule-templates">여기서</Link> 미리 만들어 두면 환원 시 선택할 수 있습니다.
      </p>

      {error && <div className="banner-error">{error}</div>}

      <h3 className="section-title">전체 내무반 현황</h3>
      {allRooms.length === 0 ? (
        <div className="empty-state">등록된 내무반이 없습니다.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>내무반</th>
              <th>소속 소대</th>
              <th>문 상태</th>
              <th>개폐 설정</th>
            </tr>
          </thead>
          <tbody>
            {allRooms.map((room) => (
              <tr key={room.room_code} onClick={() => handleSelectRoomFromOverview(room.room_code)}>
                <td>
                  {room.room_code} — {room.room_name}
                </td>
                <td>{room.building_code}</td>
                <td>{room.last_door_state ? DOOR_STATE_LABEL[room.last_door_state] : '-'}</td>
                <td>
                  {room.reported_lock_state ? (
                    <span
                      className={`badge ${room.reported_lock_state === 'unlocked' ? 'badge-online' : 'badge-offline'}`}
                    >
                      {LOCK_STATE_LABEL[room.reported_lock_state]}
                    </span>
                  ) : (
                    '미보고'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="section-title">정책 편집</h3>
      <div className="page-toolbar">
        <select
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value)}
        >
          <option value="base">중대 단위</option>
          <option value="building">소대 단위</option>
          <option value="room">내무반 단위</option>
        </select>
        <select value={scopeCode} onChange={(e) => setScopeCode(e.target.value)}>
          <option value="">{SCOPE_TYPE_LABELS[scopeType]} 선택</option>
          {scopeOptions.map((option) => (
            <option key={optionCode(option)} value={optionCode(option)}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>불러오는 중...</p>}

      {!loading && scopeCode && (
        <>
          {scopeType === 'room' && (
            <div className="page-toolbar">
              <span>
                현재 적용 정책:{' '}
                {effectivePolicy?.effective_schedule
                  ? `${effectivePolicy.effective_schedule.scope_type}(${effectivePolicy.effective_schedule.scope_code})에서 상속`
                  : '없음'}
              </span>
              <span className="spacer" />
              <span>
                게이트웨이 보고 설정:{' '}
                {reportedLockState ? (
                  <span className={`badge ${reportedLockState === 'unlocked' ? 'badge-online' : 'badge-offline'}`}>
                    {LOCK_STATE_LABEL[reportedLockState]}
                  </span>
                ) : (
                  '미보고'
                )}
              </span>
              <span className="spacer" />
              <span>
                실제 도어 상태:{' '}
                <span className={`badge ${doorState === 'open' ? 'badge-online' : 'badge-offline'}`}>
                  {doorState ? DOOR_STATE_LABEL[doorState] : '기록 없음'}
                </span>
              </span>
            </div>
          )}

          <h3 className="section-title">
            {SCOPE_TYPE_LABELS[scopeType]} 직접 설정 {directSchedule ? '' : '(현재 없음 — 상위 상속 적용 중)'}
          </h3>
          <WeekSlotGrid value={weekSlots} onChange={setWeekSlots} />

          <div className="form-actions">
            <button type="button" className="primary" disabled={saving} onClick={handleSave}>
              저장 (실시간 설정)
            </button>
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">템플릿 선택</option>
              {templates.map((t) => (
                <option key={t.template_code} value={t.template_code}>
                  {t.template_code} — {t.template_name}
                </option>
              ))}
            </select>
            <button type="button" disabled={saving || !selectedTemplate} onClick={handleResetFromTemplate}>
              기본 정책으로 환원
            </button>
            {directSchedule && (
              <button type="button" disabled={saving} onClick={handleDeleteDirect}>
                직접 설정 삭제
              </button>
            )}
          </div>

          {scopeType === 'room' && (
            <>
              <h3 className="section-title">즉각 실행</h3>
              {effectivePolicy?.active_override ? (
                <div className="page-toolbar">
                  <span>
                    활성 즉각 개방 — {effectivePolicy.active_override.expires_at}까지
                  </span>
                  <button type="button" disabled={saving} onClick={handleCancelOverride}>
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
                  <button type="button" className="primary" disabled={saving} onClick={handleCreateOverride}>
                    즉시 개방
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SchedulePage;
