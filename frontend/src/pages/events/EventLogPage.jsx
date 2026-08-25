import { useEffect, useState } from 'react';
import { listDoorEvents, listRfidEvents, listStatusEvents } from '../../api/events';
import { listRooms } from '../../api/rooms';
import '../../styles/crud.css';

const TABS = [
  { key: 'rfid', label: 'RFID 이벤트' },
  { key: 'door', label: '도어 이벤트' },
  { key: 'status', label: '판정 이벤트' },
];

const RFID_EVENT_TYPE_LABELS = { check_in: '체크인', check_out: '체크아웃', unknown: '알수없음' };
const DOOR_STATE_LABELS = { open: '열림', closed: '닫힘' };
const STATUS_TYPE_LABELS = {
  absent: '부재',
  anomaly: '이상',
  unregistered_uid: '미등록',
  wrong_room: '타내무반',
};

const PAGE_SIZE = 20;

function EventLogPage() {
  const [tab, setTab] = useState('rfid');
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [statusType, setStatusType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setError(err.message));
  }, []);

  function buildFilters(currentOffset) {
    const filters = {
      room_code: roomCode,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      limit: PAGE_SIZE,
      offset: currentOffset,
    };
    if (tab === 'status') filters.status_type = statusType;
    return filters;
  }

  function fetchPage(currentTab, filters) {
    if (currentTab === 'rfid') return listRfidEvents(filters);
    if (currentTab === 'door') return listDoorEvents(filters);
    return listStatusEvents(filters);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(tab, buildFilters(0));
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
  }, [tab, roomCode, statusType, from, to]);

  async function handleLoadMore() {
    setLoading(true);
    setError(null);
    try {
      const nextOffset = offset + PAGE_SIZE;
      const result = await fetchPage(tab, buildFilters(nextOffset));
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.has_more);
      setOffset(nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>이벤트 로그</h2>

      <div className="page-toolbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'primary' : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-toolbar">
        <select value={roomCode} onChange={(e) => setRoomCode(e.target.value)}>
          <option value="">전체 내무반</option>
          {rooms.map((room) => (
            <option key={room.room_code} value={room.room_code}>
              {room.room_code} — {room.room_name || '(이름 없음)'}
            </option>
          ))}
        </select>
        {tab === 'status' && (
          <select value={statusType} onChange={(e) => setStatusType(e.target.value)}>
            <option value="">전체 유형</option>
            {Object.entries(STATUS_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>~</span>
        <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {error && <div className="banner-error">{error}</div>}

      {tab === 'rfid' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>내무반</th>
              <th>게이트웨이</th>
              <th>리더</th>
              <th>RFID UID</th>
              <th>유형</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6}>조회된 이벤트가 없습니다.</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.occurred_at}</td>
                <td>{item.room_code}</td>
                <td>{item.gateway_id}</td>
                <td>{item.reader_index}</td>
                <td>{item.rfid_uid}</td>
                <td>{RFID_EVENT_TYPE_LABELS[item.event_type] || item.event_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'door' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>내무반</th>
              <th>게이트웨이</th>
              <th>도어 상태</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4}>조회된 이벤트가 없습니다.</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.occurred_at}</td>
                <td>{item.room_code}</td>
                <td>{item.gateway_id}</td>
                <td>{DOOR_STATE_LABELS[item.door_state] || item.door_state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'status' && (
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
                <td colSpan={4}>조회된 이벤트가 없습니다.</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.occurred_at}</td>
                <td>{STATUS_TYPE_LABELS[item.status_type] || item.status_type}</td>
                <td>{item.service_number || item.rfid_uid}</td>
                <td>{item.room_code || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="page-toolbar">
        <button type="button" disabled={!hasMore || loading} onClick={handleLoadMore}>
          더 보기
        </button>
      </div>
    </div>
  );
}

export default EventLogPage;
