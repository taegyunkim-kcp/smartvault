import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRoom, deleteRoom, getRoom, updateRoom } from '../../api/rooms';
import { listBuildings } from '../../api/buildings';
import '../../styles/crud.css';

const EMPTY_FORM = { room_code: '', building_code: '', room_name: '' };

function RoomFormPage() {
  const { roomCode } = useParams();
  const isEditing = Boolean(roomCode);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [buildingList, room] = await Promise.all([
          listBuildings(),
          isEditing ? getRoom(roomCode) : Promise.resolve(null),
        ]);
        setBuildings(buildingList);
        if (room) {
          setForm({
            room_code: room.room_code,
            building_code: room.building_code,
            room_name: room.room_name || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [roomCode, isEditing]);

  function fieldError(keyword) {
    return error && error.includes(keyword) ? error : null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await updateRoom(roomCode, { room_name: form.room_name.trim() });
      } else {
        await createRoom({
          room_code: form.room_code.trim(),
          building_code: form.building_code,
          room_name: form.room_name.trim(),
        });
      }
      navigate('/rooms');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${roomCode} 방을 삭제하시겠습니까?`)) return;
    try {
      await deleteRoom(roomCode);
      navigate('/rooms');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '내무반 수정' : '새 내무반 등록'}</h2>

      {error && !fieldError('building_code') && <div className="banner-error">{error}</div>}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="room_code">room_code</label>
          <input
            id="room_code"
            type="text"
            value={form.room_code}
            disabled={isEditing}
            required
            placeholder="예: 1CORPS-B3-R204"
            onChange={(e) => setForm((f) => ({ ...f, room_code: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="building_code">소속 소대 (building_code)</label>
          <select
            id="building_code"
            value={form.building_code}
            disabled={isEditing}
            required
            onChange={(e) => setForm((f) => ({ ...f, building_code: e.target.value }))}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {buildings.map((building) => (
              <option key={building.building_code} value={building.building_code}>
                {building.building_code} — {building.building_name}
              </option>
            ))}
          </select>
          {fieldError('building_code') && <div className="field-error">{fieldError('building_code')}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="room_name">내무반 이름 (room_name)</label>
          <input
            id="room_name"
            type="text"
            value={form.room_name}
            onChange={(e) => setForm((f) => ({ ...f, room_name: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/rooms')}>
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

export default RoomFormPage;
