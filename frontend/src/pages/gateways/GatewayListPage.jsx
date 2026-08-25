import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGateways, deleteGateway, listDetectedGateways, matchDetectedGateway } from '../../api/gateways';
import { listRooms } from '../../api/rooms';
import { formatDateTime } from '../../utils/formatDateTime';
import '../../styles/crud.css';

const LOCK_STATE_LABELS = { locked: '잠김', unlocked: '열림 허용' };

function GatewayListPage() {
  const navigate = useNavigate();
  const [gateways, setGateways] = useState([]);
  const [detected, setDetected] = useState([]);
  const [matchRoomByGatewayId, setMatchRoomByGatewayId] = useState({});
  const [matchingId, setMatchingId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [gwList, roomList, detectedList] = await Promise.all([
          listGateways(roomCode),
          listRooms(),
          listDetectedGateways(),
        ]);
        if (!cancelled) {
          setGateways(gwList);
          setRooms(roomList);
          setDetected(detectedList);
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
  }, [roomCode]);

  async function handleDelete(event, gatewayId) {
    event.stopPropagation();
    if (!window.confirm(`${gatewayId} 게이트웨이를 삭제하시겠습니까?`)) return;

    try {
      await deleteGateway(gatewayId);
      setGateways((prev) => prev.filter((g) => g.gateway_id !== gatewayId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMatch(gatewayId) {
    const roomCodeForMatch = matchRoomByGatewayId[gatewayId];
    if (!roomCodeForMatch) return;

    setMatchingId(gatewayId);
    setError(null);
    try {
      const gateway = await matchDetectedGateway(gatewayId, { room_code: roomCodeForMatch });
      setDetected((prev) => prev.filter((d) => d.gateway_id !== gatewayId));
      setGateways((prev) => [...prev, gateway]);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatchingId(null);
    }
  }

  return (
    <div>
      <h2>게이트웨이 관리</h2>

      {detected.length > 0 && (
        <>
          <h3 className="section-title">탐지된 미등록 게이트웨이 ({detected.length})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>gateway_id</th>
                <th>최초 탐지</th>
                <th>최근 탐지</th>
                <th>내무반 지정</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {detected.map((d) => (
                <tr key={d.gateway_id}>
                  <td>{d.gateway_id}</td>
                  <td>{formatDateTime(d.first_seen_at)}</td>
                  <td>{formatDateTime(d.last_seen_at)}</td>
                  <td>
                    <select
                      value={matchRoomByGatewayId[d.gateway_id] || ''}
                      onChange={(e) =>
                        setMatchRoomByGatewayId((prev) => ({ ...prev, [d.gateway_id]: e.target.value }))
                      }
                    >
                      <option value="">내무반 선택</option>
                      {rooms.map((room) => (
                        <option key={room.room_code} value={room.room_code}>
                          {room.room_code} — {room.room_name || '(이름 없음)'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={!matchRoomByGatewayId[d.gateway_id] || matchingId === d.gateway_id}
                      onClick={() => handleMatch(d.gateway_id)}
                    >
                      매칭
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="section-title">등록된 게이트웨이</h3>
      <div className="page-toolbar">
        <select value={roomCode} onChange={(e) => setRoomCode(e.target.value)}>
          <option value="">전체 내무반</option>
          {rooms.map((room) => (
            <option key={room.room_code} value={room.room_code}>
              {room.room_code} — {room.room_name || '(이름 없음)'}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/gateways/new')}>
          + 새 게이트웨이
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>gateway_id</th>
              <th>room_code</th>
              <th>reader_count</th>
              <th>firmware_version</th>
              <th>last_seen_at</th>
              <th>개폐 설정</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gateways.length === 0 && (
              <tr>
                <td colSpan={7}>등록된 게이트웨이가 없습니다.</td>
              </tr>
            )}
            {gateways.map((gw) => (
              <tr key={gw.gateway_id} onClick={() => navigate(`/gateways/${gw.gateway_id}/edit`)}>
                <td>{gw.gateway_id}</td>
                <td>{gw.room_code}</td>
                <td>{gw.reader_count}</td>
                <td>{gw.firmware_version || '-'}</td>
                <td>{gw.last_seen_at ? formatDateTime(gw.last_seen_at) : '-'}</td>
                <td>{LOCK_STATE_LABELS[gw.reported_lock_state] || '미보고'}</td>
                <td className="actions">
                  <button type="button" onClick={(e) => handleDelete(e, gw.gateway_id)}>
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

export default GatewayListPage;
