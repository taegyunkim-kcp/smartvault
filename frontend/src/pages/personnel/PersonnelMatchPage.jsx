import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPersonnel, matchPersonnel } from '../../api/personnel';
import { listUnmatchedTags } from '../../api/rfidTags';
import '../../styles/crud.css';

function PersonnelMatchPage() {
  const [unmatchedPersonnel, setUnmatchedPersonnel] = useState([]);
  const [unmatchedTags, setUnmatchedTags] = useState([]);
  const [selectedServiceNumber, setSelectedServiceNumber] = useState(null);
  const [selectedRfidUid, setSelectedRfidUid] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [personnel, tags] = await Promise.all([
        listPersonnel({ matched: false }),
        listUnmatchedTags(),
      ]);
      setUnmatchedPersonnel(personnel);
      setUnmatchedTags(tags);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function handleMatch() {
    if (!selectedServiceNumber || !selectedRfidUid) return;
    setMatching(true);
    setError(null);
    try {
      await matchPersonnel(selectedServiceNumber, selectedRfidUid);
      setSelectedServiceNumber(null);
      setSelectedRfidUid(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  }

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/personnel">사용자 등록</Link> / RFID 매칭
      </div>
      <h2>RFID 매칭</h2>

      {error && <div className="banner-error">{error}</div>}

      <div className="page-toolbar">
        <button type="button" className="primary" disabled={!selectedServiceNumber || !selectedRfidUid || matching} onClick={handleMatch}>
          매칭
        </button>
      </div>

      <div className="match-columns">
        <div className="match-column">
          <h3>미등록 인원 ({unmatchedPersonnel.length})</h3>
          <div className="match-list">
            {unmatchedPersonnel.length === 0 && <p>RFID 매칭 대기 중인 인원이 없습니다.</p>}
            {unmatchedPersonnel.map((person) => (
              <div
                key={person.service_number}
                className={`match-item${selectedServiceNumber === person.service_number ? ' selected' : ''}`}
                onClick={() => setSelectedServiceNumber(person.service_number)}
              >
                <input
                  type="radio"
                  readOnly
                  checked={selectedServiceNumber === person.service_number}
                />
                {person.service_number} — {person.name} ({person.room_code})
              </div>
            ))}
          </div>
        </div>

        <div className="match-column">
          <h3>미매칭 감지 태그 ({unmatchedTags.length})</h3>
          <div className="match-list">
            {unmatchedTags.length === 0 && <p>매칭 대기 중인 감지 태그가 없습니다.</p>}
            {unmatchedTags.map((tag) => (
              <div
                key={tag.rfid_uid}
                className={`match-item${selectedRfidUid === tag.rfid_uid ? ' selected' : ''}`}
                onClick={() => setSelectedRfidUid(tag.rfid_uid)}
              >
                <input type="radio" readOnly checked={selectedRfidUid === tag.rfid_uid} />
                {tag.rfid_uid} — {tag.room_code} ({tag.gateway_id})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonnelMatchPage;
