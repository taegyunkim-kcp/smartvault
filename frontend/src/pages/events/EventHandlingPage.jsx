import { useEffect, useState } from 'react';
import { listStatusEvents } from '../../api/events';
import { listRooms } from '../../api/rooms';
import StatusEventDetailModal from '../../components/StatusEventDetailModal';
import { formatDateTime } from '../../utils/formatDateTime';
import '../../styles/crud.css';

const STATUS_TYPE_LABELS = {
  absent: '부재',
  anomaly: '이상',
  unregistered_uid: '미등록',
  wrong_room: '타내무반',
};

const PAGE_SIZE = 20;

function EventHandlingPage() {
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [statusType, setStatusType] = useState('');
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setError(err.message));
  }, []);

  function buildFilters(currentOffset) {
    return {
      room_code: roomCode,
      status_type: statusType,
      acknowledged: 'false',
      limit: PAGE_SIZE,
      offset: currentOffset,
    };
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await listStatusEvents(buildFilters(0));
        setItems(result.items);
        setHasMore(result.has_more);
        setOffset(0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, statusType]);

  async function handleLoadMore() {
    setLoading(true);
    setError(null);
    try {
      const nextOffset = offset + PAGE_SIZE;
      const result = await listStatusEvents(buildFilters(nextOffset));
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.has_more);
      setOffset(nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEventModalClose(didAcknowledge, updatedEvent) {
    if (didAcknowledge && updatedEvent) {
      setItems((prev) => prev.filter((it) => it.id !== updatedEvent.id));
    }
    setSelectedEventId(null);
  }

  return (
    <div>
      <h2>이벤트 처리</h2>
      <p className="field-hint">
        관리자가 아직 확인/조치하지 않은 판정 이벤트 목록입니다. 행을 클릭하면 상세 정보를 확인하고 조치할 수
        있습니다.
      </p>

      <div className="page-toolbar">
        <select value={roomCode} onChange={(e) => setRoomCode(e.target.value)}>
          <option value="">전체 내무반</option>
          {rooms.map((room) => (
            <option key={room.room_code} value={room.room_code}>
              {room.room_code} — {room.room_name || '(이름 없음)'}
            </option>
          ))}
        </select>
        <select value={statusType} onChange={(e) => setStatusType(e.target.value)}>
          <option value="">전체 유형</option>
          {Object.entries(STATUS_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>시각</th>
            <th>유형</th>
            <th>대상</th>
            <th>내무반</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4}>처리할 이벤트가 없습니다.</td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id} onClick={() => setSelectedEventId(item.id)}>
              <td>{formatDateTime(item.occurred_at)}</td>
              <td>{STATUS_TYPE_LABELS[item.status_type] || item.status_type}</td>
              <td>{item.service_number || item.rfid_uid}</td>
              <td>{item.room_code || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="page-toolbar">
        <button type="button" disabled={!hasMore || loading} onClick={handleLoadMore}>
          더 보기
        </button>
      </div>

      {selectedEventId != null && (
        <StatusEventDetailModal eventId={selectedEventId} onClose={handleEventModalClose} />
      )}
    </div>
  );
}

export default EventHandlingPage;
