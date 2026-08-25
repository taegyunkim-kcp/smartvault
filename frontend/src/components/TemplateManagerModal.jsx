import { useEffect, useState } from 'react';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../api/doorScheduleTemplates';
import WeekSlotGrid from './WeekSlotGrid';
import { emptyWeekSlots } from './weekSlots';
import '../styles/crud.css';
import './templateManagerModal.css';

function TemplateManagerModal({ onClose }) {
  const [view, setView] = useState('list');
  const [templates, setTemplates] = useState([]);
  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState({ template_code: '', template_name: '' });
  const [weekSlots, setWeekSlots] = useState(emptyWeekSlots());
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function loadTemplates() {
    setLoading(true);
    setError(null);
    return listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    (async () => {
      await loadTemplates();
    })();
  }, []);

  function openNew() {
    setEditingCode(null);
    setForm({ template_code: '', template_name: '' });
    setWeekSlots(emptyWeekSlots());
    setError(null);
    setView('form');
  }

  function openEdit(templateCode) {
    setEditingCode(templateCode);
    setError(null);
    setLoading(true);
    getTemplate(templateCode)
      .then((template) => {
        setForm({ template_code: template.template_code, template_name: template.template_name });
        setWeekSlots(template.week_slots);
        setView('form');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleDeleteFromList(event, templateCode) {
    event.stopPropagation();
    if (!window.confirm(`${templateCode} 템플릿을 삭제하시겠습니까?`)) return;

    try {
      await deleteTemplate(templateCode);
      setTemplates((prev) => prev.filter((t) => t.template_code !== templateCode));
      setChanged(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (editingCode) {
        await updateTemplate(editingCode, { template_name: form.template_name.trim(), week_slots: weekSlots });
      } else {
        await createTemplate({
          template_code: form.template_code.trim(),
          template_name: form.template_name.trim(),
          week_slots: weekSlots,
        });
      }
      setChanged(true);
      await loadTemplates();
      setView('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFromForm() {
    if (!editingCode || !window.confirm(`${editingCode} 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await deleteTemplate(editingCode);
      setChanged(true);
      await loadTemplates();
      setView('list');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(changed)}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>정책 템플릿 관리</h3>
          <button type="button" className="modal-close" onClick={() => onClose(changed)}>
            ✕
          </button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        {view === 'list' && (
          <>
            <div className="page-toolbar">
              <div className="spacer" />
              <button type="button" className="primary" onClick={openNew}>
                + 새 템플릿
              </button>
            </div>

            {loading ? (
              <p>불러오는 중...</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>template_code</th>
                    <th>이름</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={3}>등록된 템플릿이 없습니다.</td>
                    </tr>
                  )}
                  {templates.map((template) => (
                    <tr key={template.template_code} onClick={() => openEdit(template.template_code)}>
                      <td>{template.template_code}</td>
                      <td>{template.template_name}</td>
                      <td className="actions">
                        <button type="button" onClick={(e) => handleDeleteFromList(e, template.template_code)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit}>
            <div className="crud-form" style={{ maxWidth: 420 }}>
              <div className="form-field">
                <label htmlFor="modal_template_code">template_code</label>
                <input
                  id="modal_template_code"
                  type="text"
                  value={form.template_code}
                  disabled={Boolean(editingCode)}
                  required
                  placeholder="예: DEFAULT"
                  onChange={(e) => setForm((f) => ({ ...f, template_code: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modal_template_name">이름</label>
                <input
                  id="modal_template_name"
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
                {editingCode ? '저장' : '등록'}
              </button>
              <button type="button" onClick={() => setView('list')}>
                목록으로
              </button>
              {editingCode && (
                <button type="button" onClick={handleDeleteFromForm}>
                  삭제
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TemplateManagerModal;
