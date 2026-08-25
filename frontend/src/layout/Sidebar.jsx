import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_GROUPS = [
  {
    title: '모니터링',
    items: [
      { label: '전체', to: '/' },
      { label: '중대별', to: '/dashboard/by-base' },
      { label: '내무반별', to: '/dashboard/by-room' },
    ],
  },
  {
    title: '이벤트 처리',
    items: [{ label: '이벤트 로그', to: '/events' }],
  },
  { label: '보관함 개폐 관리/제어', to: '/schedules' },
  {
    title: '사용자/RFID 등록',
    items: [
      { label: '사용자 등록', to: '/personnel' },
      { label: 'RFID 등록', to: '/personnel/match' },
    ],
  },
  {
    title: '환경 설정',
    items: [
      { label: '조직 구성', to: '/bases' },
      { label: '게이트웨이 등록', to: '/gateways' },
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

function SidebarFlatLink({ label, to }) {
  return (
    <div className="sidebar-group">
      <NavLink to={to} className={({ isActive }) => `sidebar-flat-link${isActive ? ' active' : ''}`}>
        {label}
      </NavLink>
    </div>
  );
}

function Sidebar() {
  return (
    <nav className="app-sidebar">
      {NAV_GROUPS.map((entry) =>
        entry.items ? (
          <SidebarGroup key={entry.title} title={entry.title} items={entry.items} />
        ) : (
          <SidebarFlatLink key={entry.to} label={entry.label} to={entry.to} />
        )
      )}
    </nav>
  );
}

export default Sidebar;
