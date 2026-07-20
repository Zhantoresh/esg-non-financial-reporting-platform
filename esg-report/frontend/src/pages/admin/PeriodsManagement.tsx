import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { periodsApi, ApiPeriod } from '../../services/api';

export function PeriodManagement() {
  const [periods, setPeriods] = useState<ApiPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    year: new Date().getFullYear(),
    quarter: 1,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    periodsApi.list()
      .then(setPeriods)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await periodsApi.create(newPeriod);
      setPeriods(prev => [...prev, created]);
      setShowModal(false);
      setNewPeriod({ name: '', year: new Date().getFullYear(), quarter: 1, start_date: '', end_date: '' });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Отчётные периоды</h1>
          <p className="text-gray-600">Управление периодами для сбора ESG-отчётов</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать период
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Новый период</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Название (например: Q1 2026)"
                value={newPeriod.name}
                onChange={e => setNewPeriod(p => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Год"
                value={newPeriod.year}
                onChange={e => setNewPeriod(p => ({ ...p, year: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <select
                value={newPeriod.quarter}
                onChange={e => setNewPeriod(p => ({ ...p, quarter: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value={1}>Q1 (Январь — Март)</option>
                <option value={2}>Q2 (Апрель — Июнь)</option>
                <option value={3}>Q3 (Июль — Сентябрь)</option>
                <option value={4}>Q4 (Октябрь — Декабрь)</option>
              </select>
              <input
                type="date"
                placeholder="Дата начала"
                value={newPeriod.start_date}
                onChange={e => setNewPeriod(p => ({ ...p, start_date: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="date"
                placeholder="Дата окончания"
                value={newPeriod.end_date}
                onChange={e => setNewPeriod(p => ({ ...p, end_date: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors text-sm disabled:opacity-50"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Год</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Квартал</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.year}</td>
                  <td className="px-6 py-4 text-gray-600">{p.quarter ? `Q${p.quarter}` : '—'}</td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400">Периодов пока нет.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}