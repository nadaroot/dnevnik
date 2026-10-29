'use client';

import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Calendar,
  Settings,
  GraduationCap,
  ShieldAlert,
  Users,
  Target,
} from 'lucide-react';
import { UserProfile } from '@/lib/eschools/types';

export type NavTab = 'dashboard' | 'averages' | 'goals' | 'subjects' | 'schedule' | 'admin' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  profile: UserProfile;
  overallGpa: number;
  projectedGpa?: number;
  onOpenAccounts?: () => void;
  accountsCount?: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  profile,
  overallGpa,
  projectedGpa,
  onOpenAccounts,
  accountsCount = 1,
  isAdmin: isAdminProp,
}) => {
  const isAdmin =
    isAdminProp ||
    profile.isAdmin ||
    profile.login?.toLowerCase() === 'nadaroot' ||
    profile.studentName?.toLowerCase().includes('шипалов');

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'averages', label: 'Баллы', icon: BarChart3 },
    { id: 'goals', label: 'До цели', icon: Target },
    { id: 'subjects', label: 'Предметы', icon: BookOpen },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    ...(isAdmin
      ? [{ id: 'admin' as NavTab, label: 'Админка', icon: ShieldAlert, badge: 'ROOT' }]
      : []),
    { id: 'settings', label: 'Профиль / Опции', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-surface border-r border-surface-border z-30 select-none">
      {/* Логотип и статус */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              Электронный Дневник
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Кабинет учащегося
            </p>
          </div>
        </div>

        {/* Карточка ученика */}
        <div className="mt-3 p-3 rounded bg-surface-subtle border border-surface-border">
          <div className="text-xs font-medium text-zinc-200 truncate">
            {profile.studentName}
          </div>
          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
            {profile.className} • {profile.schoolName}
          </div>
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-surface-border/60">
            <span className="text-[11px] text-zinc-400">Общий балл</span>
            <span className="text-xs font-mono font-bold text-zinc-100 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
              {overallGpa.toFixed(2)}
            </span>
          </div>
          {typeof projectedGpa === 'number' && projectedGpa > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-zinc-400" />
                По целям
              </span>
              <span className="text-xs font-mono font-bold text-zinc-200 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
                {projectedGpa.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {onOpenAccounts && (
          <button
            onClick={onOpenAccounts}
            className="mt-2 w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium bg-surface-subtle hover:bg-surface-muted border border-surface-border text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Мультиаккаунты</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded">
              {accountsCount}
            </span>
          </button>
        )}
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Автосинхронизация и футер */}
      <div className="p-4 border-t border-surface-border bg-surface-subtle/30 space-y-1.5">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span>Автопроверка каждые 5 мин</span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono text-center truncate">
          Обновлено: {profile.lastSync || 'Только что'}
        </div>
      </div>
    </aside>
  );
};
