import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Edit, CheckCircle, Clock } from 'lucide-react';
import { reportsApi, ApiReport } from '../../services/api';

export function MyReports() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    reportsApi.list()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string) => {
    if (s === 'submitted') return { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', label: 'Submitted' };
    if (s === 'reviewed') return { icon: CheckCircle, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Reviewed' };
    return { icon: Clock, bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои отчеты</h1>
          <p className="text-gray-600">Отслеживайте свои материалы ESG и управляйте ими</p>
        </div>
        <button onClick={() => navigate('/respondent/report/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Новый отчет
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-2">Отчетов пока нет</p>
          <p className="text-sm">Для начала создайте свой первый ESG-отчет.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(r => {
            const badge = statusBadge(r.status);
            const Icon = badge.icon;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    <Icon className="w-3 h-3" />{badge.label}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{r.questionnaireName}</h3>
                <p className="text-xs text-gray-500 mb-4">{r.periodName}</p>

                {r.total_score != null && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[['E', r.eScore], ['S', r.sScore], ['G', r.gScore]].map(([k, v]) => (
                      <div key={k as string} className="text-center bg-gray-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">{k as string}</p>
                        <p className="text-sm font-bold text-gray-900">{(v as number)?.toFixed(0) ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {r.status === 'draft' && (
                  <button onClick={() => navigate(`/respondent/report/${r.id}/edit`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                    <Edit className="w-4 h-4" /> Продолжить изменения
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
