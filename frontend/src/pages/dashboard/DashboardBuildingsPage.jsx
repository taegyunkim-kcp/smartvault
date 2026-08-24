import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBuildingSummaries } from '../../api/dashboard';
import '../../styles/crud.css';

function DashboardBuildingsPage() {
  const { baseCode } = useParams();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setBuildings(await getBuildingSummaries(baseCode));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [baseCode]);

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">전체 현황</Link> / {baseCode}
      </div>
      <h2>소대 현황 — {baseCode}</h2>

      {error && <div className="banner-error">{error}</div>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : !error && buildings.length === 0 ? (
        <div className="empty-state">이 중대에 등록된 소대가 없습니다.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>소대</th>
              <th>내무반 수</th>
              <th>게이트웨이</th>
              <th>최근 24시간 이벤트</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr
                key={building.building_code}
                onClick={() => navigate(`/dashboard/${baseCode}/${building.building_code}`)}
              >
                <td>
                  {building.building_code} — {building.building_name}
                </td>
                <td>{building.room_count}</td>
                <td>
                  {building.gateway_count === 0 ? (
                    '-'
                  ) : (
                    <span
                      className={`badge ${building.online_gateway_count > 0 ? 'badge-online' : 'badge-offline'}`}
                    >
                      {building.online_gateway_count}/{building.gateway_count} 온라인
                    </span>
                  )}
                </td>
                <td>{building.event_count_24h}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DashboardBuildingsPage;
