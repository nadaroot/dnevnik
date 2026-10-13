'use client';

import React, { useState, useMemo } from 'react';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  Calculator,
  RotateCcw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import {
  calculateDetailedTargetStrategy,
  simulateGrades,
  calculateProjectedGpa,
  DetailedTargetStrategy,
} from '@/lib/eschools/calculator';
import { getGradeBadgeClasses } from '@/lib/utils';

interface GoalsTargetTabProps {
  subjects: SubjectItem[];
  onOpenTargetModal: (subject: SubjectItem) => void;
  onSaveTarget: (subjectId: string, targetVal: number) => void;
  onClearTarget: (subjectId: string) => void;
  onOpenSubjectDetail?: (subject: SubjectItem) => void;
}

export const GoalsTargetTab: React.FC<GoalsTargetTabProps> = ({
  subjects,
  onOpenTargetModal,
  onSaveTarget,
  onClearTarget,
  onOpenSubjectDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'achieved' | 'no_target'>('all');

  // Раскрытые карточки (accordion): Set id предметов
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Локальное состояние симуляции гипотетических отметок по предметам: Record<subjectId, number[]>
  const [simulatedGradesMap, setSimulatedGradesMap] = useState<Record<string, number[]>>({});

  // Разделяем предметы на оцениваемые и без числовых отметок
  const { gradedSubjects, nonGradedSubjects } = useMemo(() => {
    const graded: SubjectItem[] = [];
    const nonGraded: SubjectItem[] = [];

    subjects.forEach((s) => {
      const lower = s.name.toLowerCase();
      const isPassFail = s.gradingType === 'pass_fail' || lower.includes('искусство');
      const isClassHour =
        s.gradingType === 'none' ||
        lower.includes('классный час') ||
        lower.includes('информационный час') ||
        lower.includes('час информирования');

      if (isPassFail || isClassHour || s.isGraded === false || s.periodType === 'none') {
        nonGraded.push(s);
      } else {
        graded.push(s);
      }
    });

    return { gradedSubjects: graded, nonGradedSubjects: nonGraded };
  }, [subjects]);

  // Расчет предполагаемого среднего балла по целям
  const projectedStats = useMemo(() => {
    return calculateProjectedGpa(subjects);
  }, [subjects]);

  // Сводная статистика
  const stats = useMemo(() => {
    let withTarget = 0;
    let achieved = 0;
    let pending = 0;
    let noTarget = 0;

    gradedSubjects.forEach((s) => {
      if (s.targetGrade && s.targetGrade > 0) {
        withTarget++;
        const strategy = calculateDetailedTargetStrategy(s.grades, s.targetGrade);
        if (strategy.isQuarterAchieved) {
          achieved++;
        } else {
          pending++;
        }
      } else {
        noTarget++;
      }
    });

    return { withTarget, achieved, pending, noTarget, total: gradedSubjects.length };
  }, [gradedSubjects]);

  // Фильтрация предметов
  const filteredGraded = useMemo(() => {
    return gradedSubjects.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchTeacher = s.teacher?.toLowerCase().includes(q) || false;
        if (!matchName && !matchTeacher) return false;
      }

      const hasTarget = s.targetGrade && s.targetGrade > 0;
      const strategy = hasTarget
        ? calculateDetailedTargetStrategy(s.grades, s.targetGrade!)
        : null;

      if (filterMode === 'pending') {
        return hasTarget && strategy && !strategy.isQuarterAchieved;
      }
      if (filterMode === 'achieved') {
        return hasTarget && strategy && strategy.isQuarterAchieved;
      }
      if (filterMode === 'no_target') {
        return !hasTarget;
      }

      return true;
    });
  }, [gradedSubjects, searchQuery, filterMode]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSimulatedGrade = (subjId: string, gradeVal: number) => {
    setSimulatedGradesMap((prev) => ({
      ...prev,
      [subjId]: [...(prev[subjId] || []), gradeVal],
    }));
  };

  const handleResetSimulation = (subjId: string) => {
    setSimulatedGradesMap((prev) => {
      const copy = { ...prev };
      delete copy[subjId];
      return copy;
    });
  };

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Сводный аналитический блок: Текущий vs Предполагаемый балл по целям */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg bg-surface border border-surface-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Текущий средний
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {projectedStats.currentGpa.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Фактический балл
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-surface-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Target className="w-3 h-3 text-zinc-300" />
            <span>По целям</span>
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {projectedStats.projectedGpa.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono mt-0.5">
            {projectedStats.difference > 0 ? (
              <span className="text-zinc-200 font-semibold">+{projectedStats.difference.toFixed(2)} к итогу</span>
            ) : projectedStats.difference === 0 ? (
              <span className="text-zinc-500">равен текущему</span>
            ) : (
              <span className="text-zinc-400">{projectedStats.difference.toFixed(2)} к итогу</span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-surface-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-zinc-300" />
            <span>Достигнуто</span>
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {stats.achieved}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            из {stats.withTarget} заданных целей
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-surface-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zinc-300" />
            <span>Осталось</span>
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {stats.pending}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            предметов подтянуть
          </div>
        </div>
      </div>

      {/* Компактная плашка фильтров и поиска */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
              filterMode === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Все ({gradedSubjects.length})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
              filterMode === 'pending'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Подтянуть ({stats.pending})
          </button>
          <button
            onClick={() => setFilterMode('achieved')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
              filterMode === 'achieved'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200'
            }`}
          >
            В норме ({stats.achieved})
          </button>
          <button
            onClick={() => setFilterMode('no_target')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
              filterMode === 'no_target'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-surface-subtle text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Без цели ({stats.noTarget})
          </button>
        </div>

        <div className="relative sm:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск предмета..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-surface-subtle border border-surface-border rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
          />
        </div>
      </div>

      {/* Компактный список предметов */}
      <div className="space-y-2">
        {filteredGraded.length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-surface border border-surface-border text-zinc-500 text-xs font-mono">
            По выбранным фильтрам предметов не найдено
          </div>
        ) : (
          filteredGraded.map((subject) => {
            const currentGpa = subject.currentAverage;
            const targetGrade = subject.targetGrade;
            const hasTarget = !!targetGrade && targetGrade > 0;
            const isExpanded = expandedIds.has(subject.id);

            const strategy: DetailedTargetStrategy | null = hasTarget
              ? calculateDetailedTargetStrategy(subject.grades, targetGrade)
              : null;

            const hypothetical = simulatedGradesMap[subject.id] || [];
            const hasSim = hypothetical.length > 0;
            const simResult = hasSim
              ? simulateGrades(subject.grades, hypothetical)
              : null;

            const badgeClasses = getGradeBadgeClasses(Math.round(currentGpa));

            return (
              <div
                key={subject.id}
                className="rounded-lg bg-surface border border-surface-border hover:border-zinc-700 transition-colors overflow-hidden"
              >
                {/* Компактная основная строка (кликабельна для раскрытия деталей) */}
                <div
                  onClick={() => toggleExpand(subject.id)}
                  className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-subtle/50 transition-colors"
                >
                  {/* Левая часть: название и текущий балл */}
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="shrink-0">
                      {subject.grades.length > 0 ? (
                        <span
                          className={`w-9 h-7 rounded flex items-center justify-center font-mono font-bold text-xs border ${badgeClasses}`}
                        >
                          {currentGpa.toFixed(1)}
                        </span>
                      ) : (
                        <span className="w-9 h-7 rounded flex items-center justify-center font-mono text-[11px] bg-surface-subtle border border-surface-border text-zinc-500">
                          —
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {subject.name}
                        </span>
                        {subject.periodType === 'semester' && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono text-zinc-400 bg-surface-subtle border border-surface-border shrink-0">
                            1 ч/н
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                        {hasTarget && strategy ? (
                          strategy.isQuarterAchieved ? (
                            <span className="text-zinc-200 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span>{strategy.shortSummary}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-300 font-medium flex items-center gap-1">
                              <Target className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span>{strategy.shortSummary}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-500">Нажмите, чтобы задать цель</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Правая часть: цель и стрелка */}
                  <div className="shrink-0 flex items-center gap-2">
                    {hasTarget ? (
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-surface-subtle border border-surface-border text-zinc-200">
                        Цель: {targetGrade}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTargetModal(subject);
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-500"
                      >
                        + Цель
                      </button>
                    )}

                    <div className="text-zinc-500">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Раскрывающийся блок подробностей и симулятора */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-surface-subtle/40 border-t border-surface-border/60 space-y-3 animate-in fade-in duration-150">
                    {/* Все варианты отметок для достижения цели */}
                    {hasTarget && strategy && (
                      <div className="space-y-2">
                        {strategy.isQuarterAchieved ? (
                          <div className="p-2.5 rounded bg-surface border border-surface-border text-xs text-zinc-200 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-zinc-300 mt-0.5" />
                            <div className="leading-snug">
                              {strategy.quarterExplanation}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="text-[11px] text-zinc-400 font-mono">
                              Варианты для четвертной отметки <strong>{targetGrade}</strong> (балл от {strategy.quarterThreshold}):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {strategy.options.map((opt) => (
                                <div
                                  key={opt.gradeValue}
                                  className="p-2 rounded bg-surface border border-surface-border flex items-center justify-between text-xs font-mono"
                                >
                                  <span className="text-zinc-300">
                                    {opt.isMinimal ? 'Минимально: ' : opt.isFastest ? 'Быстро: ' : 'Вариант: '}
                                    оценки «{opt.gradeValue}»
                                  </span>
                                  <span className="font-bold text-zinc-100">
                                    +{opt.neededCount} шт.
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Компактный симулятор */}
                    <div className="p-2.5 rounded bg-surface border border-surface-border space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                        <span>Примерить оценку:</span>
                        {hasSim && (
                          <button
                            onClick={() => handleResetSimulation(subject.id)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Сброс</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[10, 9, 8, 7, 6, 5].map((g) => (
                          <button
                            key={g}
                            onClick={() => handleAddSimulatedGrade(subject.id, g)}
                            className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-surface-subtle hover:bg-surface-muted border border-surface-border text-zinc-200"
                          >
                            +{g}
                          </button>
                        ))}
                      </div>

                      {hasSim && simResult && (
                        <div className="pt-1.5 border-t border-surface-border/60 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">
                            Проба: [{hypothetical.join(', ')}]
                          </span>
                          <div>
                            <span className="text-zinc-400">Балл станет: </span>
                            <span className="font-bold text-zinc-100">
                              {simResult.simulatedGpa.toFixed(2)}
                            </span>
                            <span className="ml-1 text-[11px] text-zinc-400">
                              ({simResult.delta >= 0 ? `+${simResult.delta}` : simResult.delta})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Быстрое изменение цели */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-zinc-500 font-mono mr-1">Цель:</span>
                        {[6, 7, 8, 9, 10].map((v) => (
                          <button
                            key={v}
                            onClick={() => onSaveTarget(subject.id, v)}
                            className={`px-2 py-0.5 rounded text-xs font-mono transition-colors border ${
                              targetGrade === v
                                ? 'bg-zinc-100 text-zinc-950 font-bold border-zinc-100'
                                : 'bg-surface text-zinc-400 hover:text-zinc-200 border-surface-border'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                        <button
                          onClick={() => onOpenTargetModal(subject)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-surface-border"
                        >
                          Своя...
                        </button>
                      </div>

                      {hasTarget && (
                        <button
                          onClick={() => onClearTarget(subject.id)}
                          className="text-[11px] font-mono text-zinc-500 hover:text-zinc-200"
                        >
                          Сбросить цель
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Компактный скрывающийся блок по предметам без числовых отметок (Accordion) */}
      {nonGradedSubjects.length > 0 && (
        <details className="group rounded-lg bg-surface border border-surface-border overflow-hidden">
          <summary className="p-3 text-xs text-zinc-400 cursor-pointer select-none flex items-center justify-between hover:text-zinc-200 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Предметы без балльных оценок ({nonGradedSubjects.length})</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="p-3 pt-0 space-y-2 border-t border-surface-border/40 text-xs">
            {nonGradedSubjects.map((s) => {
              const lower = s.name.toLowerCase();
              const isPassFail = s.gradingType === 'pass_fail' || lower.includes('искусство');

              return (
                <div
                  key={s.id}
                  className="p-2 rounded bg-surface-subtle flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-zinc-300">{s.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {isPassFail ? 'Зачетная система (Зачет/Незачет)' : 'Без аттестации (Классный час)'}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
};
