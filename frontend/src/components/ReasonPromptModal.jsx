import { useState } from 'react';
import '../styles/crud.css';
import './templateManagerModal.css';

// 정책 소속 변경(드래그이동/멤버 추가삭제)과 임시정책 저장/취소 시 사유를 입력받는 공용 모달.
// "작업자(관리자)"는 로그인 도입 전까지는 입력받지 않고 서버가 null로 기록한다.
function ReasonPromptModal({ title, description, submitLabel = '확인', onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
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
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {description && <p className="policy-group-hint">{description}</p>}
        {error && <div className="banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="crud-form">
            <div className="form-field">
              <label htmlFor="reason_prompt_reason">사유</label>
              <input
                id="reason_prompt_reason"
                type="text"
                value={reason}
                required
                autoFocus
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary" disabled={saving || !reason.trim()}>
              {submitLabel}
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

export default ReasonPromptModal;
