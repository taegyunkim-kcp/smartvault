import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listRooms } from '../../api/rooms';
import { getPersonnelStatus, getRoomSummaries } from '../../api/dashboard';
import { listPersonnel } from '../../api/personnel';
import { listDoorEvents, listRfidEvents } from '../../api/events';
import { formatDateTime } from '../../utils/formatDateTime';
import '../../styles/crud.css';

const STATUS_LABEL = { present: '보관중', absent: '부재', anomaly: '이상', wrong_room: '타내무반' };
const DOOR_STATE_LABEL = { open: '열림', closed: '닫힘' };
const LOCK_STATE_LABEL = { locked: '잠김', unlocked: '열림 허용' };
const RFID_EVENT_TYPE_LABEL = { check_in: '체크인', check_out: '체크아웃', unknown: '알수없음' };

function DashboardByRoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomSummary, setRoomSummary] = useState(null);
  const [roster, setRoster] = useState([]);
  const [statusByServiceNumber, setStatusByServiceNumber] = useState({});
  const [rfidEvents, setRfidEvents] = useState([]);
  const [doorEvents, setDoorEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    async function load() {
      if (!roomCode) {
        setRoomSummary(null);
        setRoster([]);
        setStatusByServiceNumber({});
        setRfidEvents([]);
        setDoorEvents([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [roomSummaries, personnelList, status, rfidEventList, doorEventList] = await Promise.all([
          getRoomSummaries(),
          listPersonnel({ roomCode }),
          getPersonnelStatus(),
          listRfidEvents({ room_code: roomCode, limit: 10 }),
          listDoorEvents({ room_code: roomCode, limit: 10 }),
        ]);
        setRoomSummary(roomSummaries.find((r) => r.room_code === roomCode) || null);
        setRoster(personnelList);
        const byServiceNumber = {};
        status.personnel
          .filter((p) => p.room_code === roomCode)
          .forEach((p) => {
            byServiceNumber[p.service_number] = p;
          });
        setStatusByServiceNumber(byServiceNumber);
        setRfidEvents(rfidEventList.items || []);
        setDoorEvents(doorEventList.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [roomCode]);

  return (
    <div>
      <h2>내무반별 현황</h2>

      <div className="page-toolbar">
        <select value={roomCode || ''} onChange={(e) => navigate(e.target.value ? `/dashboard/by-room/${e.target.value}` : '/dashboard/by-room')}>
          <option value="">내무반 선택</option>
          {rooms.map((room) => (
            <option key={room.room_code} value={room.room_code}>
              {room.room_code} — {room.room_name || '(이름 없음)'}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {!roomCode && !error && <div className="empty-state">내무반을 선택하세요.</div>}

      {roomCode && loading && <p>불러오는 중...</p>}

      {roomCode && !loading && (
        <>
          <div className="page-toolbar">
            <span>
              문 상태:{' '}
              <span className={`badge ${roomSummary?.last_door_state === 'open' ? 'badge-online' : 'badge-offline'}`}>
                {roomSummary?.last_door_state ? DOOR_STATE_LABEL[roomSummary.last_door_state] : '기록 없음'}
              </span>
            </span>
            <span className="spacer" />
            <span>
              게이트웨이 보고 설정:{' '}
              {roomSummary?.reported_lock_state ? (
                <span
                  className={`badge ${roomSummary.reported_lock_state === 'unlocked' ? 'badge-online' : 'badge-offline'}`}
                >
                  {LOCK_STATE_LABEL[roomSummary.reported_lock_state]}
                </span>
              ) : (
                '미보고'
              )}
            </span>
            <span className="spacer" />
            <span>
              서버 계획 상태:{' '}
              {roomSummary?.scheduled_lock_state ? (
                <span
                  className={`badge ${roomSummary.scheduled_lock_state === 'unlocked' ? 'badge-online' : 'badge-offline'}`}
                >
                  {LOCK_STATE_LABEL[roomSummary.scheduled_lock_state]}
                </span>
              ) : (
                '정책 없음'
              )}
            </span>
          </div>

          <h3 className="section-title">등록 인원 ({roster.length}명)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>군번</th>
                <th>이름</th>
                <th>상태</th>
                <th>감지 위치</th>
                <th>최근 이벤트 시각</th>
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 && (
                <tr>
                  <td colSpan={5}>등록된 인원이 없습니다.</td>
                </tr>
              )}
              {roster.map((person) => {
                const status = statusByServiceNumber[person.service_number];
                return (
                  <tr
                    key={person.service_number}
                    onClick={() => navigate(`/personnel/${person.service_number}/edit`)}
                  >
                    <td>{person.service_number}</td>
                    <td>{person.name}</td>
                    <td>{status ? STATUS_LABEL[status.status] || status.status : '미매칭'}</td>
                    <td>{status?.detected_room_code || '-'}</td>
                    <td>{status?.latest_event_at ? formatDateTime(status.latest_event_at) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="section-title">최근 RFID 이벤트</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>RFID UID</th>
                <th>유형</th>
              </tr>
            </thead>
            <tbody>
              {rfidEvents.length === 0 && (
                <tr>
                  <td colSpan={3}>기록된 이벤트가 없습니다.</td>
                </tr>
              )}
              {rfidEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.occurred_at)}</td>
                  <td>{event.rfid_uid}</td>
                  <td>{RFID_EVENT_TYPE_LABEL[event.event_type] || event.event_type}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="section-title">최근 도어 이벤트</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>도어 상태</th>
              </tr>
            </thead>
            <tbody>
              {doorEvents.length === 0 && (
                <tr>
                  <td colSpan={2}>기록된 이벤트가 없습니다.</td>
                </tr>
              )}
              {doorEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.occurred_at)}</td>
                  <td>{DOOR_STATE_LABEL[event.door_state] || event.door_state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default DashboardByRoomPage;
