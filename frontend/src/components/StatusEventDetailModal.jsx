import { useEffect, useState } from 'react';
import { acknowledgeStatusEvent, getStatusEventDetail } from '../api/dashboard';
import { formatDateTime } from '../utils/formatDateTime';
import { STATUS_TYPE_LABELS, describeAdminActionTarget } from '../utils/statusEvents';
import '../styles/crud.css';
import './templateManagerModal.css';

const RFID_EVENT_TYPE_LABEL = { check_in: '체크인', check_out: '체크아웃', unknown: '알수없음' };
const LOCK_STATE_LABEL = { locked: '잠김', unlocked: '열림 허용' };
const DOOR_STATE_LABEL = { open: '열림', closed: '닫힘' };

function StatusEventDetailModal({ eventId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStatusEventDetail(eventId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleAcknowledge() {
    setAcking(true);
    setError(null);
    try {
      const updated = await acknowledgeStatusEvent(eventId);
      onClose(true, updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setAcking(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>이벤트 상세</h3>
          <button type="button" className="modal-close" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        {loading && <p>불러오는 중...</p>}

        {!loading && detail && (
          <>
            <dl className="detail-grid">
              <dt>유형</dt>
              <dd>{STATUS_TYPE_LABELS[detail.event.status_type] || detail.event.status_type}</dd>
              <dt>대상</dt>
              <dd>
                {detail.person
                  ? `${detail.person.name} (${detail.person.service_number})`
                  : detail.event.status_type === 'admin_action'
                    ? describeAdminActionTarget(detail.event.detail)
                    : detail.event.rfid_uid || '-'}
              </dd>
              <dt>내무반</dt>
              <dd>{detail.event.room_code || '-'}</dd>
              <dt>발생 시각</dt>
              <dd>{formatDateTime(detail.event.occurred_at)}</dd>
              {detail.event.acknowledged_at && (
                <>
                  <dt>확인 시각</dt>
                  <dd>{formatDateTime(detail.event.acknowledged_at)}</dd>
                </>
              )}
            </dl>

            <h4 className="section-title">상세 내용</h4>
            <p className="reason-text">{detail.reason}</p>

            <h4 className="section-title">보관함(내무반) 상태</h4>
            {detail.room_status ? (
              <div className="page-toolbar">
                <span>
                  문 상태:{' '}
                  <span
                    className={`badge ${detail.room_status.last_door_state === 'open' ? 'badge-online' : 'badge-offline'}`}
                  >
                    {detail.room_status.last_door_state
                      ? DOOR_STATE_LABEL[detail.room_status.last_door_state]
                      : '기록 없음'}
                  </span>
                </span>
                <span className="spacer" />
                <span>
                  게이트웨이 보고:{' '}
                  {detail.room_status.reported_lock_state
                    ? LOCK_STATE_LABEL[detail.room_status.reported_lock_state]
                    : '미보고'}
                </span>
                <span className="spacer" />
                <span>
                  서버 계획:{' '}
                  {detail.room_status.scheduled_lock_state
                    ? LOCK_STATE_LABEL[detail.room_status.scheduled_lock_state]
                    : '정책 없음'}
                </span>
              </div>
            ) : (
              <p>방 상태 정보를 확인할 수 없습니다.</p>
            )}

            {detail.event.status_type !== 'admin_action' && (
              <>
                <h4 className="section-title">대상 UID 최근 이력</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>시각</th>
                      <th>게이트웨이</th>
                      <th>유형</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.uid_history.length === 0 && (
                      <tr>
                        <td colSpan={3}>기록된 이벤트가 없습니다.</td>
                      </tr>
                    )}
                    {detail.uid_history.map((ev) => (
                      <tr key={ev.id}>
                        <td>{formatDateTime(ev.occurred_at)}</td>
                        <td>{ev.gateway_id}</td>
                        <td>{RFID_EVENT_TYPE_LABEL[ev.event_type] || ev.event_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="form-actions">
              {detail.event.acknowledged_at ? (
                <span className="field-hint">이미 확인 처리됨</span>
              ) : (
                <button type="button" className="primary" disabled={acking} onClick={handleAcknowledge}>
                  확인 완료
                </button>
              )}
              <button type="button" onClick={() => onClose(false)}>
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StatusEventDetailModal;
