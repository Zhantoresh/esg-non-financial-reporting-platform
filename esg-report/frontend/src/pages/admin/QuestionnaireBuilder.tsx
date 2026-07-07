import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Leaf,
  Users as UsersIcon,
  Shield,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings2,
} from 'lucide-react';
import {
  questionnairesApi,
  ApiQuestionnaire,
  ApiQuestion,
  SCORE_FORMULA_OPTIONS,
  ScoreFormulaValue,
} from '../../services/api';

type QuestionType = 'single_choice' | 'multi_choice' | 'numeric' | 'scale' | 'text' | 'boolean';
type ESGCategory = 'E' | 'S' | 'G';


// Local draft shape while editing (id may be temporary string for new questions)
interface DraftQuestion {
  _localId: string;
  id?: number;
  text: string;
  question_type: QuestionType;
  category: ESGCategory;
  weight: number;
  max_score: number;
  options: string[];
  is_required: boolean;
  score_formula: ScoreFormulaValue;
  scale_max: number;
  order: number;
}

interface DraftQuestionnaire {
  id?: number;
  title: string;
  description: string;
  year: number;
  is_active: boolean;
  // 4.3 Веса блоков E/S/G
  weight_e: number;
  weight_s: number;
  weight_g: number;
  questions: DraftQuestion[];
}

const categoryMeta = {
  E: {
    label: 'Environmental',
    bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700',
    badgeBg: 'bg-green-100', icon: Leaf,
    btnBg: 'bg-green-50', btnText: 'text-green-700', btnBorder: 'border-green-200', btnHover: 'hover:bg-green-100',
  },
  S: {
    label: 'Social',
    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
    badgeBg: 'bg-orange-100', icon: UsersIcon,
    btnBg: 'bg-orange-50', btnText: 'text-orange-700', btnBorder: 'border-orange-200', btnHover: 'hover:bg-orange-100',
  },
  G: {
    label: 'Governance',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    badgeBg: 'bg-blue-100', icon: Shield,
    btnBg: 'bg-blue-50', btnText: 'text-blue-700', btnBorder: 'border-blue-200', btnHover: 'hover:bg-blue-100',
  },
} as const;

function toApiPayload(draft: DraftQuestionnaire) {
  return {
    title:       draft.title,
    description: draft.description,
    year:        draft.year,
    is_active:   draft.is_active,
    weight_e:    draft.weight_e,
    weight_s:    draft.weight_s,
    weight_g:    draft.weight_g,
    questions: draft.questions.map((q, i) => ({
      // Только если id есть, добавляем
      ...(q.id !== undefined ? { id: q.id } : {}),
      category:      q.category,
      text:          q.text,
      question_type: q.question_type,
      options:       q.options,
      max_score:     q.max_score,
      weight:        q.weight,
      order:         i,
      is_required:   q.is_required,
      score_formula: q.score_formula,
      scale_max:     q.scale_max,
    })) as unknown as ApiQuestion[], // <- безопасный каст к ApiQuestion[]
  };
}

function fromApiQuestionnaire(q: ApiQuestionnaire): DraftQuestionnaire {
  return {
    id:          q.id,
    title:       q.title,
    description: q.description,
    year:        q.year,
    is_active:   q.is_active,
    weight_e:    q.weight_e ?? 1,
    weight_s:    q.weight_s ?? 1,
    weight_g:    q.weight_g ?? 1,
    questions: (q.questions ?? []).map((qq, i) => ({
      _localId:      `existing_${qq.id}`,
      id:            qq.id,
      text:          qq.text,
      question_type: qq.question_type as QuestionType,
      category:      qq.category as ESGCategory,
      weight:        qq.weight,
      max_score:     qq.max_score,
      options:       qq.options ?? [],
      is_required:   qq.is_required,
      score_formula: (qq.score_formula ?? '') as ScoreFormulaValue,
      scale_max:     qq.scale_max ?? 5,
      order:         qq.order ?? i,
    })),
  };
}

function emptyDraft(): DraftQuestionnaire {
  return {
    title: 'Новый опросник',
    description: '',
    year: new Date().getFullYear(),
    is_active: true,
    weight_e: 1,
    weight_s: 1,
    weight_g: 1,
    questions: [],
  };
}

// ─── Weight Slider ────────────────────────────────────────────────────────────

