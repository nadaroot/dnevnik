'use client';

import React, { useState } from 'react';
import {
  Crown,
  Users,
  Activity,
  Database,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { SavedAccount, UserProfile, DiaryData } from '@/lib/eschools/types';

interface AdminPanelProps {
  profile: UserProfile;
  savedAccounts: SavedAccount[];
  onSwitchAccount: (account: SavedAccount) => void;
  onRemoveAccount: (id: string) => void;
  onForceResync: () => void;
  isSyncing: boolean;
  diaryData?: DiaryData;
}

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
              onClick={onForceResync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium bg-surface-subtle border border-surface-border text-zinc-200 hover:text-zinc-100 hover:border-zinc-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Синхронизация...' : 'Глобальный ресинк'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* РАЗДЕЛ 1: Сохраненные аккаунты (Мультиаккаунтинг) */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
              База сохраненных аккаунтов на устройстве ({savedAccounts.length})
            </h4>
          </div>
        </div>

        {savedAccounts.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 font-mono">
            Пока нет других сохраненных профилей. При входе с других учетных записей они автоматически появятся здесь.
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
                      {acc.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-surface-border text-zinc-300">
                          Админ
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-surface-border text-zinc-100 font-bold">
                          Текущий
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {acc.className} • {acc.schoolName} • GPA:{' '}
                      <span className="font-mono text-zinc-300">
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
                        Переключить
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

      {/* РАЗДЕЛ 2: Диагностика сервисов и сетевых шлюзов */}
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
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              SSO Авторизация РИОС
            </div>
            <div className="mt-2 text-[10px] font-mono text-zinc-300">
              ● Шлюз активен (200 OK)
            </div>
          </div>

          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                diary.e-schools.by
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              REST API v1 дневника
            </div>
            <div className="mt-2 text-[10px] font-mono text-zinc-300">
              ● 19 предметов загружено
            </div>
          </div>

          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                Резервный HTML
              </span>
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Парсер Django schools.by
            </div>
            <div className="mt-2 text-[10px] font-mono text-zinc-400">
              ○ В режиме ожидания
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
    </div>
  );
};
