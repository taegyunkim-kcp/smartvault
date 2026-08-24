import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import ComingSoonPage from './pages/ComingSoonPage';
import GatewayListPage from './pages/gateways/GatewayListPage';
import GatewayFormPage from './pages/gateways/GatewayFormPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ComingSoonPage title="전체 현황" description="중대/소대/내무반 드릴다운 대시보드는 준비 중입니다." /> },
      { path: 'events', element: <ComingSoonPage title="이벤트 로그" /> },
      { path: 'gateways', element: <GatewayListPage /> },
      { path: 'gateways/new', element: <GatewayFormPage /> },
      { path: 'gateways/:gatewayId/edit', element: <GatewayFormPage /> },
      { path: 'users', element: <ComingSoonPage title="사용자 등록" /> },
      { path: 'schedules', element: <ComingSoonPage title="개폐 시간표 관리" /> },
    ],
  },
]);

export default router;
