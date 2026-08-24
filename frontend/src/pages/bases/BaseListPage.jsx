import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBases, deleteBase } from '../../api/bases';
import '../../styles/crud.css';

function BaseListPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setBases(await listBases());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleDelete(event, baseCode) {
    event.stopPropagation();
    if (!window.confirm(`${baseCode} 기지를 삭제하시겠습니까?`)) return;

    try {
      await deleteBase(baseCode);
      setBases((prev) => prev.filter((b) => b.base_code !== baseCode));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>중대 관리</h2>

      <div className="page-toolbar">
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/bases/new')}>
          + 새 중대
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>base_code</th>
              <th>base_name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bases.length === 0 && (
              <tr>
                <td colSpan={3}>등록된 중대가 없습니다.</td>
              </tr>
            )}
            {bases.map((base) => (
              <tr key={base.base_code} onClick={() => navigate(`/bases/${base.base_code}/edit`)}>
                <td>{base.base_code}</td>
                <td>{base.base_name}</td>
                <td className="actions">
                  <button type="button" onClick={(e) => handleDelete(e, base.base_code)}>
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

export default BaseListPage;
