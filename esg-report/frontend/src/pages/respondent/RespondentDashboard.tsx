import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { dashboardApi, DashboardStats, reportsApi, ApiReport } from '../../services/api';
import { Plus, ArrowUpRight, FileText, Clock, TrendingUp, AlertTriangle, Leaf, Users, Shield } from 'lucide-react';
import { RecommendationsBlock } from './components/RecommendationsBlock';
// ─── Types from backend ───────────────────────────────────────────────────────
interface ProblemZone {
  question: string;
  category: 'E' | 'S' | 'G';
  score: number;
  maxScore: number;
  percent: number;
}
interface ExtendedStats extends DashboardStats {
  industryAvg?: number | null;
  problemZones?: ProblemZone[];
}

// ─── Gauge Component ──────────────────────────────────────────────────────────
function Gauge({ value, max = 100, color, label, icon: Icon }: {
  value: number | null | undefined; max?: number; color: string; label: string; icon: React.ElementType;
}) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * (pct / 100);
  const dash = `${filled} ${circ}`;
  const offset = circ * 0.125; // start at -135deg

  const colorMap: Record<string, { stroke: string; bg: string; text: string; iconBg: string }> = {
    green:  { stroke: '#22c55e', bg: '#f0fdf4', text: '#15803d', iconBg: '#bbf7d0' },
    orange: { stroke: '#f97316', bg: '#fff7ed', text: '#c2410c', iconBg: '#fed7aa' },
    blue:   { stroke: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', iconBg: '#bfdbfe' },
    purple: { stroke: '#a855f7', bg: '#faf5ff', text: '#7e22ce', iconBg: '#e9d5ff' },
  };
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center" style={{ minWidth: 0 }}>
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-[135deg]">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="10"
            strokeDasharray={`${arc} ${circ}`} strokeDashoffset={-offset} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.stroke} strokeWidth="10"
            strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1" style={{ background: c.iconBg }}>
            <Icon style={{ color: c.text, width: 16, height: 16 }} />
          </div>
          <span className="text-2xl font-bold" style={{ color: c.text }}>
            {value != null ? Math.round(value) : '—'}
          </span>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}% of max</p>
    </div>
  );
}

// ─── Trend Chart (Chart.js) ───────────────────────────────────────────────────
function TrendChart({ data, industryAvg }: {
  data: Array<{ period: string; e: number; s: number; g: number; total: number }>;
  industryAvg: number | null | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = () => {
      if (chartRef.current) { chartRef.current.destroy(); }
      const Chart = (window as any).Chart;
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.map(d => d.period),
          datasets: [
            {
              label: 'Total ESG',
              data: data.map(d => d.total),
              borderColor: '#8b5cf6', backgroundColor: '#8b5cf615',
              borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#8b5cf6',
              tension: 0.4, fill: true,
            },
            {
              label: 'Environmental',
              data: data.map(d => d.e),
              borderColor: '#22c55e', backgroundColor: 'transparent',
              borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#22c55e',
              tension: 0.4, borderDash: [4, 3],
            },
            {
              label: 'Social',
              data: data.map(d => d.s),
              borderColor: '#f97316', backgroundColor: 'transparent',
              borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#f97316',
              tension: 0.4, borderDash: [4, 3],
            },
            {
              label: 'Governance',
              data: data.map(d => d.g),
              borderColor: '#3b82f6', backgroundColor: 'transparent',
              borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#3b82f6',
              tension: 0.4, borderDash: [4, 3],
            },
            ...(industryAvg != null ? [{
              label: 'Industry avg',
              data: data.map(() => industryAvg),
              borderColor: '#94a3b8', backgroundColor: 'transparent',
              borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0,
            }] : []),
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
              padding: 10, cornerRadius: 8,
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
            y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 25 } },
          },
        },
      });
    };
    if (!(window as any).Chart) {
      document.head.appendChild(script);
    } else {
      script.onload?.(new Event('load'));
    }
    return () => { chartRef.current?.destroy(); };
  }, [data, industryAvg]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
        Нет данных о динамике — сдайте хотя бы 2 отчёта
      </div>
    );
  }

  return <div style={{ position: 'relative', height: 224 }}><canvas ref={canvasRef} /></div>;
}

