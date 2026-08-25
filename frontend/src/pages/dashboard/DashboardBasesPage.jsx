import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBaseSummaries, getPersonnelStatus } from '../../api/dashboard';
import '../../styles/crud.css';

const STATUS_LABELS = {
  absent: '부재',
  anomaly: '이상',
  unregistered_uid: '미등록',
  wrong_room: '타내무반',
};

const STAT_CARDS = [
  { key: 'total_registered', label: '전체 등록' },
  { key: 'present', label: '보관중' },
  { key: 'absent', label: '부재' },
  { key: 'anomaly', label: '이상', warn: true },
  { key: 'wrong_room', label: '타내무반', warn: true },
  { key: 'unregistered', label: '미등록', warn: true },
];

function DashboardBasesPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [personnelStatus, setPersonnelStatus] = useState(null);
  const [selectedStat, setSelectedStat] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [baseSummaries, status] = await Promise.all([getBaseSummaries(), getPersonnelStatus()]);
        setBases(baseSummaries);
        setPersonnelStatus(status);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p>불러오는 중...</p>;

  const filteredPersonnel =
    selectedStat && selectedStat !== 'total_registered' && selectedStat !== 'unregistered' && personnelStatus
      ? personnelStatus.personnel.filter((p) => p.status === selectedStat)
      : null;
  const showUnregisteredList = selectedStat === 'unregistered';

  return (
    <div>
      <h2>전체 현황</h2>

      {error && <div className="banner-error">{error}</div>}

      {personnelStatus && (
        <>
          <div className="stat-cards">
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className={`stat-card${card.warn ? ' stat-warn' : ''}${selectedStat === card.key ? ' selected' : ''}`}
                onClick={() => setSelectedStat((prev) => (prev === card.key ? null : card.key))}
              >
                <div className="stat-label">{card.label}</div>
                <div className="stat-value">{personnelStatus.summary[card.key]}</div>
              </div>
            ))}
          </div>

          {filteredPersonnel && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>군번</th>
                  <th>이름</th>
                  <th>소속 내무반</th>
                  <th>감지 위치</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnel.length === 0 && (
                  <tr>
                    <td colSpan={4}>해당 상태의 인원이 없습니다.</td>
                  </tr>
                )}
                {filteredPersonnel.map((p) => (
                  <tr key={p.service_number} onClick={() => navigate(`/personnel/${p.service_number}/edit`)}>
                    <td>{p.service_number}</td>
                    <td>{p.name}</td>
                    <td>{p.room_code}</td>
                    <td>{p.detected_room_code || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showUnregisteredList && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>rfid_uid</th>
                  <th>감지 내무반</th>
                  <th>게이트웨이</th>
                  <th>최근 감지 시각</th>
                </tr>
              </thead>
              <tbody>
                {personnelStatus.unregistered_tags.length === 0 && (
                  <tr>
                    <td colSpan={4}>미등록 태그가 없습니다.</td>
                  </tr>
                )}
                {personnelStatus.unregistered_tags.map((tag) => (
                  <tr key={tag.rfid_uid}>
                    <td>{tag.rfid_uid}</td>
                    <td>{tag.room_code}</td>
                    <td>{tag.gateway_id}</td>
                    <td>{tag.last_seen_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <h3 className="section-title">중대별 게이트웨이 현황</h3>

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

      {personnelStatus && (
        <>
          <h3 className="section-title">최근 이상 이벤트</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>유형</th>
                <th>대상</th>
                <th>내무반</th>
                <th>시각</th>
              </tr>
            </thead>
            <tbody>
              {personnelStatus.recent_events.length === 0 && (
                <tr>
                  <td colSpan={4}>기록된 이벤트가 없습니다.</td>
                </tr>
              )}
              {personnelStatus.recent_events.map((event) => (
                <tr key={event.id}>
                  <td>{STATUS_LABELS[event.status_type] || event.status_type}</td>
                  <td>{event.service_number || event.rfid_uid}</td>
                  <td>{event.room_code || '-'}</td>
                  <td>{event.occurred_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default DashboardBasesPage;
