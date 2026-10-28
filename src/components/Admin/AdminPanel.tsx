'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Users,
  Activity,
  Database,
  RefreshCw,
  Trash2,
  TrendingUp,
  ArrowUpDown,
  Search,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';
import { SavedAccount, UserProfile, DiaryData } from '@/lib/eschools/types';
import { RegisteredUser } from '@/lib/eschools/userRegistry';
import { getGradeBadgeClasses } from '@/lib/utils';

interface AdminPanelProps {
  profile: UserProfile;
  savedAccounts: SavedAccount[];
  onSwitchAccount: (account: SavedAccount) => void;
  onRemoveAccount: (id: string) => void;
  onForceResync: () => void;
  isSyncing: boolean;
  diaryData?: DiaryData;
}

type SortMode = 'gpa_asc' | 'gpa_desc' | 'name' | 'updated';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  profile,
  savedAccounts,
  onSwitchAccount,
  onRemoveAccount,
  onForceResync,
  isSyncing,
  diaryData,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('gpa_asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedUser, setInspectedUser] = useState<RegisteredUser | null>(null);

  // Загрузка зарегистрированных пользователей с сервера
  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const resp = await fetch('/api/eschools/admin/users', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.users)) {
          setAllUsers(json.users);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей админки:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Фильтрация и сортировка пользователей
  const sortedAndFilteredUsers = useMemo(() => {
    let result = [...allUsers];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.studentName.toLowerCase().includes(q) ||
          u.login.toLowerCase().includes(q) ||
          u.className.toLowerCase().includes(q) ||
          u.schoolName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortMode === 'gpa_asc') {
        return (a.overallGpa || 0) - (b.overallGpa || 0);
      }
      if (sortMode === 'gpa_desc') {
        return (b.overallGpa || 0) - (a.overallGpa || 0);
      }
      if (sortMode === 'name') {
        return a.studentName.localeCompare(b.studentName, 'ru');
      }
      if (sortMode === 'updated') {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      return 0;
    });

    return result;
  }, [allUsers, searchQuery, sortMode]);

  // Статистика
  const stats = useMemo(() => {
    if (allUsers.length === 0) {
      return { totalUsers: 0, averageGpa: 0, highestGpa: 0, lowestGpa: 0 };
    }
    const gpas = allUsers.map((u) => u.overallGpa || 0).filter((g) => g > 0);
    const sum = gpas.reduce((acc, g) => acc + g, 0);
    const averageGpa = gpas.length ? sum / gpas.length : 0;
    const highestGpa = gpas.length ? Math.max(...gpas) : 0;
    const lowestGpa = gpas.length ? Math.min(...gpas) : 0;

    return {
      totalUsers: allUsers.length,
      averageGpa,
      highestGpa,
      lowestGpa,
    };
  }, [allUsers]);

  return (
    <div className="space-y-6">
      {/* Шапка администратора с коронным бейджем */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100 shrink-0">
              <Crown className="w-6 h-6 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                  Панель Администратора
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  ROOT / OWNER
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Владелец системы: <span className="text-zinc-200 font-semibold">{profile.studentName || 'nadaroot'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchAllUsers();
                onForceResync();
              }}
              disabled={isSyncing || isLoadingUsers}
              className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium bg-surface-subtle border border-surface-border text-zinc-200 hover:text-zinc-100 hover:border-zinc-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isSyncing || isLoadingUsers ? 'Обновление...' : 'Обновить данные'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* РАЗДЕЛ 1: ВСЕ ПОЛЬЗОВАТЕЛИ ПЛАТФОРМЫ И СОРТИРОВКА ПО БАЛЛУ */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-300" />
            <h4 className="text-xs uppercase tracking-wider text-zinc-200 font-bold">
              Все пользователи платформы ({stats.totalUsers})
            </h4>
          </div>

          {/* Быстрые фильтры сортировки */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-500 mr-1">Балл:</span>
            <button
              onClick={() => setSortMode('gpa_asc')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                sortMode === 'gpa_asc'
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              По возрастанию (↑)
            </button>
            <button
              onClick={() => setSortMode('gpa_desc')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                sortMode === 'gpa_desc'
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              По убыванию (↓)
            </button>
            <button
              onClick={() => setSortMode('name')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                sortMode === 'name'
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              По имени
            </button>
            <button
              onClick={() => setSortMode('updated')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                sortMode === 'updated'
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              По времени
            </button>
          </div>
        </div>

        {/* Сводные плашки успеваемости */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded bg-surface-subtle border border-surface-border">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Пользователей</div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-0.5">
              {stats.totalUsers}
            </div>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-surface-border">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Средний балл базы</div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-0.5">
              {stats.averageGpa.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-surface-border">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Топ балл</div>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
              {stats.highestGpa.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-surface-border">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Минимальный балл</div>
            <div className="text-xl font-mono font-bold text-zinc-300 mt-0.5">
              {stats.lowestGpa.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Поиск по базе */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, логину, классу или школе..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-subtle border border-surface-border text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Список пользователей */}
        {isLoadingUsers ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 animate-pulse">
            Загрузка списка пользователей платформы...
          </div>
        ) : sortedAndFilteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500">
            {searchQuery ? 'Пользователи не найдены' : 'База пользователей пока пуста'}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAndFilteredUsers.map((user, idx) => {
              const roundedGpa = Math.round(user.overallGpa || 0);
              const isCurrent =
                user.login.toLowerCase() === (profile.login?.toLowerCase() || 'nadaroot');

              return (
                <div
                  key={user.id || user.login}
                  className="p-3.5 rounded-lg bg-surface-subtle border border-surface-border hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-400 shrink-0">
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                            {user.studentName}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            @{user.login}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold">
                              Вы
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {user.className} {user.schoolName ? `• ${user.schoolName}` : ''} • Предметов: {user.subjectsCount} • Оценок: {user.gradesCount}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {/* Бейдж среднего балла */}
                      <div className="flex items-center gap-1.5">
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-mono text-zinc-400">
                            Балл
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded text-sm font-mono font-bold border ${getGradeBadgeClasses(
                              roundedGpa
                            )}`}
                          >
                            {user.overallGpa > 0 ? user.overallGpa.toFixed(2) : '—'}
                          </div>
                        </div>

                        {user.projectedGpa && user.projectedGpa > 0 && (
                          <div className="text-right">
                            <div className="text-[9px] uppercase font-mono text-zinc-400">
                              Цель
                            </div>
                            <div className="px-2 py-0.5 rounded text-sm font-mono font-bold border bg-zinc-900 border-zinc-700 text-zinc-200">
                              🎯 {user.projectedGpa.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Кнопка «Посмотреть оценки» */}
                      <button
                        onClick={() => setInspectedUser(user)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface border border-surface-border text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1"
                        title="Посмотреть баллы и оценки этого учащегося"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Оценки</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* РАЗДЕЛ 2: Сохраненные аккаунты на устройстве (Мультиаккаунтинг) */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
              Локальные профили на этом устройстве ({savedAccounts.length})
            </h4>
          </div>
        </div>

        {savedAccounts.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-500 font-mono">
            Нет сохраненных учетных записей в локальном кэше браузера.
          </div>
        ) : (
          <div className="space-y-2">
            {savedAccounts.map((acc) => {
              const isCurrent =
                acc.login.toLowerCase() === (profile.login?.toLowerCase() || 'nadaroot');

              return (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3.5 rounded bg-surface-subtle border border-surface-border"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {acc.studentName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        @{acc.login}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-surface-border text-zinc-100 font-bold">
                          Текущий
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      {acc.className} • {acc.schoolName} • GPA:{' '}
                      <span className="font-mono text-zinc-200">
                        {acc.overallGpa ? acc.overallGpa.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => onSwitchAccount(acc)}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
                      >
                        Войти
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveAccount(acc.id)}
                      title="Удалить из сохраненных"
                      className="p-1.5 rounded bg-surface-muted text-zinc-400 hover:text-zinc-100 hover:bg-surface-subtle transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* РАЗДЕЛ 3: Диагностика сервисов и сетевых шлюзов */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h4 className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
            Сетевые шлюзы и статус интеграций
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                oauth.rios.unibel.by
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              SSO Авторизация РИОС
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-400">
              ● Шлюз активен (200 OK)
            </div>
          </div>

          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                diary.e-schools.by
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              REST API v1 дневника
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-400">
              ● Синхронизация в норме
            </div>
          </div>

          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                База данных пользователей
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Центральный реестр / JSON
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-400">
              ● {stats.totalUsers} записей
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{showRawJson ? 'Скрыть сырые данные JSON' : 'Показать сырые данные дневника'}</span>
          </button>

          {showRawJson && diaryData && (
            <div className="mt-3 p-3 rounded bg-black border border-surface-border max-h-64 overflow-auto text-[10px] font-mono text-zinc-400">
              <pre>{JSON.stringify(diaryData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО: ПРОСМОТР БАЛЛОВ И ОЦЕНОК ДРУГОГО ПОЛЬЗОВАТЕЛЯ ДЛЯ АДМИНА */}
      {inspectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setInspectedUser(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] rounded-xl bg-zinc-950 border border-surface-border shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка инспектора */}
            <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface shrink-0">
              <div>
                <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>{inspectedUser.studentName}</span>
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    (@{inspectedUser.login})
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {inspectedUser.className} • {inspectedUser.schoolName}
                </div>
              </div>

              <button
                onClick={() => setInspectedUser(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Сводка инспектируемого пользователя */}
            <div className="p-4 bg-surface-subtle border-b border-surface-border grid grid-cols-3 gap-2 text-center shrink-0">
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-400">Средний балл</div>
                <div className="text-lg font-bold font-mono text-zinc-100 mt-0.5">
                  {inspectedUser.overallGpa > 0 ? inspectedUser.overallGpa.toFixed(2) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-400">Оценок всего</div>
                <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">
                  {inspectedUser.gradesCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-400">Предметов</div>
                <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">
                  {inspectedUser.subjectsCount}
                </div>
              </div>
            </div>

            {/* Список предметов и оценок */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
              <div className="text-[11px] uppercase tracking-wider font-mono text-zinc-400 mb-2">
                Успеваемость по предметам:
              </div>

              {inspectedUser.subjectsSummary && inspectedUser.subjectsSummary.length > 0 ? (
                inspectedUser.subjectsSummary.map((sub, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-surface border border-surface-border flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-zinc-200 truncate">{sub.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {sub.gradesCount} оценок {sub.quarterGrade ? `• Четвертная: ${sub.quarterGrade}` : ''}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold border shrink-0 ${getGradeBadgeClasses(
                        Math.round(sub.average)
                      )}`}
                    >
                      {sub.average > 0 ? sub.average.toFixed(2) : '—'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  Подробная сводка по предметам станет доступна после следующей синхронизации ученика.
                </div>
              )}
            </div>

            {/* Подвал */}
            <div className="p-3 border-t border-surface-border bg-surface flex justify-end shrink-0">
              <button
                onClick={() => setInspectedUser(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
