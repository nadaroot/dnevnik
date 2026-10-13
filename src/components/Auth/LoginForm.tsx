'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { SavedAccount } from '@/lib/eschools/types';

interface LoginFormProps {
  onLogin: (credentials: {
    login: string;
    password?: string;
    subdomain?: string;
    sessionCookie?: string;
  }) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  savedAccounts?: SavedAccount[];
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  isLoading,
  errorMessage,
  savedAccounts = [],
}) => {
  const primaryAccount = savedAccounts.length > 0 ? savedAccounts[0] : null;

  const [login, setLogin] = useState(primaryAccount?.login || '');
  const [password, setPassword] = useState(primaryAccount?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showManualForm, setShowManualForm] = useState(!primaryAccount);

  // При наличии сохраненного аккаунта подтягиваем данные
  useEffect(() => {
    if (primaryAccount) {
      if (!login) setLogin(primaryAccount.login);
      if (!password && primaryAccount.password) setPassword(primaryAccount.password);
    }
  }, [primaryAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      login: login.trim(),
      password,
    });
  };

  const handleQuickLogin = (account: SavedAccount) => {
    onLogin({
      login: account.login,
      password: account.password,
      sessionCookie: account.sessionCookie,
    });
  };

  return (
    <div className="relative z-10 w-full max-w-sm px-4 select-none">
      <div className="p-6 md:p-8 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800 shadow-2xl">
        {/* Шапка формы */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-inner mb-3">
            <GraduationCap className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h1 className="text-base md:text-lg font-bold text-zinc-100 tracking-tight">
            Электронный Дневник
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {primaryAccount && !showManualForm ? 'Быстрый доступ' : 'Авторизация в системе'}
          </p>
        </div>

        {/* Баннер ошибки */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-surface border border-surface-border text-zinc-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Секция 1: Карточка быстрого входа для сохраненного аккаунта */}
        {primaryAccount && !showManualForm ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-black/60 border border-zinc-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Сохраненный профиль
                </span>
                {primaryAccount.overallGpa ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-800 text-zinc-100 border border-zinc-700">
                    Средний: {primaryAccount.overallGpa.toFixed(2)}
                  </span>
                ) : null}
              </div>
              <div className="font-semibold text-sm text-zinc-100 truncate">
                {primaryAccount.studentName || primaryAccount.login}
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                {primaryAccount.schoolName ? `${primaryAccount.schoolName} • ` : ''}
                {primaryAccount.className || primaryAccount.login}
              </div>
            </div>

            {/* Кнопка быстрого входа в 1 клик */}
            <button
              type="button"
              onClick={() => handleQuickLogin(primaryAccount)}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-tight flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Вход в дневник...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-zinc-950" />
                  <span>
                    Войти как {primaryAccount.studentName ? primaryAccount.studentName.split(' ')[0] : primaryAccount.login}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Ссылка для смены логина / ввода пароля вручную */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono underline underline-offset-4"
              >
                Войти под другим логином
              </button>
            </div>
          </div>
        ) : (
          /* Секция 2: Стандартная форма ввода логина и пароля с глазиком */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Логин */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Имя пользователя"
                  spellCheck={false}
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-black border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Пароль с кнопкой-глазиком */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-black border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Чекбокс: Запомнить меня */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-black border border-zinc-700 accent-zinc-200 cursor-pointer"
                />
                <span className="text-[11px] text-zinc-400 font-mono">
                  Запомнить логин и пароль
                </span>
              </label>

              {primaryAccount && (
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                >
                  Отмена
                </button>
              )}
            </div>

            {/* Кнопка входа */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-tight flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Проверка учетных данных...</span>
                </>
              ) : (
                <>
                  <span>Войти в дневник</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
            Прямое защищенное соединение. Данные сессии шифруются и хранятся локально.
          </p>
        </div>
      </div>
    </div>
  );
};
