import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from '../../api/doorScheduleTemplates';
import WeekSlotGrid from '../../components/WeekSlotGrid';
import { emptyWeekSlots } from '../../components/weekSlots';
import '../../styles/crud.css';

function TemplateFormPage() {
  const { templateCode } = useParams();
  const isEditing = Boolean(templateCode);
  const navigate = useNavigate();

  const [form, setForm] = useState({ template_code: '', template_name: '' });
  const [weekSlots, setWeekSlots] = useState(emptyWeekSlots());
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditing) return;
    getTemplate(templateCode)
      .then((template) => {
        setForm({ template_code: template.template_code, template_name: template.template_name });
        setWeekSlots(template.week_slots);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [templateCode, isEditing]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await updateTemplate(templateCode, { template_name: form.template_name.trim(), week_slots: weekSlots });
      } else {
        await createTemplate({
          template_code: form.template_code.trim(),
          template_name: form.template_name.trim(),
          week_slots: weekSlots,
        });
      }
      navigate('/schedule-templates');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${templateCode} 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await deleteTemplate(templateCode);
      navigate('/schedule-templates');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '템플릿 수정' : '새 템플릿 등록'}</h2>

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="crud-form" style={{ maxWidth: 420 }}>
          <div className="form-field">
            <label htmlFor="template_code">template_code</label>
            <input
              id="template_code"
              type="text"
              value={form.template_code}
              disabled={isEditing}
              required
              placeholder="예: DEFAULT"
              onChange={(e) => setForm((f) => ({ ...f, template_code: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label htmlFor="template_name">이름</label>
            <input
              id="template_name"
              type="text"
              value={form.template_name}
              required
              onChange={(e) => setForm((f) => ({ ...f, template_name: e.target.value }))}
            />
          </div>
        </div>

        <WeekSlotGrid value={weekSlots} onChange={setWeekSlots} />

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/schedule-templates')}>
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

export default TemplateFormPage;
