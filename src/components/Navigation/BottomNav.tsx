'use client';

import React from 'react';
import { LayoutDashboard, BarChart3, BookOpen, Calendar, Settings, ShieldAlert, Target } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isAdmin = false,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ElementType }[] = isAdmin
    ? [
        { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
        { id: 'averages', label: 'Баллы', icon: BarChart3 },
        { id: 'goals', label: 'До цели', icon: Target },
        { id: 'schedule', label: 'Расписание', icon: Calendar },
        { id: 'admin', label: 'Админ', icon: ShieldAlert },
        { id: 'settings', label: 'Опции', icon: Settings },
      ]
    : [
        { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
        { id: 'averages', label: 'Баллы', icon: BarChart3 },
        { id: 'goals', label: 'До цели', icon: Target },
        { id: 'schedule', label: 'Расписание', icon: Calendar },
        { id: 'settings', label: 'Опции', icon: Settings },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur border-t border-surface-border pb-safe select-none">
      <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} h-14`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-zinc-100 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
