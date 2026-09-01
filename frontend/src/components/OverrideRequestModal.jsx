import { useState } from 'react';
import '../styles/crud.css';
import './templateManagerModal.css';

const COMMAND_LABEL = { open: '즉각 개방', lock: '즉각 잠금' };

// 내무반 타일을 클릭해 즉각 개방/잠금을 "시작"할 때 신청자/승인자/사유를 입력받아
// door_overrides 이벤트에 함께 기록한다. 취소(다시 클릭)는 별도 입력 없이 즉시 처리된다.
function OverrideRequestModal({ roomCode, doorCommand, onSubmit, onClose }) {
  const [applicant, setApplicant] = useState('');
  const [approver, setApprover] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = applicant.trim() && approver.trim() && reason.trim();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ applicant: applicant.trim(), approver: approver.trim(), reason: reason.trim() });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>
            {roomCode} — {COMMAND_LABEL[doorCommand] || doorCommand}
          </h3>
          <button type="button" className="modal-close" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="crud-form">
            <div className="form-field">
              <label htmlFor="override_applicant">신청자</label>
              <input
                id="override_applicant"
                type="text"
                value={applicant}
                required
                autoFocus
                onChange={(e) => setApplicant(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="override_approver">승인자</label>
              <input
                id="override_approver"
                type="text"
                value={approver}
                required
                onChange={(e) => setApprover(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="override_reason">사유</label>
              <input
                id="override_reason"
                type="text"
                value={reason}
                required
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary" disabled={saving || !canSubmit}>
              {COMMAND_LABEL[doorCommand] || '실행'}
            </button>
            <button type="button" onClick={() => onClose(false)}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OverrideRequestModal;
