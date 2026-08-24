import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBaseSummaries } from '../../api/dashboard';
import '../../styles/crud.css';

function DashboardBasesPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setBases(await getBaseSummaries());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>전체 현황</h2>

      {error && <div className="banner-error">{error}</div>}

      {!error && bases.length === 0 ? (
        <div className="empty-state">
          등록된 중대가 없습니다. <Link to="/bases">편제 관리</Link>에서 먼저 등록하세요.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>중대</th>
              <th>소대 수</th>
              <th>게이트웨이</th>
              <th>최근 24시간 이벤트</th>
            </tr>
          </thead>
          <tbody>
            {bases.map((base) => (
              <tr key={base.base_code} onClick={() => navigate(`/dashboard/${base.base_code}`)}>
                <td>
                  {base.base_code} — {base.base_name}
                </td>
                <td>{base.building_count}</td>
                <td>
                  {base.gateway_count === 0 ? (
                    '-'
                  ) : (
                    <span className={`badge ${base.online_gateway_count > 0 ? 'badge-online' : 'badge-offline'}`}>
                      {base.online_gateway_count}/{base.gateway_count} 온라인
                    </span>
                  )}
                </td>
                <td>{base.event_count_24h}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DashboardBasesPage;
