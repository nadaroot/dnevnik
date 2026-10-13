'use client';

import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { QuarterInfo } from '@/lib/eschools/types';

interface QuarterCountdownProps {
  quarters: QuarterInfo[];
  currentQuarter: number;
  onSelectQuarter?: (quarterNum: number) => void;
}

export const QuarterCountdown: React.FC<QuarterCountdownProps> = ({
  quarters,
  currentQuarter,
  onSelectQuarter,
}) => {
  const activeQuarter = quarters.find((q) => q.number === currentQuarter) || quarters[0];

  // Расчет оставшихся дней до конца четверти
  const now = new Date();
  const endDate = new Date(activeQuarter.endDate);
  const startDate = new Date(activeQuarter.startDate);

  const totalDurationMs = Math.max(1, endDate.getTime() - startDate.getTime());
  const elapsedMs = Math.max(0, Math.min(totalDurationMs, now.getTime() - startDate.getTime()));
  const progressPercent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

  const diffTimeMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24)));

  return (
    <div className="p-5 rounded-lg bg-surface border border-surface-border">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
          До конца четверти
        </span>
        <div className="flex items-center gap-1">
          {quarters.map((q) => (
            <button
              key={q.number}
              onClick={() => onSelectQuarter?.(q.number)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                q.number === currentQuarter
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              {q.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-zinc-100">
          {daysRemaining}
        </span>
        <span className="text-sm text-zinc-400 font-mono">
          {pluralizeDays(daysRemaining)}
        </span>
      </div>

      {/* Прогресс-бар четверти */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-1.5">
          <span>{formatShortDate(activeQuarter.startDate)}</span>
          <span className="text-zinc-300 font-medium">{progressPercent}% срока</span>
          <span>{formatShortDate(activeQuarter.endDate)}</span>
        </div>
        <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-surface-border">
          <div
            className="h-full bg-zinc-200 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-surface-border/60 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
        <span>Период: {activeQuarter.name}</span>
        <span>Осталось {daysRemaining} дн.</span>
      </div>
    </div>
  );
};

function pluralizeDays(count: number): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'дней';
  if (n1 > 1 && n1 < 5) return 'дня';
  if (n1 === 1) return 'день';
  return 'дней';
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`;
  }
  return dateStr;
}
