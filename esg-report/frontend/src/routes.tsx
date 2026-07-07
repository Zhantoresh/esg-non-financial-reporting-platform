import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
// 4.1 Восстановление пароля по email
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { CompanyManagement } from './pages/admin/CompanyManagement';
import { QuestionnaireBuilder } from './pages/admin/QuestionnaireBuilder';
import { AdminReports } from './pages/admin/AdminReports';
import { RespondentDashboard } from './pages/respondent/RespondentDashboard';
import { ReportWizard } from './pages/respondent/ReportWizard';
import { MyReports } from './pages/respondent/MyReports';
import { ViewerDashboard } from './pages/viewer/ViewerDashboard';
import { ViewerReports } from './pages/viewer/ViewerReports';
import { ViewerAnalytics } from './pages/viewer/ViewerAnalytics';
import { useAuth } from './contexts/AuthContext';

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'administrator') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'respondent') return <Navigate to="/respondent/dashboard" replace />;
  if (user?.role === 'viewer') return <Navigate to="/viewer/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/register',
    Component: RegisterPage,
  },
  // 4.1: Страницы восстановления пароля (без авторизации)
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
  },
  {
    path: '/reset-password',
    Component: ResetPasswordPage,
  },
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // Admin routes
      {
        path: 'admin',
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', Component: AdminDashboard },
          { path: 'users', Component: UserManagement },
          { path: 'companies', Component: CompanyManagement },
          { path: 'questionnaires', Component: QuestionnaireBuilder },
          { path: 'reports', Component: AdminReports },
        ],
      },
      // Respondent routes
      {
        path: 'respondent',
        children: [
          { index: true, element: <Navigate to="/respondent/dashboard" replace /> },
          { path: 'dashboard', Component: RespondentDashboard },
          { path: 'report/new', Component: ReportWizard },
          { path: 'report/:reportId/edit', Component: ReportWizard },
          { path: 'reports', Component: MyReports },
        ],
      },
      // Viewer routes
      {
        path: 'viewer',
        children: [
          { index: true, element: <Navigate to="/viewer/dashboard" replace /> },
          { path: 'dashboard', Component: ViewerDashboard },
          { path: 'reports', Component: ViewerReports },
          { path: 'analytics', Component: ViewerAnalytics },
        ],
      },
      // Common dashboard redirect
      {
        path: 'dashboard',
        element: <DashboardRedirect />,
      },
    ],
  },
]);
