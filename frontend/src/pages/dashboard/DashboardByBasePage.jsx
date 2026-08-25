import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listBases } from '../../api/bases';
import { getBuildingSummaries, getPersonnelStatus, getRoomSummaries } from '../../api/dashboard';
import RoomStatusGrid from '../../components/RoomStatusGrid';
import '../../styles/crud.css';

const STAT_CARDS = [
  { key: 'registered', label: '등록' },
  { key: 'present', label: '보관중' },
  { key: 'absent', label: '부재' },
  { key: 'anomaly', label: '이상', warn: true },
  { key: 'wrong_room', label: '타내무반', warn: true },
  { key: 'unregistered', label: '미등록', warn: true },
];

function DashboardByBasePage() {
  const { baseCode } = useParams();
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [personnelStatus, setPersonnelStatus] = useState(null);
  const [selectedStat, setSelectedStat] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [baseList, status] = await Promise.all([listBases(), getPersonnelStatus()]);
        setBases(baseList);
        setPersonnelStatus(status);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    async function loadScoped() {
      if (!baseCode) {
        setBuildings([]);
        setAllRooms([]);
        return;
      }

      setSelectedStat(null);

      try {
        const [buildingList, roomList] = await Promise.all([getBuildingSummaries(baseCode), getRoomSummaries()]);
        setBuildings(buildingList);
        const buildingCodes = new Set(buildingList.map((b) => b.building_code));
        setAllRooms(roomList.filter((r) => buildingCodes.has(r.building_code)));
      } catch (err) {
        setError(err.message);
      }
    }

    loadScoped();
  }, [baseCode]);

  if (loading) return <p>불러오는 중...</p>;

  const baseStatus = baseCode ? personnelStatus?.by_base?.[baseCode] : null;
  const filteredPersonnel =
    selectedStat && personnelStatus
      ? personnelStatus.personnel.filter((p) => p.base_code === baseCode && p.status === selectedStat)
      : null;

  return (
    <div>
      <h2>중대별 현황</h2>

      <div className="page-toolbar">
        <select value={baseCode || ''} onChange={(e) => navigate(e.target.value ? `/dashboard/by-base/${e.target.value}` : '/dashboard/by-base')}>
          <option value="">중대 선택</option>
          {bases.map((base) => (
            <option key={base.base_code} value={base.base_code}>
              {base.base_code} — {base.base_name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {!baseCode && !error && <div className="empty-state">중대를 선택하세요.</div>}

      {baseCode && (
        <>
          <div className="stat-cards">
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className={`stat-card${card.warn ? ' stat-warn' : ''}${selectedStat === card.key ? ' selected' : ''}`}
                onClick={() => setSelectedStat((prev) => (prev === card.key ? null : card.key))}
              >
                <div className="stat-label">{card.label}</div>
                <div className="stat-value">{baseStatus?.[card.key] ?? 0}</div>
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

          <h3 className="section-title">소대별 현황</h3>
          {buildings.length === 0 ? (
            <div className="empty-state">이 중대에 등록된 소대가 없습니다.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>소대</th>
                  <th>내무반 수</th>
                  <th>게이트웨이</th>
                  <th>등록</th>
                  <th>보관중</th>
                  <th>부재</th>
                  <th>최근 24시간 이벤트</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building) => {
                  const buildingStatus = personnelStatus?.by_building?.[building.building_code];
                  return (
                    <tr key={building.building_code}>
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
                      <td>{buildingStatus?.registered ?? 0}</td>
                      <td>{buildingStatus?.present ?? 0}</td>
                      <td>{buildingStatus?.absent ?? 0}</td>
                      <td>{building.event_count_24h}건</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h3 className="section-title">내무반 개폐 상태</h3>
          <RoomStatusGrid rooms={allRooms} onSelectRoom={(code) => navigate(`/dashboard/by-room/${code}`)} />
        </>
      )}
    </div>
  );
}

export default DashboardByBasePage;
