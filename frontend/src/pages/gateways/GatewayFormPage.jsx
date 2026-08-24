import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createGateway, deleteGateway, getGateway, updateGateway } from '../../api/gateways';
import { listRooms } from '../../api/rooms';
import '../../styles/crud.css';

const EMPTY_FORM = { gateway_id: '', room_code: '', reader_count: '', firmware_version: '' };

function GatewayFormPage() {
  const { gatewayId } = useParams();
  const isEditing = Boolean(gatewayId);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [roomList, gw] = await Promise.all([
          listRooms(),
          isEditing ? getGateway(gatewayId) : Promise.resolve(null),
        ]);
        setRooms(roomList);
        if (gw) {
          setForm({
            gateway_id: gw.gateway_id,
            room_code: gw.room_code,
            reader_count: String(gw.reader_count),
            firmware_version: gw.firmware_version || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [gatewayId, isEditing]);

  function fieldError(keyword) {
    return error && error.includes(keyword) ? error : null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      room_code: form.room_code,
      firmware_version: form.firmware_version.trim() || undefined,
      reader_count: form.reader_count === '' ? undefined : Number(form.reader_count),
    };

    try {
      if (isEditing) {
        await updateGateway(gatewayId, payload);
      } else {
        await createGateway({ ...payload, gateway_id: form.gateway_id.trim() });
      }
      navigate('/gateways');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${gatewayId} 게이트웨이를 삭제하시겠습니까?`)) return;
    try {
      await deleteGateway(gatewayId);
      navigate('/gateways');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '게이트웨이 수정' : '새 게이트웨이 등록'}</h2>

      {error && !fieldError('room_code') && !fieldError('gateway_id') && (
        <div className="banner-error">{error}</div>
      )}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="gateway_id">gateway_id</label>
          <input
            id="gateway_id"
            type="text"
            value={form.gateway_id}
            disabled={isEditing}
            required
            placeholder="예: 1CORPS-B3-R204-G1"
            onChange={(e) => setForm((f) => ({ ...f, gateway_id: e.target.value }))}
          />
          {fieldError('gateway_id') && <div className="field-error">{fieldError('gateway_id')}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="room_code">내무반 (room_code)</label>
          <select
            id="room_code"
            value={form.room_code}
            required
            onChange={(e) => setForm((f) => ({ ...f, room_code: e.target.value }))}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {rooms.map((room) => (
              <option key={room.room_code} value={room.room_code}>
                {room.room_code} — {room.room_name || '(이름 없음)'}
              </option>
            ))}
          </select>
          {fieldError('room_code') && <div className="field-error">{fieldError('room_code')}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="reader_count">reader_count</label>
          <input
            id="reader_count"
            type="number"
            min="0"
            max="255"
            placeholder="기본값 10"
            value={form.reader_count}
            onChange={(e) => setForm((f) => ({ ...f, reader_count: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="firmware_version">firmware_version</label>
          <input
            id="firmware_version"
            type="text"
            value={form.firmware_version}
            onChange={(e) => setForm((f) => ({ ...f, firmware_version: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/gateways')}>
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

export default GatewayFormPage;
