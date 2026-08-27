import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import GatewayListPage from './pages/gateways/GatewayListPage';
import GatewayFormPage from './pages/gateways/GatewayFormPage';
import OrgStructurePage from './pages/org/OrgStructurePage';
import DashboardBasesPage from './pages/dashboard/DashboardBasesPage';
import DashboardByBasePage from './pages/dashboard/DashboardByBasePage';
import DashboardByRoomPage from './pages/dashboard/DashboardByRoomPage';
import PersonnelListPage from './pages/personnel/PersonnelListPage';
import PersonnelFormPage from './pages/personnel/PersonnelFormPage';
import PersonnelMatchPage from './pages/personnel/PersonnelMatchPage';
import SchedulePage from './pages/schedules/SchedulePage';
import EventLogPage from './pages/events/EventLogPage';
import EventHandlingPage from './pages/events/EventHandlingPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardBasesPage /> },
      { path: 'dashboard/by-base', element: <DashboardByBasePage /> },
      { path: 'dashboard/by-base/:baseCode', element: <DashboardByBasePage /> },
      { path: 'dashboard/by-room', element: <DashboardByRoomPage /> },
      { path: 'dashboard/by-room/:roomCode', element: <DashboardByRoomPage /> },
      { path: 'events', element: <EventLogPage /> },
      { path: 'events/handling', element: <EventHandlingPage /> },
      { path: 'gateways', element: <GatewayListPage /> },
      { path: 'gateways/new', element: <GatewayFormPage /> },
      { path: 'gateways/:gatewayId/edit', element: <GatewayFormPage /> },
      { path: 'org', element: <OrgStructurePage /> },
      { path: 'personnel', element: <PersonnelListPage /> },
      { path: 'personnel/new', element: <PersonnelFormPage /> },
      { path: 'personnel/match', element: <PersonnelMatchPage /> },
      { path: 'personnel/:serviceNumber/edit', element: <PersonnelFormPage /> },
      { path: 'schedules', element: <SchedulePage /> },
    ],
  },
]);

export default router;
