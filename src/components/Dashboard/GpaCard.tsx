'use client';

import React, { useMemo } from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { calculateProjectedGpa } from '@/lib/eschools/calculator';

interface GpaCardProps {
  overallGpa: number;
  subjects: SubjectItem[];
}

export const GpaCard: React.FC<GpaCardProps> = ({ overallGpa, subjects }) => {
  const totalGradesCount = subjects.reduce((acc, s) => acc + s.grades.length, 0);

  // Расчет предполагаемого среднего балла по установленным целям
  const stats = useMemo(() => {
    return calculateProjectedGpa(subjects, overallGpa);
  }, [subjects, overallGpa]);

  // Определение предмета с максимальным и минимальным баллом
  const validSubjects = subjects.filter((s) => s.grades.length > 0);
  const bestSubject = validSubjects.length
    ? [...validSubjects].sort((a, b) => b.currentAverage - a.currentAverage)[0]
    : null;
  const lowestSubject = validSubjects.length
    ? [...validSubjects].sort((a, b) => a.currentAverage - b.currentAverage)[0]
    : null;

  return (
    <div className="p-5 rounded-lg bg-surface border border-surface-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
            Общий средний балл
          </span>
          <span className="text-xs font-mono text-zinc-400">
            Оценок: {totalGradesCount}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-zinc-100">
            {overallGpa.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-300 bg-surface-subtle px-2 py-0.5 rounded border border-surface-border">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            <span>Текущий</span>
          </div>
        </div>

        {/* Блок: Предполагаемый средний балл по целям */}
        <div className="mt-4 p-3 rounded bg-surface-subtle border border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-surface border border-surface-border flex items-center justify-center text-zinc-200">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Предполагаемый по целям
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {stats.targetsSetCount > 0
                  ? `Цели: ${stats.targetsSetCount} из ${stats.gradedCount} предм.`
                  : 'По текущей успеваемости'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-mono font-bold text-zinc-100">
              {stats.projectedGpa.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono">
              {stats.difference > 0 ? (
                <span className="text-zinc-200 font-semibold">+{stats.difference.toFixed(2)}</span>
              ) : stats.difference === 0 ? (
                <span className="text-zinc-500">цель = факт</span>
              ) : (
                <span className="text-zinc-400">{stats.difference.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Информационные ячейки лидеров */}
      <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-surface-border/60">
        <div className="p-2 rounded bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-zinc-500 font-mono">Лидер</div>
          <div className="text-xs font-medium text-zinc-200 mt-0.5 truncate">
            {bestSubject ? bestSubject.name : '—'}
          </div>
          <div className="text-[11px] font-mono font-bold text-zinc-200 mt-0.5">
            {bestSubject ? `${bestSubject.currentAverage.toFixed(2)}` : ''}
          </div>
        </div>

        <div className="p-2 rounded bg-surface-subtle border border-surface-border">
          <div className="text-[10px] text-zinc-500 font-mono">Зона внимания</div>
          <div className="text-xs font-medium text-zinc-200 mt-0.5 truncate">
            {lowestSubject ? lowestSubject.name : '—'}
          </div>
          <div className="text-[11px] font-mono font-bold text-zinc-300 mt-0.5">
            {lowestSubject ? `${lowestSubject.currentAverage.toFixed(2)}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
