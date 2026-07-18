import React, { useEffect, useState } from 'react';
import { Lightbulb, Leaf, Users, Shield, AlertCircle } from 'lucide-react';
import { recommendationsApi, ApiRecommendation } from '../../../services/api';

// Структура подтверждена по коду Алуа (reports/models.py + api/views.py):
// GET /reports/<id>/recommendations/ → [{ id, category, title, description, priority }]
// priority — число, 1 = высокий приоритет.

// В модели у Алуа priority — число, 1 = высокий приоритет (см. reports/models.py)
function getPriorityStyle(priority: number): { label: string; bg: string; text: string; dot: string } {
  if (priority <= 1) return { label: 'Высокий приоритет', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' };
  if (priority === 2) return { label: 'Средний приоритет', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' };
  return { label: 'Низкий приоритет', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' };
}

const categoryConfig: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  E: { bg: 'bg-green-50',  text: 'text-green-700',  icon: Leaf,  label: 'Environmental' },
  S: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Users, label: 'Social' },
  G: { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: Shield, label: 'Governance' },
};

function RecommendationCard({ rec }: { rec: ApiRecommendation }) {
  const cat = categoryConfig[rec.category] ?? categoryConfig.E;
  const prio = getPriorityStyle(rec.priority);
  const CatIcon = cat.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${cat.bg}`}>
        <CatIcon className={`w-4 h-4 ${cat.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900">{rec.title}</p>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${prio.bg} ${prio.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{rec.description}</p>
      </div>
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-2.5 bg-gray-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecommendationsBlock({ reportId }: { reportId?: number }) {
  const [recommendations, setRecommendations] = useState<ApiRecommendation[]>([]);
  const [loading, setLoading] = useState(!!reportId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Эндпоинт вложенный (/reports/<id>/recommendations/), поэтому без id отчёта
    // запрос делать нельзя — просто ничего не показываем (например, когда у
    // респондента ещё нет ни одного отчёта).
    if (!reportId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    recommendationsApi.list(reportId)
      .then(data => { if (!cancelled) setRecommendations(data); })
      .catch(err => { if (!cancelled) setError(err.message ?? 'Не удалось загрузить рекомендации'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [reportId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-purple-500" />
        <h2 className="text-sm font-semibold text-gray-800">Рекомендации</h2>
        {recommendations.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{recommendations.length}</span>
        )}
      </div>

      {loading && <RecommendationsSkeleton />}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
          <AlertCircle className="w-8 h-8 opacity-30" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
          <Lightbulb className="w-8 h-8 opacity-30" />
          <span>Пока нет рекомендаций — все показатели в порядке</span>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map(rec => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}