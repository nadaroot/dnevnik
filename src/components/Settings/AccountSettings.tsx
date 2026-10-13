'use client';

import React from 'react';
import { User, LogOut, Users, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '@/lib/eschools/types';

interface AccountSettingsProps {
  profile: UserProfile;
  onLogout: () => void;
  onOpenAccounts?: () => void;
  accountsCount?: number;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  profile,
  onLogout,
  onOpenAccounts,
  accountsCount = 1,
}) => {
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
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Каждые 5 минут</span>
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