function WeightSlider({
  label, value, color, onChange, disabled,
}: {
  label: string; value: number; color: string; onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <span className="text-xs font-mono text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
      </div>
      <input
        type="range" min="0.1" max="3" step="0.1"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full accent-current appearance-none cursor-pointer disabled:opacity-40"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionnaireBuilder() {
  const [questionnaires, setQuestionnaires] = useState<ApiQuestionnaire[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [draft, setDraft] = useState<DraftQuestionnaire | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [showWeights, setShowWeights] = useState(false);

  // Load questionnaire list
  useEffect(() => {
    questionnairesApi.list()
      .then(setQuestionnaires)
      .catch(() => showToast('error', 'Не удалось загрузить опросники'))
      .finally(() => setLoadingList(false));
  }, []);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Select a questionnaire — load with questions
  const selectQuestionnaire = async (id: number) => {
    setEditMode(false);
    setSelectedId(id);
    try {
      const full = await questionnairesApi.get(id);
      setDraft(fromApiQuestionnaire(full));
    } catch {
      showToast('error', 'Не удалось загрузить опросник');
    }
  };

  const startNew = () => {
    setSelectedId(undefined);
    setDraft(emptyDraft());
    setEditMode(true);
  };

  const addQuestion = (category: ESGCategory) => {
    if (!draft) return;
    const newQ: DraftQuestion = {
      _localId:      `new_${Date.now()}`,
      text:          '',
      question_type: 'single_choice',
      category,
      weight:        1,
      max_score:     10,
      options:       ['Вариант 1', 'Вариант 2'],
      is_required:   true,
      score_formula: '',
      scale_max:     5,
      order:         draft.questions.length,
    };
    setDraft({ ...draft, questions: [...draft.questions, newQ] });
  };

  const deleteQuestion = (localId: string) => {
    if (!draft) return;
    setDraft({ ...draft, questions: draft.questions.filter(q => q._localId !== localId) });
  };

  const updateQuestion = (localId: string, updates: Partial<DraftQuestion>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      questions: draft.questions.map(q => q._localId === localId ? { ...q, ...updates } : q),
    });
  };

  const saveQuestionnaire = async () => {
    if (!draft) return;
    if (!draft.title.trim()) { showToast('error', 'Укажите название опросника'); return; }

    setSaving(true);
    try {
      const payload = toApiPayload(draft);
      let saved: ApiQuestionnaire;

      if (draft.id) {
        saved = await questionnairesApi.update(draft.id, payload);
      } else {
        saved = await questionnairesApi.create(payload);
      }

      // Refresh list
      const list = await questionnairesApi.list();
      setQuestionnaires(list);
      setSelectedId(saved.id);
      // Reload full with questions
      const full = await questionnairesApi.get(saved.id);
      setDraft(fromApiQuestionnaire(full));
      setEditMode(false);
      showToast('success', 'Опросник сохранён');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (selectedId) {
      // Revert to saved
      questionnairesApi.get(selectedId)
        .then(q => setDraft(fromApiQuestionnaire(q)))
        .catch(() => {});
    } else {
      setDraft(null);
    }
    setEditMode(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-5 h-5" />
            : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Конструктор Опросника</h1>
        <p className="text-gray-600">Создание опросников для оценки ESG и управление ими</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Questionnaire list ─────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Опросники</h2>
              <button
                onClick={startNew}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="New questionnaire"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Загрузка...
              </div>
            ) : questionnaires.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Опросников пока нет.</p>
            ) : (
              <div className="space-y-2">
                {questionnaires.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => selectQuestionnaire(q.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === q.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-medium text-gray-900 mb-1 truncate">{q.title}</p>
                    <p className="text-xs text-gray-500">{q.year} · {q.questionCount} вопросов</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Editor ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {draft ? (
            <div className="space-y-6">
              {/* ── Questionnaire header / meta ──────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-4">
                    {editMode ? (
                      <>
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                          className="w-full text-2xl font-bold text-gray-900 mb-2 border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-1"
                          placeholder="Название опросника"
                        />
                        <div className="flex gap-3 mt-2">
                          <div className="flex-1">
                            <textarea
                              value={draft.description}
                              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                              className="w-full text-gray-600 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Описание опросника"
                              rows={2}
                            />
                          </div>
                          <div className="flex flex-col gap-2 min-w-[90px]">
                            <label className="text-xs text-gray-500 font-medium">Год</label>
                            <input
                              type="number"
                              value={draft.year}
                              onChange={(e) => setDraft({ ...draft, year: parseInt(e.target.value) || new Date().getFullYear() })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={draft.is_active}
                                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-xs text-gray-600">Активен</span>
                            </label>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{draft.title}</h2>
                        <p className="text-gray-500 text-sm">{draft.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {draft.year} · {draft.is_active ? 'Активен' : 'Неактивен'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {editMode ? (
                      <>
                        <button
                          onClick={saveQuestionnaire}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditMode(true); setShowWeights(false); }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Изменить
                        </button>
                        <button
                          onClick={() => setShowWeights(!showWeights)}
                          title="Настройки весов E/S/G"
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                            showWeights
                              ? 'bg-purple-50 border-purple-300 text-purple-700'
                              : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Settings2 className="w-4 h-4" />
                          Весы
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── 4.3 E/S/G Weights panel ──────────────────────────────── */}
                {(editMode || showWeights) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Settings2 className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-800">
                        Веса блоков E / S / G
                      </h3>
                      <span className="text-xs text-gray-400 ml-auto">
                        Влияет на итоговый ESG-балл
                      </span>
                    </div>
                    <div className="flex gap-6">
                      <WeightSlider
                        label="E — Environmental"
                        value={draft.weight_e}
                        color="text-green-700"
                        disabled={!editMode}
                        onChange={(v) => setDraft({ ...draft, weight_e: v })}
                      />
                      <WeightSlider
                        label="S — Social"
                        value={draft.weight_s}
                        color="text-orange-700"
                        disabled={!editMode}
                        onChange={(v) => setDraft({ ...draft, weight_s: v })}
                      />
                      <WeightSlider
                        label="G — Governance"
                        value={draft.weight_g}
                        color="text-blue-700"
                        disabled={!editMode}
                        onChange={(v) => setDraft({ ...draft, weight_g: v })}
                      />
                    </div>
                    {/* Visual proportion bar */}
                    <div className="mt-3 flex rounded-full overflow-hidden h-2">
                      {(() => {
                        const total = draft.weight_e + draft.weight_s + draft.weight_g || 1;
                        return (
                          <>
                            <div style={{ width: `${(draft.weight_e / total) * 100}%` }} className="bg-green-500 transition-all" />
                            <div style={{ width: `${(draft.weight_s / total) * 100}%` }} className="bg-orange-500 transition-all" />
                            <div style={{ width: `${(draft.weight_g / total) * 100}%` }} className="bg-blue-500 transition-all" />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex gap-4 mt-1">
                      {(['E', 'S', 'G'] as const).map((k) => {
                        const val = k === 'E' ? draft.weight_e : k === 'S' ? draft.weight_s : draft.weight_g;
                        const total = draft.weight_e + draft.weight_s + draft.weight_g || 1;
                        const colors = { E: 'text-green-600', S: 'text-orange-600', G: 'text-blue-600' };
                        return (
                          <span key={k} className={`text-xs ${colors[k]}`}>
                            {k}: {((val / total) * 100).toFixed(0)}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add question buttons */}
                {editMode && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 mt-4">
                    {(['E', 'S', 'G'] as const).map((cat) => {
                      const m = categoryMeta[cat];
                      const Icon = m.icon;
                      return (
                        <button
                          key={cat}
                          onClick={() => addQuestion(cat)}
                          className={`flex items-center gap-2 px-4 py-2 ${m.btnBg} ${m.btnText} border ${m.btnBorder} rounded-lg ${m.btnHover} transition-colors text-sm`}
                        >
                          <Icon className="w-4 h-4" />
                          Add {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Questions list ──────────────────────────────────────────── */}
              <div className="space-y-4">
                {draft.questions.map((question, index) => {
                  const m = categoryMeta[question.category];
                  const CategoryIcon = m.icon;

                  return (
                    <div key={question._localId} className={`bg-white rounded-xl border ${m.border} p-5`}>
                      <div className="flex items-start gap-4">
                        <GripVertical className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                        <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <CategoryIcon className={`w-4 h-4 ${m.text}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {editMode ? (
                            <input
                              type="text"
                              value={question.text}
                              onChange={(e) => updateQuestion(question._localId, { text: e.target.value })}
                              className="w-full font-medium text-gray-900 border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-1 mb-1"
                              placeholder="Текст вопроса"
                            />
                          ) : (
                            <p className="font-medium text-gray-900 mb-0.5">
                              {index + 1}. {question.text || <span className="italic text-gray-400">Без текста</span>}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${m.badgeBg} ${m.text} font-medium`}>
                              {m.label}
                            </span>
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              weight: {question.weight}
                            </span>
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              max: {question.max_score}
                            </span>
                            {question.score_formula && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                {SCORE_FORMULA_OPTIONS.find(o => o.value === question.score_formula)?.label ?? question.score_formula}
                              </span>
                            )}
                          </div>
                        </div>

                        {editMode && (
                          <button
                            onClick={() => deleteQuestion(question._localId)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* ── Edit controls ──────────────────────────────────── */}
                      {editMode && (
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                          {/* Type */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Тип вопроса</label>
                            <select
                              value={question.question_type}
                              onChange={(e) => updateQuestion(question._localId, { question_type: e.target.value as QuestionType })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="single_choice">Один вариант</option>
                              <option value="multi_choice">Несколько вариантов</option>
                              <option value="numeric">Числовой</option>
                              <option value="scale">Шкала</option>
                              <option value="text">Текстовый</option>
                              <option value="boolean">Да / Нет</option>
                            </select>
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Категория</label>
                            <select
                              value={question.category}
                              onChange={(e) => updateQuestion(question._localId, { category: e.target.value as ESGCategory })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="E">E — Environmental</option>
                              <option value="S">S — Social</option>
                              <option value="G">G — Governance</option>
                            </select>
                          </div>

                          {/* Weight */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Вес вопроса</label>
                            <input
                              type="number" min="0.1" max="10" step="0.1"
                              value={question.weight}
                              onChange={(e) => updateQuestion(question._localId, { weight: parseFloat(e.target.value) || 1 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          {/* Max score */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Макс. балл</label>
                            <input
                              type="number" min="1" max="100"
                              value={question.max_score}
                              onChange={(e) => updateQuestion(question._localId, { max_score: parseFloat(e.target.value) || 10 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          {/* 4.3 Score formula */}
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Правило расчёта балла
                            </label>
                            <select
                              value={question.score_formula}
                              onChange={(e) => updateQuestion(question._localId, { score_formula: e.target.value as ScoreFormulaValue })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-purple-50 border-purple-200"
                            >
                              {SCORE_FORMULA_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Scale max (only for scale type) */}
                          {question.question_type === 'scale' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Максимум шкалы</label>
                              <input
                                type="number" min="2" max="10"
                                value={question.scale_max}
                                onChange={(e) => updateQuestion(question._localId, { scale_max: parseInt(e.target.value) || 5 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          )}

                          {/* Required */}
                          <div className="flex items-center gap-2 col-span-2">
                            <input
                              type="checkbox"
                              checked={question.is_required}
                              onChange={(e) => updateQuestion(question._localId, { is_required: e.target.checked })}
                              className="rounded"
                              id={`req_${question._localId}`}
                            />
                            <label htmlFor={`req_${question._localId}`} className="text-sm text-gray-700 cursor-pointer">
                              Обязательный вопрос
                            </label>
                          </div>

                          {/* Options (for choice types) */}
                          {(question.question_type === 'single_choice' || question.question_type === 'multi_choice') && (
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-2">Варианты ответов</label>
                              <div className="space-y-2">
                                {question.options.map((opt, oi) => (
                                  <div key={oi} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const opts = [...question.options];
                                        opts[oi] = e.target.value;
                                        updateQuestion(question._localId, { options: opts });
                                      }}
                                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                      placeholder={`Вариант ${oi + 1}`}
                                    />
                                    <button
                                      onClick={() => {
                                        updateQuestion(question._localId, {
                                          options: question.options.filter((_, i) => i !== oi),
                                        });
                                      }}
                                      className="p-1.5 text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => updateQuestion(question._localId, {
                                    options: [...question.options, `Вариант ${question.options.length + 1}`],
                                  })}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Добавить вариант
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {draft.questions.length === 0 && (
                  <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <p className="text-gray-500 mb-2">Вопросов пока нет</p>
                    {editMode && (
                      <p className="text-sm text-gray-400">
                        Нажмите кнопки выше, чтобы добавить вопросы по категориям E, S, G
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">
                Выберите опросник слева или создайте новый
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
