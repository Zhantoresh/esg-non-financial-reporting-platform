import React from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  ClipboardList, 
  BarChart3,
  LogOut,
  Shield,
  Eye,
  User,
  Calendar
} from 'lucide-react';

export function RootLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

    const path = location.pathname;

  if (user?.role === 'respondent' && path.startsWith('/admin')) {
    return <Navigate to="/respondent/dashboard" replace />;
  }
  if (user?.role === 'respondent' && path.startsWith('/viewer')) {
    return <Navigate to="/respondent/dashboard" replace />;
  }
  if (user?.role === 'viewer' && path.startsWith('/admin')) {
    return <Navigate to="/viewer/dashboard" replace />;
  }
  if (user?.role === 'viewer' && path.startsWith('/respondent')) {
    return <Navigate to="/viewer/dashboard" replace />;
  }
  if (user?.role === 'administrator' && !path.startsWith('/admin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const getNavItems = () => {
    switch (user?.role) {
      case 'administrator':
        return [
          { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Дэшборд' },
          { path: '/admin/users', icon: Users, label: 'Управление пользователями' },
          { path: '/admin/companies', icon: Building2, label: 'Компании' },
          { path: '/admin/questionnaires', icon: ClipboardList, label: 'Опросники' },
          { path: '/admin/reports', icon: FileText, label: 'Все отчеты' },
          { path: '/admin/periods', icon: Calendar, label: 'Периоды' },
        ];
      case 'respondent':
        return [
          { path: '/respondent/dashboard', icon: LayoutDashboard, label: 'Дэшборд' },
          { path: '/respondent/report/new', icon: ClipboardList, label: 'Новый отчет' },
          { path: '/respondent/reports', icon: FileText, label: 'Мои отчеты' },
        ];
      case 'viewer':
        return [
          { path: '/viewer/dashboard', icon: LayoutDashboard, label: 'Дэшборд' },
          { path: '/viewer/reports', icon: FileText, label: 'Отчеты' },
          { path: '/viewer/analytics', icon: BarChart3, label: 'Аналитика' },
        ];
      default:
        return [];
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = getNavItems();
  const roleIcon = {
    administrator: Shield,
    respondent: User,
    viewer: Eye,
  }[user?.role || 'viewer'];

  const RoleIcon = roleIcon;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-orange-500 to-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">ESG Platform</h1>
              <p className="text-xs text-gray-500">Enterprise Analytics</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <RoleIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}