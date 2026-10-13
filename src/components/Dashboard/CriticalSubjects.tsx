'use client';

import React from 'react';
import { AlertCircle, TrendingDown, ArrowRight, Calculator } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { getGradeBadgeClasses } from '@/lib/utils';

interface CriticalSubjectsProps {
  subjects: SubjectItem[];
  onOpenSubject: (subject: SubjectItem) => void;
}

export const CriticalSubjects: React.FC<CriticalSubjectsProps> = ({
  subjects,
  onOpenSubject,
}) => {
  // Фильтрация критических предметов:
  // 1. Исключаем безоценочные и зачетные предметы (Классный час, Инф. час, Искусство)
  // 2. Исключаем предметы без единой оценки
  // 3. Предметы 1 раз в неделю (полугодие) попадают в риск только при балле < 5.0 (смягченный порог)
  // 4. Четвертные предметы попадают в риск при балле < 6.0 или выраженном падении балла при < 7.0
  const criticalList = subjects
    .filter((s) => {
      if (s.isGraded === false || s.periodType === 'none') return false;
      const lower = s.name.toLowerCase();
      if (
        lower.includes('информационный час') ||
        lower.includes('классный час') ||
        lower.includes('искусство')
      ) {
        return false;
      }
      if (!s.grades || s.grades.length === 0) return false;

      // Полугодовые (1 ч/нед): менее рисковые, порог < 5.0
      if (s.periodType === 'semester') {
        return s.currentAverage > 0 && s.currentAverage < 5.0;
      }

      // Четвертные предметы:
      return s.critical || s.currentAverage < 6.0 || (s.trend === 'down' && s.currentAverage < 7.0);
    })
    .sort((a, b) => a.currentAverage - b.currentAverage);

  return (
    <div className="p-5 rounded-lg bg-surface border border-surface-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-400" />
          <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
            Критические предметы и зоны риска
          </span>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          На контроле: {criticalList.length}
        </span>
      </div>

      {criticalList.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500 font-mono">
          Критических предметов нет. Все оценки находятся в стабильной зоне.
        </div>
      ) : (
        <div className="space-y-2.5">
          {criticalList.map((subject) => {
            const badge = getGradeBadgeClasses(Math.round(subject.currentAverage));
            const lastGrade =
              subject.grades.length > 0
                ? subject.grades[subject.grades.length - 1].value
                : null;

            return (
              <div
                key={subject.id}
                onClick={() => onOpenSubject(subject)}
                className="group flex items-center justify-between p-3 rounded bg-surface-subtle border border-surface-border hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                      {subject.name}
                    </span>
                    {subject.periodType === 'semester' && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-surface border border-surface-border text-zinc-400 shrink-0">
                        Полугодие
                      </span>
                    )}
                    {subject.trend === 'down' && (
                      <span className="flex items-center text-[10px] text-zinc-400 font-mono shrink-0">
                        <TrendingDown className="w-3 h-3 mr-0.5" />
                        Снижение
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {subject.teacher ? `${subject.teacher} • ` : ''}{subject.grades.length} оценок
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-zinc-100">
                      {subject.currentAverage.toFixed(2)}
                    </div>
                    {lastGrade !== null && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        Посл: {lastGrade}
                      </div>
                    )}
                  </div>

                  <button
                    title="Открыть калькулятор стратегии"
                    className="p-1.5 rounded bg-surface-muted border border-surface-border group-hover:border-zinc-600 text-zinc-400 group-hover:text-zinc-100 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
