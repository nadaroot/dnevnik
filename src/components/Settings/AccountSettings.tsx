'use client';

import React, { useState, useEffect } from 'react';
import { User, LogOut, Users, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { UserProfile } from '@/lib/eschools/types';

interface AccountSettingsProps {
  profile: UserProfile;
  onLogout: () => void;
  onOpenAccounts?: () => void;
  accountsCount?: number;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
}

const MANUAL_SYNC_KEY = 'electro_dnevnik_manual_sync_ts';
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 минут = 300 000 мс

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  profile,
  onLogout,
  onOpenAccounts,
  accountsCount = 1,
  onManualSync,
  isSyncing = false,
}) => {
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      try {
        const raw = localStorage.getItem(MANUAL_SYNC_KEY);
        if (!raw) return 0;
        const lastTs = parseInt(raw, 10);
        if (isNaN(lastTs)) return 0;
        const elapsed = Date.now() - lastTs;
        if (elapsed < COOLDOWN_DURATION_MS) {
          return Math.ceil((COOLDOWN_DURATION_MS - elapsed) / 1000);
        }
      } catch {}
      return 0;
    };

    setCooldownRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setCooldownRemaining(rem);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSyncClick = async () => {
    if (cooldownRemaining > 0 || isSyncing || !onManualSync) return;
    try {
      localStorage.setItem(MANUAL_SYNC_KEY, String(Date.now()));
      setCooldownRemaining(300);
      await onManualSync();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Карточка учетной записи */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100">
              <User className="w-6 h-6 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  {profile.studentName}
                </h3>
                {profile.isAdmin && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface-subtle text-zinc-300 border border-surface-border">
                    Админ
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {profile.className} • {profile.schoolName}
              </p>
              {profile.login && (
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  @{profile.login}
                </p>
              )}
            </div>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-surface-subtle text-zinc-300 border-surface-border flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-zinc-400" />
            Подключено
          </span>
        </div>

        {/* Параметры шлюза и синхронизации */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-surface-subtle border border-surface-border/60">
            <div className="text-[11px] text-zinc-500">Портал</div>
            <div className="text-zinc-200 mt-0.5">diary.e-schools.by</div>
          </div>
          <div className="p-2.5 rounded bg-surface-subtle border border-surface-border/60">
            <div className="text-[11px] text-zinc-500">Автопроверка</div>
            <div className="text-zinc-300 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Каждые 10 минут</span>
            </div>
          </div>
        </div>

        {profile.lastSync && (
          <div className="mt-3 text-[11px] text-zinc-500 font-mono text-right">
            Последняя синхронизация: <span className="text-zinc-300">{profile.lastSync}</span>
          </div>
        )}

        {onOpenAccounts && (
          <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Сохраненные профили ({accountsCount})
            </span>
            <button
              onClick={onOpenAccounts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-subtle hover:bg-surface-muted border border-surface-border text-zinc-200 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Управление аккаунтами</span>
            </button>
          </div>
        )}
      </div>

      {/* Принудительная синхронизация данных с кулдауном 5 минут */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              Принудительная синхронизация данных
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed max-w-md">
              Срочное обновление оценок и пересчет среднего балла (актуально при добавлении на рабочий стол PWA или если балл не совпадает).
            </p>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={cooldownRemaining > 0 || isSyncing || !onManualSync}
            className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-mono font-medium transition-all ${
              cooldownRemaining > 0 || isSyncing
                ? 'bg-surface-subtle text-zinc-500 border border-surface-border cursor-not-allowed opacity-80'
                : 'bg-zinc-100 text-zinc-950 font-bold hover:bg-white active:scale-95 border border-zinc-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Обновление...'
                : cooldownRemaining > 0
                ? `КД: ${formatTime(cooldownRemaining)}`
                : 'Обновить сейчас'}
            </span>
          </button>
        </div>

        {cooldownRemaining > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 pt-2 border-t border-surface-border/40">
            <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
            <span>
              Повторное принудительное обновление станет доступно через {formatTime(cooldownRemaining)} (таймаут 5 минут)
            </span>
          </div>
        )}
      </div>

      {/* Выход из профиля */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-200">
            Выход из учетной записи
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Завершить сеанс на этом устройстве
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium bg-surface-subtle hover:bg-surface-muted border border-surface-border text-zinc-200 transition-colors"
        >
          <LogOut className="w-4 h-4 text-zinc-400" />
          <span>Выйти из профиля</span>
        </button>
      </div>
    </div>
  );
};
