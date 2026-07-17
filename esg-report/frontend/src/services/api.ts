// Base API configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  endpoint: string,
  data?: unknown,
  requiresAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = localStorage.getItem('esg_access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  // Token expired — try refresh
  if (res.status === 401 && requiresAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const token = localStorage.getItem('esg_access_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const retry = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
      if (!retry.ok) {
        clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      return retry.json() as Promise<T>;
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      errorMessage = err.detail || err.message || JSON.stringify(err);
    } catch {}
    throw new Error(errorMessage);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('esg_refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('esg_access_token', data.access);
    return true;
  } catch {
    return false;
  }
}

function clearTokens() {
  localStorage.removeItem('esg_access_token');
  localStorage.removeItem('esg_refresh_token');
  localStorage.removeItem('esg_user');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role: 'administrator' | 'respondent' | 'viewer';
  companyId?: number;
  companyName?: string;
  isBlocked?: boolean;
  date_joined?: string;
  last_login?: string;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: ApiUser;
}

export const authApi = {
  login: async (email: string, password: string): Promise<ApiUser> => {
    const data = await request<AuthResponse>('POST', '/auth/login/', { email, password }, false);
    localStorage.setItem('esg_access_token', data.access);
    localStorage.setItem('esg_refresh_token', data.refresh);
    localStorage.setItem('esg_user', JSON.stringify(data.user));
    return data.user;
  },

  register: async (email: string, password: string, name: string, role: string): Promise<ApiUser> => {
    const data = await request<AuthResponse>('POST', '/auth/register/', { email, password, name, role }, false);
    localStorage.setItem('esg_access_token', data.access);
    localStorage.setItem('esg_refresh_token', data.refresh);
    localStorage.setItem('esg_user', JSON.stringify(data.user));
    return data.user;
  },

  logout: async (): Promise<void> => {
    const refresh = localStorage.getItem('esg_refresh_token');
    try {
      await request('POST', '/auth/logout/', { refresh });
    } catch {}
    clearTokens();
  },

  me: (): Promise<ApiUser> => request('GET', '/auth/me/'),

  // ── 4.1 Восстановление пароля по email ──────────────────────────────────────
  requestPasswordReset: (email: string): Promise<{ detail: string }> => {
    const resetUrl = `${window.location.origin}/reset-password`;
    return request<{ detail: string }>(
      'POST',
      '/auth/password-reset/',
      { email: email.trim().toLowerCase(), reset_url: resetUrl },
      false
    );
  },

  confirmPasswordReset: (token: string, password: string): Promise<{ detail: string }> =>
    request<{ detail: string }>('POST', '/auth/password-reset/confirm/', { token, password }, false),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export interface ApiUserAdmin {
  id: number;
  email: string;
  name: string;
  role: 'administrator' | 'respondent' | 'viewer';
  company?: string;
  status: 'active' | 'blocked';
  lastLogin?: string;
  date_joined: string;
}

export const usersApi = {
  list: (): Promise<ApiUserAdmin[]> => request('GET', '/users/'),
  toggleBlock: (id: number): Promise<{ id: number; isBlocked: boolean }> =>
    request('POST', `/users/${id}/toggle-block/`),
  resetPassword: (id: number, password: string): Promise<{ detail: string }> =>
    request('POST', `/users/${id}/reset-password/`, { password }),
  delete: (id: number): Promise<void> => request('DELETE', `/users/${id}/`),
};

// ─── Companies ───────────────────────────────────────────────────────────────

export interface ApiCompany {
  id: number;
  name: string;
  org_type: string;
  region: string;
  industry: string;
  description?: string;
  website?: string;
  is_active: boolean;
  created_at: string;
  activeReports: number;
  avgScore: number | null;
}

export const companiesApi = {
  list: (): Promise<ApiCompany[]> => request('GET', '/companies/'),
  get: (id: number): Promise<ApiCompany> => request('GET', `/companies/${id}/`),
  create: (data: Partial<ApiCompany>): Promise<ApiCompany> => request('POST', '/companies/', data),
  update: (id: number, data: Partial<ApiCompany>): Promise<ApiCompany> =>
    request('PATCH', `/companies/${id}/`, data),
  delete: (id: number): Promise<void> => request('DELETE', `/companies/${id}/`),
};

// ─── Questionnaires ───────────────────────────────────────────────────────────

// 4.3 Формулы расчёта баллов (совпадают с backend ScoreFormula choices)
export const SCORE_FORMULA_OPTIONS = [
  { value: '',               label: 'Авто (по типу вопроса)' },
  { value: 'linear_desc',    label: 'Линейная убывающая (для выбора)' },
  { value: 'proportional',   label: 'Пропорциональная (мультивыбор)' },
  { value: 'scale_linear',   label: 'Линейная шкала' },
  { value: 'numeric_cap',    label: 'Числовая с ограничением' },
  { value: 'binary',         label: 'Бинарная (да/нет)' },
] as const;

export type ScoreFormulaValue = '' | 'linear_desc' | 'proportional' | 'scale_linear' | 'numeric_cap' | 'binary';

export interface ApiQuestion {
  id: number;
  category: 'E' | 'S' | 'G';
  text: string;
  question_type: string;
  options: string[];
  max_score: number;
  weight: number;
  order: number;
  is_required: boolean;
  // 4.3 Настраиваемые правила расчёта баллов
  score_formula: ScoreFormulaValue;
  scale_max: number;
}

export interface ApiQuestionnaire {
  id: number;
  title: string;
  description: string;
  year: number;
  is_active: boolean;
  created_at: string;
  questionCount: number;
  questions?: ApiQuestion[];
  // 4.3 Веса блоков E/S/G
  weight_e: number;
  weight_s: number;
  weight_g: number;
}

export const questionnairesApi = {
  list: (): Promise<ApiQuestionnaire[]> => request('GET', '/questionnaires/'),
  get: (id: number): Promise<ApiQuestionnaire> => request('GET', `/questionnaires/${id}/`),
  create: (data: Partial<ApiQuestionnaire>): Promise<ApiQuestionnaire> =>
    request('POST', '/questionnaires/', data),
  // 4.3 Обновление опросника (веса E/S/G, вопросы, формулы)
  update: (id: number, data: Partial<ApiQuestionnaire>): Promise<ApiQuestionnaire> =>
    request('PATCH', `/questionnaires/${id}/`, data),
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ApiReport {
  id: number;
  status: 'draft' | 'submitted' | 'reviewed';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  company: number;
  companyName: string;
  respondent: number;
  respondentName: string;
  questionnaire: number;
  questionnaireName: string;
  period: number;
  periodName: string;
  eScore?: number;
  sScore?: number;
  gScore?: number;
  total_score?: number;
  reviewer_notes?: string;
}

export interface ApiAnswer {
  id?: number;
  question: number;
  text_value?: string;
  number_value?: number;
  choice_value?: string[];
  score?: number;
}

export const reportsApi = {
  // 5.2 Поддержка фильтра по периоду
  list: (params?: { period?: number; company?: number; search?: string }): Promise<ApiReport[]> => {
    const q = new URLSearchParams();
    if (params?.period)  q.set('period',  String(params.period));
    if (params?.company) q.set('company', String(params.company));
    if (params?.search)  q.set('search',  params.search);
    const qs = q.toString();
    return request('GET', `/reports/${qs ? `?${qs}` : ''}`);
  },
  get: (id: number): Promise<ApiReport> => request('GET', `/reports/${id}/`),
  create: (data: { company: number; questionnaire: number; period: number }): Promise<ApiReport> =>
    request('POST', '/reports/', data),
  submit: (id: number): Promise<ApiReport> => request('POST', `/reports/${id}/submit/`),
  review: (id: number, notes?: string): Promise<ApiReport> => request('POST', `/reports/${id}/review/`, { notes }),
  getAnswers: (id: number): Promise<ApiAnswer[]> => request('GET', `/reports/${id}/answers/`),
  saveAnswers: (id: number, answers: ApiAnswer[]): Promise<ApiAnswer[]> =>
    request('POST', `/reports/${id}/answers/`, answers),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers?: number;
  totalCompanies?: number;
  totalReports?: number;
  submittedReports?: number;
  avgEsgScore?: number | null;
  draftReports?: number;
  latestScore?: number | null;
  latestEScore?: number | null;
  latestSScore?: number | null;
  latestGScore?: number | null;
  totalSubmittedReports?: number;
  companyRankings?: Array<{
    id: number; name: string; industry: string; region: string;
    avgScore: number; eScore: number; sScore: number; gScore: number; reportCount: number;
  }>;
  industryStats?: Array<{ industry: string; e: number; s: number; g: number; total: number }>;
  scoreDistribution?: Array<{ range: string; count: number }>;
  trendData?: Array<{ period: string; e: number; s: number; g: number; total: number }>;
}

export const dashboardApi = {
  // 5.2 Фильтр по периоду в дашборде
  stats: (params?: { period?: number; industry?: string; region?: string }): Promise<DashboardStats> => {
    const q = new URLSearchParams();
    if (params?.period)   q.set('period',   String(params.period));
    if (params?.industry) q.set('industry', params.industry);
    if (params?.region)   q.set('region',   params.region);
    const qs = q.toString();
    return request('GET', `/dashboard/stats/${qs ? `?${qs}` : ''}`);
  },
};

// ─── Periods ─────────────────────────────────────────────────────────────────

export interface ApiPeriod {
  id: number;
  name: string;
  year: number;
  quarter?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const periodsApi = {
  list: (): Promise<ApiPeriod[]> => request('GET', '/periods/'),
};
