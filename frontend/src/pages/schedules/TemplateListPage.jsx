import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, deleteTemplate } from '../../api/doorScheduleTemplates';
import '../../styles/crud.css';

function TemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setTemplates(await listTemplates());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleDelete(event, templateCode) {
    event.stopPropagation();
    if (!window.confirm(`${templateCode} 템플릿을 삭제하시겠습니까?`)) return;

    try {
      await deleteTemplate(templateCode);
      setTemplates((prev) => prev.filter((t) => t.template_code !== templateCode));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>정책 템플릿 관리</h2>

      <div className="page-toolbar">
        <div className="spacer" />
        <button type="button" className="primary" onClick={() => navigate('/schedule-templates/new')}>
          + 새 템플릿
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>template_code</th>
              <th>이름</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={3}>등록된 템플릿이 없습니다.</td>
              </tr>
            )}
            {templates.map((template) => (
              <tr
                key={template.template_code}
                onClick={() => navigate(`/schedule-templates/${template.template_code}/edit`)}
              >
                <td>{template.template_code}</td>
                <td>{template.template_name}</td>
                <td className="actions">
                  <button type="button" onClick={(e) => handleDelete(e, template.template_code)}>
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

export default TemplateListPage;