// ─── Period Comparison Bar Chart ──────────────────────────────────────────────
function PeriodCompareChart({ data }: {
  data: Array<{ period: string; e: number; s: number; g: number; total: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length < 2) return;
    const last2 = data.slice(-2);
    const init = () => {
      if (chartRef.current) { chartRef.current.destroy(); }
      const Chart = (window as any).Chart;
      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: ['Environmental', 'Social', 'Governance', 'Total ESG'],
          datasets: last2.map((d, i) => ({
            label: d.period,
            data: [d.e, d.s, d.g, d.total],
            backgroundColor: i === 0 ? ['#22c55e33', '#f9731633', '#3b82f633', '#8b5cf633']
                                      : ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6'],
            borderColor: i === 0 ? ['#22c55e66', '#f9731666', '#3b82f666', '#8b5cf666']
                                  : ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6'],
            borderWidth: 1.5, borderRadius: 6, barPercentage: 0.65,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 10 },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
            y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 25 } },
          },
        },
      });
    };
    if ((window as any).Chart) init();
    else {
      const s = document.querySelector('script[src*="Chart.js"]');
      if (s) s.addEventListener('load', init);
      else {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        sc.onload = init;
        document.head.appendChild(sc);
      }
    }
    return () => { chartRef.current?.destroy(); };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Нужно минимум 2 отчёта для сравнения периодов
      </div>
    );
  }
  const last2 = data.slice(-2);
  return (
    <div>
      <div className="flex gap-4 mb-3">
        {last2.map((d, i) => (
          <span key={d.period} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i === 0 ? '#8b5cf633' : '#8b5cf6', border: `1.5px solid ${i === 0 ? '#8b5cf666' : '#8b5cf6'}` }} />
            {d.period}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', height: 180 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

// ─── Problem Zones ────────────────────────────────────────────────────────────
function ProblemZones({ zones }: { zones: ProblemZone[] }) {
  const catColor: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    E: { bg: 'bg-green-50', text: 'text-green-700', icon: Leaf },
    S: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Users },
    G: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Shield },
  };

  if (zones.length === 0) return (
    <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
      Проблемных зон не обнаружено
    </div>
  );

  return (
    <div className="space-y-3">
      {zones.map((z, i) => {
        const c = catColor[z.category] ?? catColor.E;
        const CatIcon = c.icon;
        const pct = z.percent;
        const barColor = pct < 30 ? '#ef4444' : pct < 60 ? '#f97316' : '#22c55e';
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${c.bg}`}>
              <CatIcon className={`w-3.5 h-3.5 ${c.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate mb-1" title={z.question}>{z.question}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                  {z.score?.toFixed(1)}/{z.maxScore} ({pct}%)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function RespondentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ExtendedStats>({});
  const [recentReports, setRecentReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.stats(), reportsApi.list()])
      .then(([s, reports]) => {
        setStats(s as ExtendedStats);
        setRecentReports(reports.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const trendData = stats.trendData ?? [];
  const problemZones: ProblemZone[] = (stats as any).problemZones ?? [];
  const industryAvg = (stats as any).industryAvg ?? null;

  const statusColor = (s: string) => {
    if (s === 'submitted') return 'bg-green-100 text-green-700';
    if (s === 'draft')     return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const latestPrev = trendData.length >= 2 ? trendData[trendData.length - 2] : null;
  const latestCurr = trendData.length >= 1 ? trendData[trendData.length - 1] : null;
  const delta = (latestCurr && latestPrev)
    ? +(latestCurr.total - latestPrev.total).toFixed(1)
    : null;

  if (loading) return <div className="p-8 text-center text-gray-400">Загрузка...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мой дашборд</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {user?.name}{user?.companyName ? ` · ${user.companyName}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/respondent/report/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Новый отчёт
        </button>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Всего отчётов</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalReports ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.submittedReports ?? 0} сданы</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Черновики</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.draftReports ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">не сданы</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Последний балл</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.latestScore != null ? Math.round(stats.latestScore) : '—'}
          </p>
          {delta !== null && (
            <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs предыдущий
            </p>
          )}
          {industryAvg !== null && (
            <p className="text-xs text-gray-400 mt-0.5">
              Отрасль: {industryAvg}
            </p>
          )}
        </div>
      </div>

      {/* E / S / G Gauges */}
      {stats.latestScore != null && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            ESG показатели — последний отчёт
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <Gauge value={stats.latestEScore} color="green"  label="Environmental" icon={Leaf} />
            <Gauge value={stats.latestSScore} color="orange" label="Social"         icon={Users} />
            <Gauge value={stats.latestGScore} color="blue"   label="Governance"     icon={Shield} />
            <Gauge value={stats.latestScore}  color="purple" label="Total ESG"      icon={TrendingUp} />
          </div>

          {/* Industry comparison strip */}
          {industryAvg !== null && (
            <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 px-5 py-3 flex items-center gap-4">
              <span className="text-xs text-gray-500 flex-shrink-0">Сравнение с отраслью</span>
              <div className="flex-1 relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute h-full bg-purple-500 rounded-full opacity-30 transition-all"
                  style={{ width: `${Math.min(100, industryAvg)}%` }} />
                <div className="absolute h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.latestScore!)}%` }} />
              </div>
              <div className="text-xs text-gray-600 flex gap-4 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                  Ваш: <strong>{Math.round(stats.latestScore!)}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-300 inline-block" />
                  Отрасль: <strong>{industryAvg}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Динамика по периодам</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              {[{ color: '#8b5cf6', label: 'Total' }, { color: '#22c55e', label: 'E' }, { color: '#f97316', label: 'S' }, { color: '#3b82f6', label: 'G' }].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
              {industryAvg !== null && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded bg-slate-400" style={{ borderTop: '1.5px dashed #94a3b8', background: 'none' }} />
                  Отрасль
                </span>
              )}
            </div>
          </div>
          <TrendChart data={trendData} industryAvg={industryAvg} />
        </div>

        {/* Period comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Сравнение периодов</h2>
          <PeriodCompareChart data={trendData} />
        </div>
      </div>

      {/* Problem Zones + Recent Reports */}
      <div className="grid grid-cols-2 gap-6">
        {/* Problem zones */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-800">Проблемные зоны</h2>
            <span className="text-xs text-gray-400 ml-auto">5 вопросов с min. баллами</span>
          </div>
          <ProblemZones zones={problemZones} />
        </div>
      
        {/* Recent reports */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Последние отчёты</h2>
            <button onClick={() => navigate('/respondent/reports')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Все <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {recentReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              <span>Нет отчётов. Создайте первый!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.questionnaireName}</p>
                    <p className="text-xs text-gray-400">{r.periodName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                    {r.total_score != null && (
                      <span className="text-sm font-bold text-gray-900">{Math.round(r.total_score)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RecommendationsBlock />
    </div>
  );
}
