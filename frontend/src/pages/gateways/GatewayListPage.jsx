import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGateways, deleteGateway } from '../../api/gateways';
import './gateways.css';

function GatewayListPage() {
  const navigate = useNavigate();
  const [gateways, setGateways] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listGateways(roomCode);
        if (!cancelled) setGateways(data);
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

  return (
    <div>
      <h2>게이트웨이 관리</h2>

      <form
        className="page-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setRoomCode(roomCodeInput.trim());
        }}
      >
        <input
          type="text"
          placeholder="room_code로 필터"
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value)}
        />
        <button type="submit">검색</button>
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/gateways/new')}>
          + 새 게이트웨이
        </button>
      </form>

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gateways.length === 0 && (
              <tr>
                <td colSpan={6}>등록된 게이트웨이가 없습니다.</td>
              </tr>
            )}
            {gateways.map((gw) => (
              <tr key={gw.gateway_id} onClick={() => navigate(`/gateways/${gw.gateway_id}/edit`)}>
                <td>{gw.gateway_id}</td>
                <td>{gw.room_code}</td>
                <td>{gw.reader_count}</td>
                <td>{gw.firmware_version || '-'}</td>
                <td>{gw.last_seen_at || '-'}</td>
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
