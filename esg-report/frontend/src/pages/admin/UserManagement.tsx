import React, { useState, useEffect } from 'react';
import { Search, Shield, User, Eye, Ban, Unlock, Trash2, Plus, X } from 'lucide-react';
import { usersApi, ApiUserAdmin } from '../../services/api';

export function UserManagement() {
  const [users, setUsers] = useState<ApiUserAdmin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'respondent',
  });

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleBlock = async (id: number) => {
    try {
      await usersApi.toggleBlock(id);
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u
      ));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      await usersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await usersApi.create(newUser);
      setUsers(prev => [...prev, created]);
      setShowModal(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'respondent' });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    if (role === 'administrator') return Shield;
    if (role === 'viewer') return Eye;
    return User;
  };

  const getRoleColor = (role: string) => {
    if (role === 'administrator') return 'bg-purple-100 text-purple-700';
    if (role === 'respondent') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление пользователями</h1>
          <p className="text-gray-600">Управление учетными записями пользователей, ролями и доступами</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать пользователя
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Новый пользователь</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Имя"
                value={newUser.first_name}
                onChange={e => setNewUser(p => ({ ...p, first_name: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Фамилия"
                value={newUser.last_name}
                onChange={e => setNewUser(p => ({ ...p, last_name: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <select
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="respondent">Respondent</option>
                <option value="viewer">Viewer</option>
              </select>
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

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск пользователя..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все роли</option>
            <option value="administrator">Администратор</option>
            <option value="respondent">Респондент</option>
            <option value="viewer">Пользователь</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка пользователей...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Компания</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Последний вход</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => {
                const RoleIcon = getRoleIcon(u.role);
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{u.name}</div>
                      <div className="text-gray-500 text-xs">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>
                        <RoleIcon className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.company || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{u.lastLogin || 'Never'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleBlock(u.id)}
                          title={u.status === 'active' ? 'Block' : 'Unblock'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        >
                          {u.status === 'active' ? <Ban className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Пользователи не найдены.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}