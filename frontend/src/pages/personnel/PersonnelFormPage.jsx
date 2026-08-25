import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPersonnel, deletePersonnel, getPersonnel, unmatchPersonnel, updatePersonnel } from '../../api/personnel';
import { listRooms } from '../../api/rooms';
import '../../styles/crud.css';

const EMPTY_FORM = { service_number: '', name: '', phone_number: '', room_code: '', rfid_uid: '' };

function PersonnelFormPage() {
  const { serviceNumber } = useParams();
  const isEditing = Boolean(serviceNumber);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [roomList, person] = await Promise.all([
          listRooms(),
          isEditing ? getPersonnel(serviceNumber) : Promise.resolve(null),
        ]);
        setRooms(roomList);
        if (person) {
          setForm({
            service_number: person.service_number,
            name: person.name,
            phone_number: person.phone_number || '',
            room_code: person.room_code,
            rfid_uid: person.rfid_uid || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [serviceNumber, isEditing]);

  async function handleUnmatchRfid() {
    if (!window.confirm('이 인원의 RFID 매칭을 해제하시겠습니까? 상태가 "RFID 미매핑"으로 바뀝니다.')) return;
    setUnmatching(true);
    setError(null);
    try {
      await unmatchPersonnel(serviceNumber);
      setForm((f) => ({ ...f, rfid_uid: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUnmatching(false);
    }
  }

  function fieldError(keyword) {
    return error && error.includes(keyword) ? error : null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone_number: form.phone_number.trim() || undefined,
      room_code: form.room_code,
    };

    try {
      if (isEditing) {
        await updatePersonnel(serviceNumber, payload);
      } else {
        await createPersonnel({ ...payload, service_number: form.service_number.trim() });
      }
      navigate('/personnel');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${serviceNumber} 인원을 삭제하시겠습니까?`)) return;
    try {
      await deletePersonnel(serviceNumber);
      navigate('/personnel');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>{isEditing ? '인원 수정' : '새 인원 등록'}</h2>

      {error && !fieldError('room_code') && <div className="banner-error">{error}</div>}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="service_number">군번(service_number)</label>
          <input
            id="service_number"
            type="text"
            value={form.service_number}
            disabled={isEditing}
            required
            placeholder="예: 25-1234567"
            onChange={(e) => setForm((f) => ({ ...f, service_number: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={form.name}
            required
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="phone_number">전화번호</label>
          <input
            id="phone_number"
            type="text"
            value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="room_code">소속 내무반 (room_code)</label>
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

        {isEditing && (
          <div className="form-field">
            <label>RFID UID</label>
            <div className="page-toolbar">
              <span>{form.rfid_uid || 'RFID 미매핑'}</span>
              {form.rfid_uid && (
                <button type="button" disabled={unmatching} onClick={handleUnmatchRfid}>
                  RFID 해제
                </button>
              )}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {isEditing ? '저장' : '등록'}
          </button>
          <button type="button" onClick={() => navigate('/personnel')}>
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

export default PersonnelFormPage;
