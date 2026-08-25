import { useEffect, useState } from 'react';
import { listOrgGroups } from '../../api/orgGroups';
import { listBases } from '../../api/bases';
import { listBuildings } from '../../api/buildings';
import { listRooms } from '../../api/rooms';
import OrgNodeModal from '../../components/OrgNodeModal';
import '../../styles/crud.css';
import './orgStructure.css';

function sortByCode(nodes) {
  return nodes.sort((a, b) => a.code.localeCompare(b.code));
}

function buildTree(orgGroups, bases, buildings, rooms) {
  const orgNodes = orgGroups.map((o) => ({
    type: 'org',
    code: o.org_code,
    name: o.org_name,
    parentCode: o.parent_org_code,
    children: [],
  }));
  const baseNodes = bases.map((b) => ({
    type: 'base',
    code: b.base_code,
    name: b.base_name,
    parentCode: b.parent_org_code,
    children: [],
  }));
  const buildingNodes = buildings.map((b) => ({
    type: 'building',
    code: b.building_code,
    name: b.building_name,
    parentCode: b.base_code,
    children: [],
  }));
  const roomNodes = rooms.map((r) => ({
    type: 'room',
    code: r.room_code,
    name: r.room_name,
    parentCode: r.building_code,
    children: [],
  }));

  const byOrgCode = new Map(orgNodes.map((n) => [n.code, n]));
  const byBaseCode = new Map(baseNodes.map((n) => [n.code, n]));
  const byBuildingCode = new Map(buildingNodes.map((n) => [n.code, n]));

  const roots = [];

  for (const n of orgNodes) {
    if (n.parentCode && byOrgCode.has(n.parentCode)) byOrgCode.get(n.parentCode).children.push(n);
    else roots.push(n);
  }
  for (const n of baseNodes) {
    if (n.parentCode && byOrgCode.has(n.parentCode)) byOrgCode.get(n.parentCode).children.push(n);
    else roots.push(n);
  }
  for (const n of buildingNodes) {
    if (byBaseCode.has(n.parentCode)) byBaseCode.get(n.parentCode).children.push(n);
  }
  for (const n of roomNodes) {
    if (byBuildingCode.has(n.parentCode)) byBuildingCode.get(n.parentCode).children.push(n);
  }

  for (const n of [...orgNodes, ...baseNodes, ...buildingNodes]) sortByCode(n.children);

  return sortByCode(roots);
}

function TreeNode({ node, onAdd, onEdit }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isLeaf = node.type === 'room';

  return (
    <div className="org-tree-node">
      <div className="org-tree-row">
        {!isLeaf ? (
          <button type="button" className="org-tree-toggle" onClick={() => setOpen((v) => !v)}>
            {hasChildren ? (open ? '▾' : '▸') : '·'}
          </button>
        ) : (
          <span className="org-tree-toggle" />
        )}
        <span className="org-tree-label" onClick={() => onEdit(node)}>
          {node.code} — {node.name}
        </span>
        <span className="org-tree-actions">
          {node.type === 'org' && (
            <>
              <button type="button" onClick={() => onAdd('org', node.code)}>
                + 하위 조직
              </button>
              <button type="button" onClick={() => onAdd('base', node.code)}>
                + 중대
              </button>
            </>
          )}
          {node.type === 'base' && (
            <button type="button" onClick={() => onAdd('building', node.code)}>
              + 소대
            </button>
          )}
          {node.type === 'building' && (
            <button type="button" onClick={() => onAdd('room', node.code)}>
              + 내무반
            </button>
          )}
        </span>
      </div>
      {open && hasChildren && (
        <div className="org-tree-children">
          {node.children.map((child) => (
            <TreeNode key={`${child.type}-${child.code}`} node={child} onAdd={onAdd} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgStructurePage() {
  const [tree, setTree] = useState([]);
  const [modalState, setModalState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orgGroups, bases, buildings, rooms] = await Promise.all([
        listOrgGroups(),
        listBases(),
        listBuildings(),
        listRooms(),
      ]);
      setTree(buildTree(orgGroups, bases, buildings, rooms));
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

  function openAdd(nodeType, parentCode) {
    setModalState({ mode: 'add', nodeType, parentCode });
  }

  function openEdit(node) {
    setModalState({ mode: 'edit', nodeType: node.type, existing: { code: node.code, name: node.name } });
  }

  function closeModal(changed) {
    setModalState(null);
    if (changed) load();
  }

  return (
    <div>
      <h2>조직 구성</h2>

      {error && <div className="banner-error">{error}</div>}

      <div className="page-toolbar">
        <button type="button" onClick={() => openAdd('org', null)}>
          + 최상위 조직
        </button>
        <button type="button" onClick={() => openAdd('base', null)}>
          + 최상위 중대
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : tree.length === 0 ? (
        <div className="empty-state">등록된 조직이 없습니다.</div>
      ) : (
        <div className="org-tree">
          {tree.map((node) => (
            <TreeNode key={`${node.type}-${node.code}`} node={node} onAdd={openAdd} onEdit={openEdit} />
          ))}
        </div>
      )}

      {modalState && (
        <OrgNodeModal
          mode={modalState.mode}
          nodeType={modalState.nodeType}
          parentCode={modalState.parentCode}
          existing={modalState.existing}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default OrgStructurePage;
