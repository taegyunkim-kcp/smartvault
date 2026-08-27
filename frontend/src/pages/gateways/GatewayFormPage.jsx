import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createGateway,
  deleteGateway,
  getGateway,
  listDetectedGateways,
  matchDetectedGateway,
  updateGateway,
} from '../../api/gateways';
import { listRooms } from '../../api/rooms';
import { formatDateTime } from '../../utils/formatDateTime';
import '../../styles/crud.css';

const EMPTY_FORM = { gateway_id: '', room_code: '', reader_count: '', firmware_version: '' };

function GatewayFormPage() {
  const { gatewayId } = useParams();
  const isEditing = Boolean(gatewayId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState(EMPTY_FORM);
  const [rooms, setRooms] = useState([]);
  const [detected, setDetected] = useState([]);
  const [selectedDetectedId, setSelectedDetectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [roomList, detectedList, gw] = await Promise.all([
          listRooms(),
          isEditing ? Promise.resolve([]) : listDetectedGateways(),
          isEditing ? getGateway(gatewayId) : Promise.resolve(null),
        ]);
        setRooms(roomList);
        setDetected(detectedList);
        if (gw) {
          setForm({
            gateway_id: gw.gateway_id,
            room_code: gw.room_code,
            reader_count: String(gw.reader_count),
            firmware_version: gw.firmware_version || '',
          });
        } else {
          const presetRoomCode = searchParams.get('room_code') || '';
          if (presetRoomCode) {
            setForm((f) => ({ ...f, room_code: presetRoomCode, gateway_id: `${presetRoomCode}-` }));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [gatewayId, isEditing, searchParams]);

  function selectDetected(detectedGatewayId) {
    setSelectedDetectedId(detectedGatewayId);
    setForm((f) => ({ ...f, gateway_id: detectedGatewayId }));
  }

  function deselectDetected() {
    setSelectedDetectedId(null);
    setForm((f) => ({ ...f, gateway_id: f.room_code ? `${f.room_code}-` : '' }));
  }

  function handleRoomCodeChange(nextRoomCode) {
    setForm((f) => {
      const prevAutoPrefix = f.room_code ? `${f.room_code}-` : '';
      const gatewayIdUntouched =
        !isEditing && !selectedDetectedId && (f.gateway_id === '' || f.gateway_id === prevAutoPrefix);
      return {
        ...f,
        room_code: nextRoomCode,
        gateway_id: gatewayIdUntouched ? (nextRoomCode ? `${nextRoomCode}-` : '') : f.gateway_id,
      };
    });
  }

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
      } else if (selectedDetectedId) {
        await matchDetectedGateway(selectedDetectedId, payload);
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

      {!isEditing && detected.length > 0 && (
        <div className="banner-info">
          <p>
            게이트웨이는 자체 식별코드로 이벤트를 보내오는데, 아래 코드는 아직 어떤 게이트웨이로도 등록되지 않았습니다.
            직접 설치한 장치라면 목록에서 골라 그 코드 그대로 등록하세요 — gateway_id를 임의로 입력하면 실제 장치가
            보내는 코드와 달라 계속 미등록으로 탐지됩니다.
          </p>
          <ul className="detected-gateway-list">
            {detected.map((d) => (
              <li key={d.gateway_id} className={selectedDetectedId === d.gateway_id ? 'selected' : ''}>
                <span className="detected-gateway-id">{d.gateway_id}</span>
                <span className="detected-gateway-seen">최근 감지 {formatDateTime(d.last_seen_at)}</span>
                <button type="button" onClick={() => selectDetected(d.gateway_id)}>
                  이 코드 사용
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="gateway_id">gateway_id</label>
          <input
            id="gateway_id"
            type="text"
            value={form.gateway_id}
            disabled={isEditing || Boolean(selectedDetectedId)}
            required
            placeholder="예: 1CORPS-B3-R204-G1"
            onChange={(e) => setForm((f) => ({ ...f, gateway_id: e.target.value }))}
          />
          {selectedDetectedId && (
            <div className="field-hint">
              탐지된 코드로 고정됨 —{' '}
              <button type="button" className="link-button" onClick={deselectDetected}>
                직접 입력으로 전환
              </button>
            </div>
          )}
          {fieldError('gateway_id') && <div className="field-error">{fieldError('gateway_id')}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="room_code">내무반 (room_code)</label>
          <select
            id="room_code"
            value={form.room_code}
            required
            onChange={(e) => handleRoomCodeChange(e.target.value)}
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
