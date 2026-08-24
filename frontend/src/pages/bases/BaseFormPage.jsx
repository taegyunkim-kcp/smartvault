import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createBase, deleteBase, getBase, updateBase } from '../../api/bases';
import '../../styles/crud.css';

function BaseFormPage() {
  const { baseCode } = useParams();
  const isEditing = Boolean(baseCode);
  const navigate = useNavigate();

  const [form, setForm] = useState({ base_code: '', base_name: '' });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditing) return;
    getBase(baseCode)
      .then((base) => setForm({ base_code: base.base_code, base_name: base.base_name }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [baseCode, isEditing]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await updateBase(baseCode, { base_name: form.base_name.trim() });
      } else {
        await createBase({ base_code: form.base_code.trim(), base_name: form.base_name.trim() });
      }
      navigate('/bases');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${baseCode} 기지를 삭제하시겠습니까?`)) return;
    try {
      await deleteBase(baseCode);
      navigate('/bases');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '중대 수정' : '새 중대 등록'}</h2>

      {error && <div className="banner-error">{error}</div>}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="base_code">base_code</label>
          <input
            id="base_code"
            type="text"
            value={form.base_code}
            disabled={isEditing}
            required
            placeholder="예: 1CORPS"
            onChange={(e) => setForm((f) => ({ ...f, base_code: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="base_name">중대 이름 (base_name)</label>
          <input
            id="base_name"
            type="text"
            value={form.base_name}
            required
            onChange={(e) => setForm((f) => ({ ...f, base_name: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/bases')}>
            취소
          </button>
          {isEditing && (
            <button type="button" onClick={handleDelete}>
              삭제
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default BaseFormPage;
