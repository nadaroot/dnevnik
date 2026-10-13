'use client';

import React, { useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { getGradeBadgeClasses } from '@/lib/utils';

interface GradesAnalyticsProps {
  subjects: SubjectItem[];
  overallGpa: number;
  onOpenSubject?: (subject: SubjectItem) => void;
}

export const GradesAnalytics: React.FC<GradesAnalyticsProps> = ({
  subjects,
  overallGpa,
  onOpenSubject,
}) => {
  // 1. Распределение оценок от 10 до 1
  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalMarks = 0;

    subjects.forEach((s) => {
      if (s.isGraded !== false) {
        s.grades.forEach((g) => {
          if (g.value >= 1 && g.value <= 10) {
            counts[g.value] = (counts[g.value] || 0) + 1;
            totalMarks++;
          }
        });
      }
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    return { counts, totalMarks, maxCount };
  }, [subjects]);

  // 2. Сильные предметы и предметы, требующие внимания
  const { strongSubjects, attentionSubjects } = useMemo(() => {
    const graded = subjects.filter(
      (s) => s.isGraded !== false && s.grades.length > 0 && s.currentAverage > 0
    );

    const strong = graded
      .filter((s) => s.currentAverage >= 7.5)
      .sort((a, b) => b.currentAverage - a.currentAverage);

    const attention = graded
      .filter((s) => s.currentAverage < 6.5)
      .sort((a, b) => a.currentAverage - b.currentAverage);

    return { strongSubjects: strong, attentionSubjects: attention };
  }, [subjects]);

  // 3. Анализ предметных циклов
  const cyclesAnalysis = useMemo(() => {
    const cycles: {
      name: string;
      keywords: string[];
      subjects: SubjectItem[];
      avg: number;
    }[] = [
      {
        name: 'Точные науки',
        keywords: ['математик', 'алгебр', 'геометр', 'физик', 'информатик'],
        subjects: [],
        avg: 0,
      },
      {
        name: 'Языки и литература',
        keywords: ['язык', 'мова', 'литератур', 'літаратур', 'английск'],
        subjects: [],
        avg: 0,
      },
      {
        name: 'Естественные науки',
        keywords: ['биолог', 'хими', 'географ'],
        subjects: [],
        avg: 0,
      },
      {
        name: 'История и общество',
        keywords: ['истори', 'гісторы', 'обществовед'],
        subjects: [],
        avg: 0,
      },
      {
        name: 'Труд и спорт',
        keywords: ['физическ', 'физкультур', 'трудов', 'черчени'],
        subjects: [],
        avg: 0,
      },
    ];

    cycles.forEach((c) => {
      c.subjects = subjects.filter((s) => {
        if (s.isGraded === false) return false;
        const low = s.name.toLowerCase();
        return c.keywords.some((kw) => low.includes(kw));
      });

      const gradedInCycle = c.subjects.filter((s) => s.grades.length > 0);
      if (gradedInCycle.length > 0) {
        const sum = gradedInCycle.reduce((acc, s) => acc + s.currentAverage, 0);
        c.avg = Number((sum / gradedInCycle.length).toFixed(2));
      }
    });

    return cycles.filter((c) => c.subjects.length > 0);
  }, [subjects]);

  return (
    <div className="space-y-4">
      {/* Секция 1: Гистограмма распределения отметок */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
              Распределение полученных отметок (1 – 10)
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Всего отметок: {distribution.totalMarks}
          </span>
        </div>

        {/* Столбчатая диаграмма распределения */}
        <div className="space-y-2 pt-1">
          {[10, 9, 8, 7, 6, 5, 4, 3].map((val) => {
            const count = distribution.counts[val] || 0;
            const pct = distribution.totalMarks > 0
              ? Math.round((count / distribution.totalMarks) * 100)
              : 0;
            const barWidthPct = Math.max(3, Math.round((count / distribution.maxCount) * 100));

            return (
              <div key={val} className="flex items-center gap-3 text-xs font-mono">
                {/* Отметка */}
                <span
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border shrink-0 ${getGradeBadgeClasses(
                    val
                  )}`}
                >
                  {val}
                </span>

                {/* Полоса прогресса */}
                <div className="flex-1 h-5 bg-surface-subtle rounded-md overflow-hidden p-0.5 border border-surface-border">
                  <div
                    className={`h-full rounded transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold ${
                      val >= 8
                        ? 'bg-white text-zinc-950'
                        : val >= 5
                        ? 'bg-yellow-400 text-zinc-950'
                        : 'bg-red-600 text-white'
                    }`}
                    style={{ width: `${count > 0 ? barWidthPct : 0}%` }}
                  >
                    {count > 0 && count}
                  </div>
                </div>

                {/* Количество и процент */}
                <div className="w-20 text-right text-[11px] text-zinc-400 shrink-0">
                  <span className="font-bold text-zinc-200">{count} шт</span>{' '}
                  <span className="text-zinc-500">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Секция 2: Рейтинг предметов (Сильные стороны vs Зоны внимания) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Сильные предметы */}
        <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-zinc-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
              Сильные предметы (балл от 7.5)
            </span>
          </div>

          {strongSubjects.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-500 font-mono">
              Пока нет предметов с баллом выше 7.5
            </div>
          ) : (
            <div className="space-y-2">
              {strongSubjects.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onOpenSubject && onOpenSubject(s)}
                  className="flex items-center justify-between p-2.5 rounded bg-surface-subtle border border-surface-border hover:border-zinc-700 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {s.grades.length} отметок
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs border shrink-0 ${getGradeBadgeClasses(
                      Math.round(s.currentAverage)
                    )}`}
                  >
                    {s.currentAverage.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Предметы, требующие внимания */}
        <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
              Нужно подтянуть (балл ниже 6.5)
            </span>
          </div>

          {attentionSubjects.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-400 font-mono flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Отлично! Все предметы находятся в надежной зоне.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {attentionSubjects.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onOpenSubject && onOpenSubject(s)}
                  className="flex items-center justify-between p-2.5 rounded bg-surface-subtle border border-surface-border hover:border-zinc-700 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {s.grades.length} отметок • Рекомендуется повысить
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs border shrink-0 ${getGradeBadgeClasses(
                      Math.round(s.currentAverage)
                    )}`}
                  >
                    {s.currentAverage.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Секция 3: Разбивка по циклам и направлениям */}
      <div className="p-5 rounded-lg bg-surface border border-surface-border space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium">
            Успеваемость по предметным направлениям
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cyclesAnalysis.map((cycle) => (
            <div
              key={cycle.name}
              className="p-3.5 rounded-lg bg-surface-subtle border border-surface-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  {cycle.name}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border bg-surface border-surface-border text-zinc-200">
                  {cycle.avg > 0 ? cycle.avg.toFixed(2) : '—'}
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 line-clamp-1 truncate">
                {cycle.subjects.map((s) => s.name).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
