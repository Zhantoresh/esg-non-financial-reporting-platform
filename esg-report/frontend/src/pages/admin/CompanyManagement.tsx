import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, MapPin, Briefcase, Trash2 } from 'lucide-react';
import { companiesApi, ApiCompany } from '../../services/api';

export function CompanyManagement() {
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', org_type: 'TOO', region: 'almaty_city', industry: 'it_ai', description: '', website: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    companiesApi.list()
      .then(setCompanies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await companiesApi.create({ ...form, is_active: true });
      setCompanies(prev => [created, ...prev]);
      setShowForm(false);
      setForm({ name: '', org_type: 'TOO', region: 'almaty_city', industry: 'it_ai', description: '', website: '' });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить эту компанию?')) return;
    try {
      await companiesApi.delete(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление Компаниями</h1>
          <p className="text-gray-600">Управлять зарегистрированными компаниями и их данными ESG</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Добавить Компанию
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Новая Компания</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input required placeholder="Название компании" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="TOO">ТОО</option>
                <option value="AO">АО</option>
                <option value="NAO">НАО</option>
                <option value="IP">ИП</option>
                <option value="GP">ГП</option>
                <option value="OTHER">Иное</option>
              </select>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="almaty_city">г. Алматы</option>
                <option value="astana">г. Астана</option>
                <option value="shymkent">г. Шымкент</option>
                <option value="">Акмолинская обл.</option>
                <option value="aktobe">Актюбинская обл.</option>
                <option value="atyrau">Атырауская обл.</option>
                <option value="east_kaz">Восточно-Казахстанская обл.</option>
                <option value="zhambyl">Жамбылская обл.</option>
                <option value="zhetysu">Жетысуская обл.</option>
                <option value="west_kaz">Западно-Казахстанская обл.</option>
                <option value="karaganda">Карагандинская обл.</option>
                <option value="kostanay">Костанайская обл.</option>
                <option value="kyzylorda">Кызылординская обл.</option>
                <option value="mangystau">Мангистауская обл.</option>
                <option value="pavlodar">Павлодарская обл.</option>
                <option value="north_kaz">Северо-Казахстанская обл.</option>
                <option value="turkestan">Туркестанская обл.</option>
                <option value="almaty_reg">Алматинская обл.</option>
                <option value="ulytau">Улытауская обл.</option>
              </select>
              <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="it_ai">ИТ / ИИ</option>
                <option value="energy">Энергетика</option>
                <option value="finance">Финансы</option>
                <option value="education">Образование</option>
                <option value="construction">Строительство</option>
                <option value="agriculture">Сельское хозяйство</option>
                <option value="transport">Транспорт и логистика</option>
                <option value="metallurgy">Металлургия</option>
                <option value="other">Иное</option>
              </select>
              <input placeholder="Веб-сайт (необязательно)" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Поиск компании..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{c.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{c.org_type}</p>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{c.region}</div>
                <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />{c.industry}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">{c.activeReports} отчеты</span>
                <span className={`font-semibold ${c.avgScore != null ? 'text-green-600' : 'text-gray-400'}`}>
                  {c.avgScore != null ? `Score: ${c.avgScore}` : 'No score'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">Компаний не найдены.</div>
          )}
        </div>
      )}
    </div>
  );
}
