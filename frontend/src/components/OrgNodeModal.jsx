import { useState } from 'react';
import { createOrgGroup, updateOrgGroup, deleteOrgGroup } from '../api/orgGroups';
import { createBase, updateBase, deleteBase } from '../api/bases';
import { createBuilding, updateBuilding, deleteBuilding } from '../api/buildings';
import { createRoom, updateRoom, deleteRoom } from '../api/rooms';
import '../styles/crud.css';
import './templateManagerModal.css';

const TYPE_LABELS = {
  org: { title: '조직', codeLabel: 'org_code', nameLabel: '조직 이름' },
  base: { title: '중대', codeLabel: 'base_code', nameLabel: '중대 이름' },
  building: { title: '소대', codeLabel: 'building_code', nameLabel: '소대 이름' },
  room: { title: '내무반', codeLabel: 'room_code', nameLabel: '내무반 이름' },
};

async function createNode(nodeType, parentCode, code, name) {
  if (nodeType === 'org') {
    return createOrgGroup({ org_code: code, parent_org_code: parentCode || undefined, org_name: name });
  }
  if (nodeType === 'base') {
    return createBase({ base_code: code, base_name: name, parent_org_code: parentCode || undefined });
  }
  if (nodeType === 'building') {
    return createBuilding({ building_code: code, base_code: parentCode, building_name: name });
  }
  return createRoom({ room_code: code, building_code: parentCode, room_name: name });
}

async function updateNode(nodeType, code, name) {
  if (nodeType === 'org') return updateOrgGroup(code, { org_name: name });
  if (nodeType === 'base') return updateBase(code, { base_name: name });
  if (nodeType === 'building') return updateBuilding(code, { building_name: name });
  return updateRoom(code, { room_name: name });
}

async function deleteNode(nodeType, code) {
  if (nodeType === 'org') return deleteOrgGroup(code);
  if (nodeType === 'base') return deleteBase(code);
  if (nodeType === 'building') return deleteBuilding(code);
  return deleteRoom(code);
}

function OrgNodeModal({ mode, nodeType, parentCode, existing, onClose }) {
  const labels = TYPE_LABELS[nodeType];
  const isEditing = mode === 'edit';

  const [code, setCode] = useState(isEditing ? existing.code : parentCode ? `${parentCode}-` : '');
  const [name, setName] = useState(isEditing ? existing.name : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await updateNode(nodeType, existing.code, name.trim());
      } else {
        await createNode(nodeType, parentCode, code.trim(), name.trim());
      }
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${existing.code}를(을) 삭제하시겠습니까?`)) return;
    setError(null);
    try {
      await deleteNode(nodeType, existing.code);
      onClose(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>{isEditing ? `${labels.title} 수정` : `${labels.title} 추가`}</h3>
          <button type="button" className="modal-close" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="crud-form">
            <div className="form-field">
              <label htmlFor="org_node_code">{labels.codeLabel}</label>
              <input
                id="org_node_code"
                type="text"
                value={code}
                disabled={isEditing}
                required
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="org_node_name">{labels.nameLabel}</label>
              <input
                id="org_node_name"
                type="text"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary" disabled={saving}>
              {isEditing ? '저장' : '등록'}
            </button>
            <button type="button" onClick={() => onClose(false)}>
              취소
            </button>
            {isEditing && (
              <button type="button" onClick={handleDelete}>
                삭제
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrgNodeModal;
