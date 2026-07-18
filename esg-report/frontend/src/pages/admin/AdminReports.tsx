import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, FileText, CheckCircle, Clock,
  Download, FileSpreadsheet, Loader2, ChevronDown, ClipboardCheck,
} from 'lucide-react';
import { reportsApi, ApiReport } from '../../services/api';
import {
  exportToPDF, exportToExcel, exportBulkToExcel,
  buildExportData,
} from '../../services/exportReport';

function ExportMenu({ report }: { report: ApiReport }) {
  const [open, setOpen] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingXLS, setLoadingXLS] = useState(false);

  const handlePDF = useCallback(async () => {
    setOpen(false);
    setLoadingPDF(true);
    try {
      const answers = await reportsApi.getAnswers(report.id);
      const data = await buildExportData(report, answers);
      await exportToPDF(data);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Ошибка экспорта PDF');
    } finally {
      setLoadingPDF(false);
    }
  }, [report]);

  const handleExcel = useCallback(async () => {
    setOpen(false);
    setLoadingXLS(true);
    try {
      const answers = await reportsApi.getAnswers(report.id);
      const data = await buildExportData(report, answers);
      await exportToExcel(data);
    } catch (e) {
      console.error('Excel export failed', e);
      alert('Ошибка экспорта Excel');
    } finally {
      setLoadingXLS(false);
    }
  }, [report]);

  const busy = loadingPDF || loadingXLS;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => !busy && setOpen(o => !o)}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        Скачать
        {!busy && <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 text-sm overflow-hidden">
            <button
              onClick={handlePDF}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
            >
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              Скачать PDF
            </button>
            <button
              onClick={handleExcel}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
              Скачать Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewModal({
  report,
  onClose,
  onReviewed,
}: {
  report: ApiReport;
  onClose: () => void;
  onReviewed: (updated: ApiReport) => void;
}) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await reportsApi.review(report.id, notes);
      onReviewed(updated);
      onClose();
    } catch (e) {
      console.error('Review failed', e);
      alert('Ошибка при проверке отчёта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Отметить как проверено</h2>
        <p className="text-sm text-gray-500 mb-4">
          {report.companyName} — {report.periodName}
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Заметки ревьюера (необязательно)..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminReports() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reviewingReport, setReviewingReport] = useState<ApiReport | null>(null);

  useEffect(() => {
    reportsApi.list()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string) => {
    if (s === 'submitted') return { label: 'Submitted', cls: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (s === 'reviewed')  return { label: 'Reviewed',  cls: 'bg-purple-100 text-purple-700', icon: CheckCircle };
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  const filtered = reports.filter(r => {
    const matchSearch =
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.respondentName?.toLowerCase().includes(search.toLowerCase()) ||
      r.periodName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleBulkExcel = async () => {
    if (filtered.length === 0) return;
    setBulkLoading(true);
    try {
      await exportBulkToExcel(filtered);
    } catch (e) {
      console.error('Bulk export failed', e);
      alert('Ошибка экспорта');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleReviewed = (updated: ApiReport) => {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {reviewingReport && (
        <ReviewModal
          report={reviewingReport}
          onClose={() => setReviewingReport(null)}
          onReviewed={handleReviewed}
        />
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Все отчёты</h1>
          <p className="text-gray-500 text-sm">Просмотр и экспорт ESG-отчётов всех компаний</p>
        </div>
        <button
          onClick={handleBulkExcel}
          disabled={bulkLoading || filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulkLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FileSpreadsheet className="w-4 h-4" />}
          Экспорт в Excel
          {!bulkLoading && filtered.length > 0 && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-0.5">
              {filtered.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по компании, респонденту, периоду..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновики</option>
          <option value="submitted">Сданы</option>
          <option value="reviewed">Проверены</option>
        </select>
        {(search || filterStatus !== 'all') && (
          <span className="self-center text-xs text-gray-400 flex-shrink-0">
            {filtered.length} из {reports.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Загрузка...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Компания</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Респондент</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Период</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">E / S / G</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const badge = statusBadge(r.status);
                const Icon = badge.icon;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900">{r.companyName}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.respondentName}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.periodName}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                          <Icon className="w-3 h-3" />{badge.label}
                        </span>
                        {r.reviewer_notes && (
                          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={r.reviewer_notes}>
                            💬 {r.reviewer_notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {r.eScore != null ? (
                        <span className="font-mono text-xs text-gray-600">
                          <span className="text-green-600">{Math.round(r.eScore)}</span>
                          {' / '}
                          <span className="text-orange-600">{Math.round(r.sScore ?? 0)}</span>
                          {' / '}
                          <span className="text-blue-600">{Math.round(r.gScore ?? 0)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {r.total_score != null ? (
                        <span className="font-bold text-gray-900">{Math.round(r.total_score)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'submitted' && (
                          <button
                            onClick={() => setReviewingReport(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            Проверить
                          </button>
                        )}
                        <ExportMenu report={r} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400">Отчётов не найдено</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
              <span>{filtered.length} отчёт{filtered.length !== 1 ? 'ов' : ''}</span>
              <span>Только администраторы могут скачивать отчёты</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}