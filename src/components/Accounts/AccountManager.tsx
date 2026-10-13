'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Check,
  Trash2,
  X,
  LogIn,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { SavedAccount, UserProfile } from '@/lib/eschools/types';

interface AccountManagerProps {
  currentProfile: UserProfile;
  savedAccounts: SavedAccount[];
  onSwitchAccount: (account: SavedAccount) => void;
  onAddNewAccount: (credentials: { login: string; password?: string }) => Promise<void>;
  onRemoveAccount: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  currentProfile,
  savedAccounts,
  onSwitchAccount,
  onAddNewAccount,
  onRemoveAccount,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      setError('Введите логин');
      return;
    }
    setError(null);
    try {
      await onAddNewAccount({ login: login.trim(), password });
      setLogin('');
      setPassword('');
      setShowAddForm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления аккаунта');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Шапка модалки */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-200">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Управление аккаунтами
              </h3>
              <p className="text-[11px] text-zinc-400">
                Быстрое переключение между профилями в 1 клик
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Список сохраненных аккаунтов */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {savedAccounts.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 font-mono">
              Нет сохраненных аккаунтов. Добавьте второй аккаунт ниже.
            </div>
          ) : (
            savedAccounts.map((acc) => {
              const isCurrent =
                acc.login.toLowerCase() === (currentProfile.login?.toLowerCase() || 'nadaroot');

              return (
                <div
                  key={acc.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-surface-subtle border-zinc-500 shadow-sm'
                      : 'bg-surface/60 border-surface-border hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {acc.studentName}
                      </span>
                      {acc.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-surface-border text-zinc-300">
                          Админ
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      @{acc.login} • {acc.className} • {acc.schoolName}
                    </div>
                    {acc.overallGpa !== undefined && (
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        Средний балл: <span className="text-zinc-200 font-bold">{acc.overallGpa.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-200 px-2 py-1 rounded bg-surface border border-surface-border">
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                        Активен
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSwitchAccount(acc);
                          onClose();
                        }}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
                      >
                        Войти
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => onRemoveAccount(acc.id)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Форма добавления нового аккаунта */}
          {showAddForm ? (
            <form onSubmit={handleAddSubmit} className="mt-3 p-3.5 rounded-lg bg-surface border border-surface-border space-y-3">
              <div className="text-xs font-semibold text-zinc-200">
                Добавить учетную запись e-schools.by
              </div>

              {error && (
                <div className="p-2 rounded bg-surface-subtle border border-surface-border text-[11px] text-zinc-200 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                  Логин (e-schools / schools.by)
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Например, nadaroot"
                  className="w-full px-3 py-2 rounded bg-surface-subtle border border-surface-border text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded bg-surface-subtle border border-surface-border text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Проверка...' : 'Сохранить и войти'}</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mt-2 py-2.5 px-3 rounded-lg border border-dashed border-surface-border hover:border-zinc-600 text-xs text-zinc-300 hover:text-zinc-100 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить еще один аккаунт</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
