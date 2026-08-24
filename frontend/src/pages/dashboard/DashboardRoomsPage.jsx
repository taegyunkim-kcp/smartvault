import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoomSummaries } from '../../api/dashboard';
import '../../styles/crud.css';

const DOOR_STATE_LABEL = { open: '열림', closed: '닫힘' };

function DashboardRoomsPage() {
  const { baseCode, buildingCode } = useParams();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setRooms(await getRoomSummaries(buildingCode));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [buildingCode]);

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">전체 현황</Link> / <Link to={`/dashboard/${baseCode}`}>{baseCode}</Link> /{' '}
        {buildingCode}
      </div>
      <h2>내무반 현황 — {buildingCode}</h2>

      {error && <div className="banner-error">{error}</div>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : !error && rooms.length === 0 ? (
        <div className="empty-state">이 소대에 등록된 내무반이 없습니다.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>내무반</th>
              <th>게이트웨이</th>
              <th>최근 24시간 이벤트</th>
              <th>문 상태</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.room_code}>
                <td>
                  {room.room_code} — {room.room_name}
                </td>
                <td>
                  {room.gateway_count === 0 ? (
                    '-'
                  ) : (
                    <span
                      className={`badge ${room.online_gateway_count > 0 ? 'badge-online' : 'badge-offline'}`}
                    >
                      {room.online_gateway_count}/{room.gateway_count} 온라인
                    </span>
                  )}
                </td>
                <td>{room.event_count_24h}건</td>
                <td>{room.last_door_state ? DOOR_STATE_LABEL[room.last_door_state] : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DashboardRoomsPage;
