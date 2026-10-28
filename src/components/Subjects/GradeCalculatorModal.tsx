'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  X,
  Target,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { calculateDetailedTargetStrategy, simulateGrades } from '@/lib/eschools/calculator';
import { getGradeBadgeClasses } from '@/lib/utils';

interface GradeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  initialSubject?: SubjectItem | null;
  onSaveTarget?: (subjectId: string, targetVal: number) => void;
}

export const GradeCalculatorModal: React.FC<GradeCalculatorModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubject,
  onSaveTarget,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [thumbHeight, setThumbHeight] = useState<number>(30);
  const [canScroll, setCanScroll] = useState<boolean>(false);

  // Фильтруем только оцениваемые предметы
  const gradedSubjects = useMemo(() => {
    return subjects.filter(
      (s) =>
        s.isGraded !== false &&
        s.gradingType !== 'pass_fail' &&
        s.gradingType !== 'none' &&
        s.periodType !== 'none'
    );
  }, [subjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [targetInput, setTargetInput] = useState<number>(8);
  const [simulatedGrades, setSimulatedGrades] = useState<number[]>([]);

  useEffect(() => {
    if (initialSubject && gradedSubjects.some((s) => s.id === initialSubject.id)) {
      setSelectedSubjectId(initialSubject.id);
      const initTarget =
        initialSubject.targetGrade ||
        Math.min(10, Math.ceil(initialSubject.currentAverage || 7));
      setTargetInput(initTarget);
    } else if (gradedSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(gradedSubjects[0].id);
      const initTarget =
        gradedSubjects[0].targetGrade ||
        Math.min(10, Math.ceil(gradedSubjects[0].currentAverage || 7));
      setTargetInput(initTarget);
    }
    setSimulatedGrades([]);
  }, [initialSubject, isOpen, gradedSubjects]);

  // Управление скроллом body — без position:fixed, чтобы не отбрасывало назад на мобильных
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Обновление позиции нашей кастомной «боковой крутилки / ползунка»
  const updateScrollIndicator = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 15) {
      setCanScroll(true);
      const visibleRatio = clientHeight / scrollHeight;
      const computedHeight = Math.max(20, Math.min(50, Math.round(visibleRatio * 100)));
      setThumbHeight(computedHeight);
      const progress = (scrollTop / maxScroll) * (100 - computedHeight);
      setScrollProgress(Math.max(0, Math.min(100 - computedHeight, progress)));
    } else {
      setCanScroll(false);
    }
  };

  useEffect(() => {
    updateScrollIndicator();
    const timer = setTimeout(updateScrollIndicator, 100);
    return () => clearTimeout(timer);
  }, [selectedSubjectId, simulatedGrades, targetInput, isOpen]);

  if (!isOpen) return null;

  const currentSubject =
    gradedSubjects.find((s) => s.id === selectedSubjectId) || gradedSubjects[0];

  if (!currentSubject) return null;

  const currentGpa = currentSubject.currentAverage || 0;
  const grades = currentSubject.grades || [];

  // Расчет стратегии для выбранной цели
  const strategy = calculateDetailedTargetStrategy(grades, targetInput);

  // Симуляция добавления отметок
  const { simulatedGpa, delta } = simulateGrades(grades, simulatedGrades);
  const simRounded = Math.round(simulatedGpa);
  const isGoalReachedWithSim = simulatedGpa >= (targetInput <= 1 ? 1 : targetInput - 0.5);

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    const subj = gradedSubjects.find((s) => s.id === id);
    if (subj) {
      const defTarget =
        subj.targetGrade || Math.min(10, Math.ceil(subj.currentAverage || 7));
      setTargetInput(defTarget);
    }
    setSimulatedGrades([]);
  };

  const handleAddGrade = (val: number) => {
    setSimulatedGrades((prev) => [...prev, val]);
  };

  const handleRemoveLastGrade = () => {
    setSimulatedGrades((prev) => prev.slice(0, -1));
  };

  const handleResetSimulation = () => {
    setSimulatedGrades([]);
  };

  const handleSaveAsTarget = () => {
    if (onSaveTarget && currentSubject) {
      onSaveTarget(currentSubject.id, targetInput);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg h-[82vh] sm:h-[650px] max-h-[85vh] rounded-t-2xl sm:rounded-xl bg-zinc-950 border border-surface-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка калькулятора */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100">
              <Calculator className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                Калькулятор отметок
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Симулятор среднего балла («Что если»)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Область скролла с нашей фирменной боковой крутилкой (Custom Scrollbar) */}
        <div className="relative flex-1 min-h-0 flex overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={updateScrollIndicator}
            className="modal-scroll flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 pb-16 space-y-4"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Выбор предмета */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Предмет для расчета:
              </label>
              <div className="relative">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSelectSubject(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-surface-border text-xs text-zinc-100 font-medium focus:outline-none focus:border-zinc-500 pr-9 cursor-pointer"
                >
                  {gradedSubjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                      {s.name} (балл: {s.currentAverage > 0 ? s.currentAverage.toFixed(2) : '—'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* ГЛАВНЫЙ БЛОК: СИМУЛЯТОР («ЧТО ЕСЛИ») С МГНОВЕННЫМ РЕЗУЛЬТАТОМ ПРЯМО НА ГЛАЗАХ */}
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  Симулятор отметок
                </span>
                {simulatedGrades.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сбросить ({simulatedGrades.length})</span>
                  </button>
                )}
              </div>

              {/* Текущий и прогнозируемый балл — рядом, видно сразу */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-subtle border border-surface-border/70">
                <div>
                  <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                    Текущий балл
                  </div>
                  <div className="text-base font-bold font-mono text-zinc-200 mt-0.5">
                    {currentGpa > 0 ? currentGpa.toFixed(2) : '—'}
                    <span className="text-[11px] text-zinc-500 font-normal ml-1">
                      ({grades.length} шт.)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                    Прогноз с новыми
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-bold font-mono text-zinc-100">
                      {simulatedGpa.toFixed(2)}
                    </span>
                    {simulatedGrades.length > 0 && (
                      <span
                        className={`text-[11px] font-mono font-bold px-1 py-0.2 rounded ${
                          delta > 0
                            ? 'text-emerald-400'
                            : delta < 0
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ml-auto ${getGradeBadgeClasses(
                        simRounded
                      )}`}
                    >
                      ≈ {simRounded}
                    </span>
                  </div>
                </div>
              </div>

              {/* Добавленные виртуальные оценки */}
              {simulatedGrades.length > 0 && (
                <div className="p-2 rounded bg-zinc-900/90 border border-zinc-700/80 flex items-center justify-between text-xs font-mono animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                    <span className="text-[11px] text-zinc-400">Добавлено:</span>
                    <div className="flex flex-wrap gap-1">
                      {simulatedGrades.map((val, idx) => (
                        <span
                          key={idx}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${getGradeBadgeClasses(
                            val
                          )}`}
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLastGrade}
                    title="Удалить последнюю"
                    className="text-[11px] text-zinc-400 hover:text-zinc-100 px-1.5 py-0.5 rounded bg-zinc-800 shrink-0"
                  >
                    ✕ шаг
                  </button>
                </div>
              )}

              {/* Быстрые кнопки добавления оценок (крупные, с удобным тапом) */}
              <div>
                <div className="text-[10px] text-zinc-400 font-mono mb-1.5">
                  Нажимайте, чтобы добавить отметку в симуляцию:
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {[10, 9, 8, 7, 6, 5, 4].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAddGrade(val)}
                      className="py-2.5 sm:py-2 flex items-center justify-center rounded-lg bg-surface-subtle border border-surface-border hover:border-zinc-500 active:scale-95 text-xs font-mono font-bold text-zinc-100 transition-all shadow-sm"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {isGoalReachedWithSim && (
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Цель «{targetInput}» достигается при этом наборе оценок!</span>
                </div>
              )}
            </div>

            {/* Карточка: Имеющиеся оценки предмета */}
            <div className="p-3.5 rounded-lg bg-surface border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Имеющиеся оценки в журнале ({grades.length} шт.):
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getGradeBadgeClasses(
                    Math.round(currentGpa)
                  )}`}
                >
                  {currentGpa > 0 ? currentGpa.toFixed(2) : 'Нет оценок'}
                </span>
              </div>

              {grades.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {grades.map((g, idx) => (
                    <span
                      key={g.id || idx}
                      title={`${g.value} (${g.date})${g.topic ? ` - ${g.topic}` : ''}`}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold border shrink-0 ${getGradeBadgeClasses(
                        g.value
                      )}`}
                    >
                      {g.value}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 font-mono py-1">
                  По этому предмету еще нет оценок за текущий период.
                </div>
              )}
            </div>

            {/* Желаемая четвертная отметка */}
            <div className="p-3.5 rounded-lg bg-surface border border-surface-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Желаемая четвертная отметка:
                </label>
                <span className="text-xs font-mono font-bold text-zinc-200">
                  Цель: {targetInput}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[6, 7, 8, 9, 10].map((num) => {
                  const isSelected = targetInput === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetInput(num)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-950 font-bold border-white shadow-md scale-102'
                          : 'bg-surface-subtle text-zinc-300 border-surface-border hover:border-zinc-600'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Расчет стратегии: сколько нужно получить */}
            <div className="p-3.5 rounded-lg bg-surface border border-surface-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                <span>Расчет для четвертной «{targetInput}»:</span>
              </div>

              {strategy.isQuarterAchieved ? (
                <div className="p-2.5 rounded bg-surface-subtle border border-surface-border text-xs text-zinc-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{strategy.quarterExplanation}</span>
                </div>
              ) : strategy.options.length === 0 ? (
                <div className="text-xs text-zinc-400 font-mono">
                  Для достижения четвертной {targetInput} необходимо улучшать текущие отметки.
                </div>
              ) : (
                <div className="text-xs text-zinc-300 space-y-2">
                  <div className="text-[11px] text-zinc-400">
                    Порог отметки: <strong>{strategy.quarterThreshold}</strong>. Чтобы достичь, нужно получить на выбор:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {strategy.options.map((opt) => (
                      <div
                        key={opt.gradeValue}
                        className="p-2 rounded bg-surface-subtle border border-surface-border text-center"
                      >
                        <div className="text-[11px] text-zinc-400 font-mono">
                          Отметка «{opt.gradeValue}»
                        </div>
                        <div className="text-sm font-bold text-zinc-100 font-mono mt-0.5">
                          +{opt.neededCount} шт.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* НАША ФИРМЕННАЯ БОКОВАЯ КРУТИЛКА / ПОЛЗУНОК СКРОЛЛА */}
          {canScroll && (
            <div className="w-1.5 my-3 mr-1.5 bg-zinc-800/80 rounded-full shrink-0 relative overflow-hidden pointer-events-none">
              <div
                className="w-full bg-zinc-400 rounded-full transition-all duration-75 shadow-sm"
                style={{
                  height: `${thumbHeight}%`,
                  top: `${scrollProgress}%`,
                  position: 'absolute',
                }}
              />
            </div>
          )}
        </div>

        {/* Подвал модалки с безопасной зоной pb-safe для iPhone Home indicator */}
        <div className="p-4 pb-safe sm:pb-4 border-t border-surface-border bg-surface flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
          >
            Закрыть
          </button>

          <button
            type="button"
            onClick={() => {
              handleSaveAsTarget();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95 transition-all shadow-md"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Сохранить цель {targetInput}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
