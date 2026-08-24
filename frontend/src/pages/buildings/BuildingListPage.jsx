import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBuildings, deleteBuilding } from '../../api/buildings';
import { listBases } from '../../api/bases';
import '../../styles/crud.css';

function BuildingListPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [bases, setBases] = useState([]);
  const [baseCode, setBaseCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [buildingList, baseList] = await Promise.all([listBuildings(baseCode), listBases()]);
        if (!cancelled) {
          setBuildings(buildingList);
          setBases(baseList);
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
  }, [baseCode]);

  async function handleDelete(event, buildingCode) {
    event.stopPropagation();
    if (!window.confirm(`${buildingCode} 건물을 삭제하시겠습니까?`)) return;

    try {
      await deleteBuilding(buildingCode);
      setBuildings((prev) => prev.filter((b) => b.building_code !== buildingCode));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>소대 관리</h2>

      <div className="page-toolbar">
        <select value={baseCode} onChange={(e) => setBaseCode(e.target.value)}>
          <option value="">전체 중대</option>
          {bases.map((base) => (
            <option key={base.base_code} value={base.base_code}>
              {base.base_code} — {base.base_name}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/buildings/new')}>
          + 새 소대
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>building_code</th>
              <th>base_code</th>
              <th>building_name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {buildings.length === 0 && (
              <tr>
                <td colSpan={4}>등록된 소대가 없습니다.</td>
              </tr>
            )}
            {buildings.map((building) => (
              <tr
                key={building.building_code}
                onClick={() => navigate(`/buildings/${building.building_code}/edit`)}
              >
                <td>{building.building_code}</td>
                <td>{building.base_code}</td>
                <td>{building.building_name || '-'}</td>
                <td className="actions">
                  <button type="button" onClick={(e) => handleDelete(e, building.building_code)}>
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

export default BuildingListPage;
