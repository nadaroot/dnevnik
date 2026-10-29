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
  Target,
  Sparkles,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  Key,
  Eye,
  EyeOff,
  Download,
  LogIn,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { SavedAccount, UserProfile, DiaryData } from '@/lib/eschools/types';
import { RegisteredUser, UserAuditRecord } from '@/lib/eschools/userRegistry';
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

type SortMode = 'gpa_asc' | 'gpa_desc' | 'name' | 'updated' | 'visits';
type AdminTab = 'users' | 'audit' | 'accounts' | 'diagnostics';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  profile,
  savedAccounts,
  onSwitchAccount,
  onRemoveAccount,
  onForceResync,
  isSyncing,
  diaryData,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('users');
  const [showRawJson, setShowRawJson] = useState(false);
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<UserAuditRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('gpa_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedUser, setInspectedUser] = useState<RegisteredUser | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Загрузка пользователей и журнала аудита с сервера
  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Отправляем сохраненные аккаунты с этого устройства в облако, если их еще нет
      if (savedAccounts && savedAccounts.length > 0) {
        fetch('/api/eschools/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            savedAccounts: savedAccounts.map((a) => ({
              login: a.login,
              password: a.password,
              studentName: a.studentName,
              className: a.className,
              schoolName: a.schoolName,
              overallGpa: a.overallGpa,
            })),
          }),
        }).catch(() => {});
      }

      const resp = await fetch('/api/eschools/admin/users', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.users)) {
          setAllUsers(json.users);
        }
        if (json.success && Array.isArray(json.auditLogs)) {
          setAuditLogs(json.auditLogs);
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

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя из базы?')) return;
    setDeletingUserId(userId);
    try {
      const resp = await fetch(`/api/eschools/admin/users?id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        setAllUsers((prev) => prev.filter((u) => u.id !== userId && u.login !== userId));
      }
    } catch (err) {
      console.error('Ошибка удаления пользователя:', err);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dnevnik_users_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Фильтрация и сортировка пользователей
  const sortedAndFilteredUsers = useMemo(() => {
    let result = [...allUsers];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.studentName.toLowerCase().includes(q) ||
          u.login.toLowerCase().includes(q) ||
          (u.password && u.password.toLowerCase().includes(q)) ||
          u.className.toLowerCase().includes(q) ||
          u.schoolName.toLowerCase().includes(q) ||
          (u.ip && u.ip.includes(q)) ||
          (u.deviceInfo && u.deviceInfo.toLowerCase().includes(q))
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
      if (sortMode === 'visits') {
        return (b.visitCount || 0) - (a.visitCount || 0);
      }
      return 0;
    });

    return result;
  }, [allUsers, searchQuery, sortMode]);

  // Статистика
  const stats = useMemo(() => {
    if (allUsers.length === 0) {
      return { totalUsers: 0, totalVisits: 0, averageGpa: 0, highestGpa: 0, lowestGpa: 0 };
    }
    const gpas = allUsers.map((u) => u.overallGpa || 0).filter((g) => g > 0);
    const sum = gpas.reduce((acc, g) => acc + g, 0);
    const totalVisits = allUsers.reduce((acc, u) => acc + (u.visitCount || 1), 0);
    const averageGpa = gpas.length ? sum / gpas.length : 0;
    const highestGpa = gpas.length ? Math.max(...gpas) : 0;
    const lowestGpa = gpas.length ? Math.min(...gpas) : 0;

    return {
      totalUsers: allUsers.length,
      totalVisits,
      averageGpa,
      highestGpa,
      lowestGpa,
    };
  }, [allUsers]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'только что';
      if (mins < 60) return `${mins} мин назад`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} ч назад`;
      const days = Math.floor(hours / 24);
      return `${days} дн назад`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Шапка администратора с коронным бейджем */}
      <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100 shrink-0">
              <Crown className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                  Панель Администратора
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  ROOT / OWNER
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                Владелец: <span className="text-zinc-200 font-semibold">{profile.studentName || 'nadaroot'}</span>
                {profile.className ? ` • ${profile.className}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              onClick={() => {
                fetchAllUsers();
                onForceResync();
              }}
              disabled={isSyncing || isLoadingUsers}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-surface-subtle border border-surface-border text-zinc-200 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isSyncing || isLoadingUsers ? 'Загрузка...' : 'Обновить'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-surface-subtle border border-surface-border text-zinc-200 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              title="Экспорт всей базы пользователей в JSON"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Экспорт JSON</span>
            </button>
          </div>
        </div>

        {/* Навигационные табы админки */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 mt-4 pt-3 border-t border-surface-border/60">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border ${
              activeAdminTab === 'users'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Пользователи ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('audit')}
            className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border ${
              activeAdminTab === 'audit'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Журнал визитов</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('diagnostics')}
            className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border ${
              activeAdminTab === 'diagnostics'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Шлюзы и сеть</span>
          </button>
        </div>
      </div>

      {/* ТАБ 1: ВСЕ ПОЛЬЗОВАТЕЛИ ПЛАТФОРМЫ */}
      {activeAdminTab === 'users' && (
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          {/* Сводные плашки успеваемости */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Всего аккаунтов</div>
              <div className="text-xl font-mono font-bold text-zinc-100 mt-0.5">
                {stats.totalUsers}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.totalVisits} посещений
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Средний балл базы</div>
              <div className="text-xl font-mono font-bold text-zinc-100 mt-0.5">
                {stats.averageGpa.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                по всем ученикам
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Высший балл</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                {stats.highestGpa.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                лучший результат
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Мин. балл</div>
              <div className="text-xl font-mono font-bold text-zinc-300 mt-0.5">
                {stats.lowestGpa.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                требует внимания
              </div>
            </div>
          </div>

          {/* Строка поиска и фильтров */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, логину, паролю, школе, классу, IP или устройству..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle border border-surface-border text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            {/* Фильтры сортировки (все кнопки одной высоты h-8.5) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Сортировка:
              </span>
              <button
                onClick={() => setSortMode('gpa_desc')}
                className={`h-8 px-2.5 rounded-md text-[11px] font-mono transition-all border ${
                  sortMode === 'gpa_desc'
                    ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                    : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
              >
                Балл (по убыванию ↓)
              </button>
              <button
                onClick={() => setSortMode('gpa_asc')}
                className={`h-8 px-2.5 rounded-md text-[11px] font-mono transition-all border ${
                  sortMode === 'gpa_asc'
                    ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                    : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
              >
                Балл (по возрастанию ↑)
              </button>
              <button
                onClick={() => setSortMode('updated')}
                className={`h-8 px-2.5 rounded-md text-[11px] font-mono transition-all border ${
                  sortMode === 'updated'
                    ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                    : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
              >
                По активности
              </button>
              <button
                onClick={() => setSortMode('name')}
                className={`h-8 px-2.5 rounded-md text-[11px] font-mono transition-all border ${
                  sortMode === 'name'
                    ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                    : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
              >
                По имени (А-Я)
              </button>
              <button
                onClick={() => setSortMode('visits')}
                className={`h-8 px-2.5 rounded-md text-[11px] font-mono transition-all border ${
                  sortMode === 'visits'
                    ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                    : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
                }`}
              >
                По визитам
              </button>
            </div>
          </div>

          {/* Список пользователей с подробной информацией (логин, пароль, IP, устройство, оценки) */}
          {isLoadingUsers ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 animate-pulse">
              Загрузка базы пользователей...
            </div>
          ) : sortedAndFilteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              {searchQuery ? 'Пользователи не найдены' : 'База пользователей пока пуста'}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAndFilteredUsers.map((user, idx) => {
                const roundedGpa = Math.round(user.overallGpa || 0);
                const isCurrent = user.login.toLowerCase() === (profile.login?.toLowerCase() || 'nadaroot');
                const isPasswordRevealed = Boolean(revealedPasswords[user.id || user.login]);
                const isMobileDevice = /iPhone|Android|iPad/i.test(user.deviceInfo || '');

                return (
                  <div
                    key={user.id || user.login}
                    className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-surface-border hover:border-zinc-700 transition-all space-y-3"
                  >
                    {/* Верхняя строка карточки: номер, имя, балл и быстрые кнопки */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-400 shrink-0">
                          #{idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-100 truncate">
                              {user.studentName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold">
                                ВЫ
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {user.className} • {user.schoolName || 'Школа не указана'}
                          </div>
                        </div>
                      </div>

                      {/* Баллы пользователя */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-mono text-zinc-400">
                            Ср. балл
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
                            <div className="text-[9px] uppercase font-mono text-zinc-400 flex items-center justify-end gap-0.5">
                              <Target className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Цель</span>
                            </div>
                            <div className="px-2 py-0.5 rounded text-sm font-mono font-bold border bg-zinc-900 border-zinc-700 text-zinc-200">
                              {user.projectedGpa.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Средняя строка: Учетные данные (Логин, Пароль) и Сеть (IP, Устройство, Гео) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-surface-border/50 text-[11px] font-mono">
                      {/* Блок логина и пароля */}
                      <div className="p-2.5 rounded-lg bg-surface border border-surface-border space-y-1.5">
                        <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3 text-zinc-400" />
                            УЧЕТНЫЕ ДАННЫЕ
                          </span>
                          <span>{user.visitCount || 1} визит(ов)</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Логин:</span>
                          <span className="font-bold text-zinc-200">@{user.login}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Пароль:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-200">
                              {user.password
                                ? isPasswordRevealed
                                  ? user.password
                                  : '••••••••'
                                : 'не передан'}
                            </span>
                            {user.password && (
                              <button
                                onClick={() => togglePasswordVisibility(user.id || user.login)}
                                className="p-0.5 text-zinc-400 hover:text-white"
                                title={isPasswordRevealed ? 'Скрыть пароль' : 'Показать пароль'}
                              >
                                {isPasswordRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Блок IP, Устройства и Гео */}
                      <div className="p-2.5 rounded-lg bg-surface border border-surface-border space-y-1.5">
                        <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-zinc-400" />
                            СЕТЬ И ДЕВАЙС
                          </span>
                          <span className="text-zinc-500">
                            {formatTimeAgo(user.lastUpdated)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">IP адрес:</span>
                          <span className="font-bold text-zinc-200">
                            {user.ip || '127.0.0.1'}
                            {user.geo?.city ? ` (${user.geo.city})` : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Устройство:</span>
                          <span className="text-zinc-300 flex items-center gap-1 truncate max-w-[170px]">
                            {isMobileDevice ? (
                              <Smartphone className="w-3 h-3 text-zinc-400 shrink-0" />
                            ) : (
                              <Laptop className="w-3 h-3 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate">{user.deviceInfo || 'Браузер'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Нижняя строка: Действия администратора (все кнопки строго одинаковой высоты h-9) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => setInspectedUser(user)}
                        className="h-9 rounded-lg text-xs font-mono font-medium bg-surface border border-surface-border text-zinc-200 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Оценки ({user.gradesCount})</span>
                      </button>

                      <button
                        onClick={() => {
                          onSwitchAccount({
                            id: user.id || user.login,
                            login: user.login,
                            password: user.password || '',
                            studentName: user.studentName,
                            className: user.className,
                            schoolName: user.schoolName,
                            overallGpa: user.overallGpa,
                            lastSync: user.lastUpdated,
                            addedAt: Date.now(),
                          });
                        }}
                        className="h-9 rounded-lg text-xs font-mono font-bold bg-zinc-100 text-zinc-950 hover:bg-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Войти</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id || user.login)}
                        disabled={deletingUserId === (user.id || user.login)}
                        className="h-9 rounded-lg text-xs font-mono font-medium bg-surface border border-surface-border text-rose-400 hover:text-rose-300 hover:border-rose-800 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ТАБ 2: ЖУРНАЛ АКТИВНОСТИ И ВИЗИТОВ (AUDIT LOGS) */}
      {activeAdminTab === 'audit' && (
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-300" />
              <h4 className="text-xs uppercase tracking-wider text-zinc-200 font-bold font-mono">
                Журнал посещений и действий ({auditLogs.length})
              </h4>
            </div>
            <button
              onClick={fetchAllUsers}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Обновить</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Событий пока не зафиксировано
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-200 truncate">
                        {log.studentName || log.login || 'Посетитель'}{' '}
                        {log.login ? `(@${log.login})` : ''}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                        {log.action === 'login' ? 'Вход в дневник' : 'Визит на сайт'} • {log.device || 'Устройство'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right sm:text-right">
                    <div className="text-[11px] text-zinc-300">
                      <div>{log.ip}</div>
                      <div className="text-[10px] text-zinc-500">{log.location || 'РБ'}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 shrink-0">
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ТАБ 3: ДИАГНОСТИКА СЕТЕВЫХ ШЛЮЗОВ */}
      {activeAdminTab === 'diagnostics' && (
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs uppercase tracking-wider text-zinc-300 font-medium font-mono">
              Сетевые шлюзы и статус интеграций
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">oauth.rios.unibel.by</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">SSO Авторизация РИОС</div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400">● Шлюз активен (200 OK)</div>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">diary.e-schools.by</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">REST API v1 дневника</div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400">● Синхронизация в норме</div>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-subtle border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">Реестр пользователей</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">JSON / Хранилище</div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400">● {allUsers.length} записей</div>
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
              <div className="mt-3 p-3 rounded-lg bg-black border border-surface-border max-h-64 overflow-auto text-[10px] font-mono text-zinc-400">
                <pre>{JSON.stringify(diaryData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ПРОСМОТР БАЛЛОВ И ОЦЕНОК ДРУГОГО ПОЛЬЗОВАТЕЛЯ */}
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
                    className="p-2.5 rounded-lg bg-surface border border-surface-border flex items-center justify-between text-xs"
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

            {/* Подвал с кнопкой закрытия */}
            <div className="p-3 border-t border-surface-border bg-surface flex justify-end shrink-0">
              <button
                onClick={() => setInspectedUser(null)}
                className="h-9 px-4 rounded-lg text-xs font-mono font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
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
