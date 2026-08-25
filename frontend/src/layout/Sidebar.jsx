import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_GROUPS = [
  {
    title: '모니터링',
    items: [{ label: '전체 현황', to: '/' }],
  },
  {
    title: '이벤트 처리',
    items: [{ label: '이벤트 로그', to: '/events' }],
  },
  {
    title: '등록 및 관리',
    items: [
      { label: '중대 관리', to: '/bases' },
      { label: '소대 관리', to: '/buildings' },
      { label: '내무반 관리', to: '/rooms' },
      { label: '게이트웨이 관리', to: '/gateways' },
      { label: '사용자 등록', to: '/personnel' },
      { label: 'RFID 매칭', to: '/personnel/match' },
      { label: '개폐 시간표 관리', to: '/schedules' },
    ],
  },
];

function SidebarGroup({ title, items }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="sidebar-group">
      <button type="button" className="sidebar-group-title" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && (
        <div className="sidebar-group-items">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  return (
    <nav className="app-sidebar">
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.title} title={group.title} items={group.items} />
      ))}
    </nav>
  );
}

export default Sidebar;
