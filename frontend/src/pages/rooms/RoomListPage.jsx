import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRooms, deleteRoom } from '../../api/rooms';
import { listBuildings } from '../../api/buildings';
import '../../styles/crud.css';

function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingCode, setBuildingCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [roomList, buildingList] = await Promise.all([
          listRooms(buildingCode),
          listBuildings(),
        ]);
        if (!cancelled) {
          setRooms(roomList);
          setBuildings(buildingList);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [buildingCode]);

  async function handleDelete(event, roomCode) {
    event.stopPropagation();
    if (!window.confirm(`${roomCode} 방을 삭제하시겠습니까?`)) return;

    try {
      await deleteRoom(roomCode);
      setRooms((prev) => prev.filter((r) => r.room_code !== roomCode));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>내무반 관리</h2>

      <div className="page-toolbar">
        <select value={buildingCode} onChange={(e) => setBuildingCode(e.target.value)}>
          <option value="">전체 소대</option>
          {buildings.map((building) => (
            <option key={building.building_code} value={building.building_code}>
              {building.building_code} — {building.building_name}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/rooms/new')}>
          + 새 내무반
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>room_code</th>
              <th>building_code</th>
              <th>room_name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td colSpan={4}>등록된 내무반이 없습니다.</td>
              </tr>
            )}
            {rooms.map((room) => (
              <tr key={room.room_code} onClick={() => navigate(`/rooms/${room.room_code}/edit`)}>
                <td>{room.room_code}</td>
                <td>{room.building_code}</td>
                <td>{room.room_name || '-'}</td>
                <td className="actions">
                  <button type="button" onClick={(e) => handleDelete(e, room.room_code)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RoomListPage;
