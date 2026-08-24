import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createBuilding, deleteBuilding, getBuilding, updateBuilding } from '../../api/buildings';
import { listBases } from '../../api/bases';
import '../../styles/crud.css';

const EMPTY_FORM = { building_code: '', base_code: '', building_name: '' };

function BuildingFormPage() {
  const { buildingCode } = useParams();
  const isEditing = Boolean(buildingCode);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [baseList, building] = await Promise.all([
          listBases(),
          isEditing ? getBuilding(buildingCode) : Promise.resolve(null),
        ]);
        setBases(baseList);
        if (building) {
          setForm({
            building_code: building.building_code,
            base_code: building.base_code,
            building_name: building.building_name || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [buildingCode, isEditing]);

  function fieldError(keyword) {
    return error && error.includes(keyword) ? error : null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await updateBuilding(buildingCode, { building_name: form.building_name.trim() });
      } else {
        await createBuilding({
          building_code: form.building_code.trim(),
          base_code: form.base_code,
          building_name: form.building_name.trim(),
        });
      }
      navigate('/buildings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${buildingCode} 건물을 삭제하시겠습니까?`)) return;
    try {
      await deleteBuilding(buildingCode);
      navigate('/buildings');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '소대 수정' : '새 소대 등록'}</h2>

      {error && !fieldError('base_code') && <div className="banner-error">{error}</div>}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="building_code">building_code</label>
          <input
            id="building_code"
            type="text"
            value={form.building_code}
            disabled={isEditing}
            required
            placeholder="예: 1CORPS-B3"
            onChange={(e) => setForm((f) => ({ ...f, building_code: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="base_code">소속 중대 (base_code)</label>
          <select
            id="base_code"
            value={form.base_code}
            disabled={isEditing}
            required
            onChange={(e) => setForm((f) => ({ ...f, base_code: e.target.value }))}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {bases.map((base) => (
              <option key={base.base_code} value={base.base_code}>
                {base.base_code} — {base.base_name}
              </option>
            ))}
          </select>
          {fieldError('base_code') && <div className="field-error">{fieldError('base_code')}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="building_name">소대 이름 (building_name)</label>
          <input
            id="building_name"
            type="text"
            value={form.building_name}
            onChange={(e) => setForm((f) => ({ ...f, building_name: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/buildings')}>
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

export default BuildingFormPage;
