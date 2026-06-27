import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { dashboardApi, DashboardStats, reportsApi, ApiReport } from '../../services/api';
import { Users, Building2, FileText, TrendingUp } from 'lucide-react';


export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentReports, setRecentReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.stats(), reportsApi.list()])
      .then(([s, reports]) => {
        setStats(s);
        setRecentReports(reports.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => {
    if (s === 'submitted') return 'bg-green-100 text-green-700';
    if (s === 'draft') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Дэшборд Администратора</h1>
        <p className="text-gray-600">С возвращением, {user?.name}. Здесь обзор вашей платформы.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Общее количество пользователей" value={String(stats.totalUsers ?? '—')} icon={Users} color="blue" />
            <StatCard title="Действующие компании" value={String(stats.totalCompanies ?? '—')} icon={Building2} color="green" />
            <StatCard title="Общее количество отчетов" value={String(stats.totalReports ?? '—')} icon={FileText} color="orange" />
            <StatCard title="Средний ESG Score" value={stats.avgEsgScore != null ? String(stats.avgEsgScore) : '—'} icon={TrendingUp} color="gray" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Последние отчеты</h2>
            {recentReports.length === 0 ? (
              <p className="text-gray-400 text-sm">Отчетов пока нет.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Компания</th>
                      <th className="pb-3 font-medium">Период</th>
                      <th className="pb-3 font-medium">Статус</th>
                      <th className="pb-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map(r => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium text-gray-900">{r.companyName}</td>
                        <td className="py-3 text-gray-600">{r.periodName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{r.total_score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
