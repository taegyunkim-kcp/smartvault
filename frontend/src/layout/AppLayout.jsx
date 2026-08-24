import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './layout.css';

function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
