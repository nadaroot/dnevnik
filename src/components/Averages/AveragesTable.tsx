'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  ArrowUpDown,
  Filter,
  Calculator,
  Target,
  Award,
  Sparkles,
  Info,
  ChevronRight,
  Clock,
  BookOpen,
} from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { getGradeBadgeClasses } from '@/lib/utils';

interface AveragesTableProps {
  subjects: SubjectItem[];
  overallGpa: number;
  onOpenSubject: (subject: SubjectItem) => void;
  onOpenTargetModal?: (subject: SubjectItem) => void;
}

type FilterType = 'all' | 'with-grades' | 'quarter' | 'semester' | 'none';
type SortField = 'gpa' | 'name' | 'count';
type SortDirection = 'desc' | 'asc';

export const AveragesTable: React.FC<AveragesTableProps> = ({
  subjects,
  overallGpa,
  onOpenSubject,
  onOpenTargetModal,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('gpa');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Подсчет сводной статистики
  const stats = useMemo(() => {
    let totalMarks = 0;
    let gradedCount = 0;
    let semesterCount = 0;
    let nonGradedCount = 0;

    subjects.forEach((s) => {
      totalMarks += s.grades?.length || 0;
      if (s.periodType === 'none' || s.isGraded === false) {
        nonGradedCount++;
      } else if (s.periodType === 'semester') {
        semesterCount++;
        gradedCount++;
      } else {
        gradedCount++;
      }
    });

    return { totalMarks, gradedCount, semesterCount, nonGradedCount };
  }, [subjects]);

  // Фильтрация и сортировка предметов
  const filteredSubjects = useMemo(() => {
    let list = subjects.filter((s) => {
      // Поиск по названию
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (filter === 'with-grades') {
        return s.grades && s.grades.length > 0;
      }
      if (filter === 'quarter') {
        return s.periodType === 'quarter' || (!s.periodType && s.isGraded !== false);
      }
      if (filter === 'semester') {
        return s.periodType === 'semester';
      }
      if (filter === 'none') {
        return s.periodType === 'none' || s.isGraded === false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'gpa') {
        cmp = a.currentAverage - b.currentAverage;
      } else if (sortField === 'count') {
        cmp = (a.grades?.length || 0) - (b.grades?.length || 0);
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'ru');
      }

      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [subjects, filter, sortField, sortDirection, searchQuery]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Сводный заголовок статистики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-surface border border-surface-border">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Общий балл (GPA)
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {overallGpa.toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">из 10.0</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface border border-surface-border">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Всего отметок
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {stats.totalMarks}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">в текущей четверти</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface border border-surface-border">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Оцениваемых предметов
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {stats.gradedCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              ({stats.semesterCount} полугодовых)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface border border-surface-border">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Без отметок / Зачет
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {stats.nonGradedCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">вне зоны риска</span>
          </div>
        </div>
      </div>

      {/* Панель фильтров и поиска */}
      <div className="p-4 rounded-lg bg-surface border border-surface-border space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию предмета..."
            className="px-3 py-2 rounded bg-surface-subtle border border-surface-border text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />

          {/* Фильтр-чипы */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border'
              }`}
            >
              Все ({subjects.length})
            </button>
            <button
              onClick={() => setFilter('with-grades')}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === 'with-grades'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border'
              }`}
            >
              С оценками
            </button>
            <button
              onClick={() => setFilter('quarter')}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === 'quarter'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border'
              }`}
            >
              Четвертные
            </button>
            <button
              onClick={() => setFilter('semester')}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === 'semester'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border'
              }`}
            >
              Полугодовые (1 ч/нед)
            </button>
            <button
              onClick={() => setFilter('none')}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === 'none'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border'
              }`}
            >
              Зачет / Инф. час
            </button>
          </div>
        </div>
      </div>

      {/* Основная таблица баллов (Десктоп) */}
      <div className="hidden md:block rounded-lg bg-surface border border-surface-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface-subtle/50 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
                >
                  <span>Предмет</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 w-32">Тип аттестации</th>
              <th className="py-3 px-3">Отметки (история)</th>
              <th className="py-3 px-3 w-24 text-center">
                <button
                  onClick={() => toggleSort('count')}
                  className="inline-flex items-center gap-1 hover:text-zinc-200 transition-colors"
                >
                  <span>Кол-во</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 w-32 text-right">
                <button
                  onClick={() => toggleSort('gpa')}
                  className="inline-flex items-center gap-1 hover:text-zinc-200 transition-colors ml-auto"
                >
                  <span>Средний балл</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 w-14 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 text-xs">
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono text-xs">
                  По выбранным критериям предметов не найдено
                </td>
              </tr>
            ) : (
              filteredSubjects.map((s) => {
                const isPassFail = s.gradingType === 'pass_fail' || s.name.toLowerCase().includes('искусство');
                const isClassHour = s.gradingType === 'none' || s.name.toLowerCase().includes('классный час') || s.name.toLowerCase().includes('информационный час');
                const isNonGraded = isPassFail || isClassHour || s.periodType === 'none' || s.isGraded === false;
                const isSemester = s.periodType === 'semester';
                const roundedGpa = Math.round(s.currentAverage);
                const badge = getGradeBadgeClasses(roundedGpa);

                return (
                  <tr
                    key={s.id}
                    onClick={() => onOpenSubject(s)}
                    className="hover:bg-surface-subtle/70 transition-colors cursor-pointer group"
                  >
                    {/* Название предмета */}
                    <td className="py-3.5 px-4 font-medium text-zinc-200 group-hover:text-zinc-100">
                      <div className="truncate max-w-xs">{s.name}</div>
                      {s.teacher ? (
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate font-normal">
                          {s.teacher}
                          {s.lessonsPerWeek ? ` • ${s.lessonsPerWeek} ч/нед` : ''}
                        </div>
                      ) : s.lessonsPerWeek ? (
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate font-normal">
                          {s.lessonsPerWeek} ч/нед
                        </div>
                      ) : null}
                    </td>

                    {/* Тип аттестации */}
                    <td className="py-3.5 px-3">
                      {isPassFail ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Зачет/Незачет
                        </span>
                      ) : isClassHour ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                          Без оценок
                        </span>
                      ) : isSemester ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                          Полугодие
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/60 text-zinc-400 border border-zinc-700">
                          Четверть
                        </span>
                      )}
                    </td>

                    {/* Полоса чипов отметок */}
                    <td className="py-3.5 px-3">
                      {isPassFail ? (
                        <span className="text-[11px] text-zinc-400 font-mono italic">
                          Зачетная система (баллы не ставятся)
                        </span>
                      ) : isClassHour ? (
                        <span className="text-[11px] text-zinc-500 font-mono italic">
                          Оценки не выставляются
                        </span>
                      ) : s.grades && s.grades.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                          {s.grades.map((g, idx) => {
                            const valBadge = getGradeBadgeClasses(g.value);
                            return (
                              <span
                                key={g.id || idx}
                                title={`${g.value} (${g.date})${g.topic ? ` - ${g.topic}` : ''}`}
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold border transition-transform hover:scale-110 ${valBadge}`}
                              >
                                {g.value}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Нет отметок
                        </span>
                      )}
                    </td>

                    {/* Количество оценок */}
                    <td className="py-3.5 px-3 text-center font-mono text-zinc-400 text-xs">
                      {isNonGraded ? '—' : s.grades?.length || 0}
                    </td>

                    {/* Средний балл и Цель */}
                    <td className="py-3.5 px-4 text-right">
                      {isPassFail ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Зачет
                        </span>
                      ) : isClassHour ? (
                        <span className="text-zinc-500 font-mono text-xs">—</span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          {s.targetGrade ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTargetModal?.(s);
                              }}
                              title="Нажмите, чтобы изменить цель"
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 transition-colors"
                            >
                              Цель: {s.targetGrade}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTargetModal?.(s);
                              }}
                              title="Поставить цель"
                              className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors"
                            >
                              + Цель
                            </button>
                          )}

                          {s.grades && s.grades.length > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${badge}`}
                            >
                              {s.currentAverage.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-zinc-500 font-mono text-xs">Нет отметок</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Действие */}
                    <td className="py-3.5 px-3 text-center text-zinc-500 group-hover:text-zinc-300">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Мобильный список карточек (Mobile-First) */}
      <div className="md:hidden space-y-2.5">
        {filteredSubjects.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 font-mono text-xs rounded-lg bg-surface border border-surface-border">
            По выбранным критериям предметов не найдено
          </div>
        ) : (
          filteredSubjects.map((s) => {
            const isPassFail = s.gradingType === 'pass_fail' || s.name.toLowerCase().includes('искусство');
            const isClassHour = s.gradingType === 'none' || s.name.toLowerCase().includes('классный час') || s.name.toLowerCase().includes('информационный час');
            const isNonGraded = isPassFail || isClassHour || s.periodType === 'none' || s.isGraded === false;
            const isSemester = s.periodType === 'semester';
            const roundedGpa = Math.round(s.currentAverage);
            const badge = getGradeBadgeClasses(roundedGpa);

            return (
              <div
                key={s.id}
                onClick={() => onOpenSubject(s)}
                className="p-3.5 rounded-lg bg-surface border border-surface-border hover:border-zinc-700 active:bg-surface-subtle transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-100 truncate">
                      {s.name}
                    </div>
                    {s.teacher && (
                      <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        {s.teacher}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {isPassFail ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Зачет/Незачет
                      </span>
                    ) : isClassHour ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                        Без оценок
                      </span>
                    ) : isSemester ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                        Полугодие
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/60 text-zinc-400 border border-zinc-700">
                        Четверть
                      </span>
                    )}

                    {!isNonGraded && s.grades && s.grades.length > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${badge}`}
                      >
                        {s.currentAverage.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Оценки на мобильном */}
                {!isNonGraded && (
                  <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                      {s.grades && s.grades.length > 0 ? (
                        s.grades.map((g, idx) => (
                          <span
                            key={g.id || idx}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold border shrink-0 ${getGradeBadgeClasses(
                              g.value
                            )}`}
                          >
                            {g.value}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Нет отметок
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.targetGrade ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTargetModal?.(s);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-200 border border-zinc-600"
                        >
                          {s.targetGrade}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTargetModal?.(s);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 border border-dashed border-zinc-700"
                        >
                          + Цель
                        </button>
                      )}
                      <button
                        title="Калькулятор стратегии"
                        className="p-1 rounded bg-surface-subtle text-zinc-400"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
