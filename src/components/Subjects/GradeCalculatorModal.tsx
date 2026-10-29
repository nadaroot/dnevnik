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
import { calculateDetailedTargetStrategy, calculateAverage } from '@/lib/eschools/calculator';
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
  const trackRef = useRef<HTMLDivElement>(null);
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
  // Индексы временно отключенных реальных оценок (чтобы проверить "что если без этой оценки")
  const [excludedIndices, setExcludedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialSubject && gradedSubjects.some((s) => s.id === initialSubject.id)) {
      setSelectedSubjectId(initialSubject.id);
      const initTarget =
        initialSubject.targetGrade ||
        Math.min(10, Math.max(6, Math.ceil(initialSubject.currentAverage || 7)));
      setTargetInput(initTarget);
    } else if (gradedSubjects.length > 0) {
      const existing = gradedSubjects.find((s) => s.id === selectedSubjectId) || gradedSubjects[0];
      setSelectedSubjectId(existing.id);
      const initTarget =
        existing.targetGrade ||
        Math.min(10, Math.max(6, Math.ceil(existing.currentAverage || 7)));
      setTargetInput(initTarget);
    }
    setSimulatedGrades([]);
    setExcludedIndices([]);
  }, [initialSubject, isOpen, gradedSubjects]);

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

  const updateScrollIndicator = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 10) {
      setCanScroll(true);
      const visibleRatio = clientHeight / scrollHeight;
      const computedHeight = Math.max(22, Math.min(55, Math.round(visibleRatio * 100)));
      setThumbHeight(computedHeight);
      const progress = (scrollTop / maxScroll) * (100 - computedHeight);
      setScrollProgress(Math.max(0, Math.min(100 - computedHeight, progress)));
    } else {
      setCanScroll(false);
    }
  };

  useEffect(() => {
    updateScrollIndicator();
    const timer = setTimeout(updateScrollIndicator, 120);
    return () => clearTimeout(timer);
  }, [selectedSubjectId, simulatedGrades, excludedIndices, targetInput, isOpen]);

  // Позволяет перетаскивать или нажимать на боковую полосу прокрутки пальцем
  const scrollToTrackPosition = (clientY: number) => {
    const track = trackRef.current;
    const el = scrollRef.current;
    if (!track || !el) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * maxScroll;
  };

  if (!isOpen) return null;

  const currentSubject =
    gradedSubjects.find((s) => s.id === selectedSubjectId) || gradedSubjects[0];

  if (!currentSubject) return null;

  const currentGpa = currentSubject.currentAverage || 0;
  const grades = currentSubject.grades || [];

  // Активные оценки с учетом временно выключенных и добавленных виртуальных
  const activeRealGrades = grades.filter((_, idx) => !excludedIndices.includes(idx));
  const combinedValues = [
    ...activeRealGrades.map((g) => g.value),
    ...simulatedGrades,
  ];
  const simulatedGpa = combinedValues.length > 0 ? calculateAverage(combinedValues) : 0;
  const delta = Number((simulatedGpa - currentGpa).toFixed(2));
  const simRounded = simulatedGpa > 0 ? Math.round(simulatedGpa) : 0;
  const isGoalReachedWithSim =
    combinedValues.length > 0 &&
    simulatedGpa >= (targetInput <= 1 ? 1 : targetInput - 0.5);

  const hasChanges = simulatedGrades.length > 0 || excludedIndices.length > 0;

  // Расчет стратегии для выбранной цели
  const strategy = calculateDetailedTargetStrategy(activeRealGrades, targetInput);

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    const subj = gradedSubjects.find((s) => s.id === id);
    if (subj) {
      const defTarget =
        subj.targetGrade || Math.min(10, Math.max(6, Math.ceil(subj.currentAverage || 7)));
      setTargetInput(defTarget);
    }
    setSimulatedGrades([]);
    setExcludedIndices([]);
  };

  const handleAddGrade = (val: number) => {
    setSimulatedGrades((prev) => [...prev, val]);
  };

  const handleRemoveSimulatedAt = (indexToRemove: number) => {
    setSimulatedGrades((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleToggleRealGrade = (idx: number) => {
    setExcludedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleResetSimulation = () => {
    setSimulatedGrades([]);
    setExcludedIndices([]);
  };

  const handleSaveAsTarget = () => {
    if (onSaveTarget && currentSubject) {
      onSaveTarget(currentSubject.id, targetInput);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg h-[88vh] sm:h-[680px] max-h-[90vh] rounded-t-2xl sm:rounded-xl bg-zinc-950 border border-surface-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Шапка калькулятора (закреплена сверху) */}
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100 shrink-0">
              <Calculator className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-100 truncate">
                Калькулятор отметок
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono truncate">
                {currentSubject.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasChanges && (
              <button
                type="button"
                onClick={handleResetSimulation}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-subtle border border-surface-border text-[11px] font-mono text-zinc-300 hover:text-white active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. ЗАКРЕПЛЕННОЕ ТАБЛО РЕЗУЛЬТАТА (Всегда на виду, не нужно листать вниз!) */}
        <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-surface-border shrink-0">
          <div className="grid grid-cols-3 gap-2 items-center">
            <div className="p-2 rounded-lg bg-surface border border-surface-border">
              <div className="text-[9px] text-zinc-400 font-mono uppercase">
                Сейчас ({grades.length} отм.)
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-zinc-200 mt-0.5">
                {currentGpa > 0 ? currentGpa.toFixed(2) : '—'}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-zinc-700">
              <div className="text-[9px] text-zinc-300 font-mono uppercase">
                Новый балл
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-bold font-mono text-white">
                  {simulatedGpa > 0 ? simulatedGpa.toFixed(2) : '—'}
                </span>
                {hasChanges && (
                  <span
                    className={`text-[10px] font-mono font-bold ${
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
              </div>
            </div>

            <div className="p-2 rounded-lg bg-surface border border-surface-border flex items-center justify-between">
              <div>
                <div className="text-[9px] text-zinc-400 font-mono uppercase">
                  Выйдет
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  в четв.
                </div>
              </div>
              {simRounded > 0 ? (
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono font-bold border shadow-sm ${getGradeBadgeClasses(
                    simRounded
                  )}`}
                >
                  {simRounded}
                </span>
              ) : (
                <span className="text-sm font-mono text-zinc-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Прокручиваемая рабочая область + интерактивная боковая крутилка */}
        <div className="relative flex-1 min-h-0 flex overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={updateScrollIndicator}
            className="modal-scroll flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 pb-12 space-y-3.5"
          >
            {/* Выбор предмета: выпадающий список + быстрые чипы */}
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSelectSubject(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-zinc-100 font-medium focus:outline-none focus:border-zinc-500 pr-8 cursor-pointer"
                >
                  {gradedSubjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                      {s.name} ({s.currentAverage > 0 ? s.currentAverage.toFixed(2) : 'нет оценок'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Быстрое переключение предметов в 1 касание */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {gradedSubjects.map((s) => {
                  const isSel = s.id === currentSubject.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSubject(s.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 ${
                        isSel
                          ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                          : 'bg-surface text-zinc-400 border-surface-border hover:text-zinc-200'
                      }`}
                    >
                      {s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name}{' '}
                      <span className={isSel ? 'text-zinc-700' : 'text-zinc-500'}>
                        {s.currentAverage > 0 ? s.currentAverage.toFixed(1) : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Кнопки быстрого добавления оценок (от 10 до 1) */}
            <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  Добавить оценку («Что если»):
                </span>
                {simulatedGrades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSimulatedGrades((prev) => prev.slice(0, -1))}
                    className="text-[11px] font-mono text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700"
                  >
                    ⌫ Убрать посл.
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAddGrade(val)}
                    className="py-2 rounded-lg bg-surface-subtle border border-surface-border hover:border-zinc-500 active:scale-95 text-xs font-mono font-bold text-zinc-100 transition-all flex items-center justify-center gap-0.5 shadow-sm"
                  >
                    <span className="text-zinc-400">+</span>
                    <span>{val}</span>
                  </button>
                ))}
              </div>

              {/* Список добавленных виртуальных оценок (нажми на любую чтобы удалить) */}
              {simulatedGrades.length > 0 && (
                <div className="pt-2 border-t border-surface-border/60 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>Добавленные виртуальные оценки (нажмите, чтобы убрать):</span>
                    <span className="text-zinc-300 font-bold">{simulatedGrades.length} шт.</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {simulatedGrades.map((val, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRemoveSimulatedAt(idx)}
                        title="Нажмите, чтобы удалить эту оценку"
                        className={`px-2 py-1 rounded-md flex items-center gap-1 text-xs font-mono font-bold border active:scale-90 transition-transform ${getGradeBadgeClasses(
                          val
                        )}`}
                      >
                        <span>+{val}</span>
                        <X className="w-2.5 h-2.5 opacity-70" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isGoalReachedWithSim && (
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Четвертная «{targetInput}» выходит при этих оценках!</span>
                </div>
              )}
            </div>

            {/* Имеющиеся оценки в журнале (можно нажать, чтобы временно исключить из расчета) */}
            <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Оценки в журнале ({grades.length} шт.):
                </span>
                {excludedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcludedIndices([])}
                    className="text-[10px] font-mono text-zinc-300 underline"
                  >
                    Вернуть все ({excludedIndices.length} скр.)
                  </button>
                )}
              </div>

              {grades.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {grades.map((g, idx) => {
                      const isExcluded = excludedIndices.includes(idx);
                      return (
                        <button
                          key={g.id || idx}
                          type="button"
                          onClick={() => handleToggleRealGrade(idx)}
                          title={`${g.value} (${g.date}) — нажмите, чтобы временно исключить/вернуть`}
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold border transition-all ${
                            isExcluded
                              ? 'bg-zinc-900 text-zinc-600 border-zinc-800 line-through opacity-50'
                              : getGradeBadgeClasses(g.value)
                          }`}
                        >
                          {g.value}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Нажмите на любую оценку из журнала, чтобы проверить балл без неё
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500 font-mono py-1">
                  По этому предмету пока нет оценок за четверть.
                </div>
              )}
            </div>

            {/* Желаемая цель и сколько оценок нужно */}
            <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                  Сколько нужно до четвертной:
                </span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  Цель: {targetInput} (от {strategy.quarterThreshold})
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
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-950 font-bold border-white shadow-sm'
                          : 'bg-surface-subtle text-zinc-300 border-surface-border hover:border-zinc-600'
                      }`}
                    >
                      Цель {num}
                    </button>
                  );
                })}
              </div>

              {strategy.isQuarterAchieved ? (
                <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border text-xs text-zinc-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{strategy.quarterExplanation}</span>
                </div>
              ) : strategy.options.length === 0 ? (
                <div className="text-xs text-zinc-400 font-mono">
                  Для достижения четвертной {targetInput} необходимо получать десятки.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {strategy.options.map((opt) => (
                    <button
                      key={opt.gradeValue}
                      type="button"
                      onClick={() => {
                        const arr = Array(opt.neededCount).fill(opt.gradeValue);
                        setSimulatedGrades(arr);
                      }}
                      title="Нажмите, чтобы сразу подставить эти оценки в симулятор"
                      className="p-2 rounded-lg bg-surface-subtle border border-surface-border hover:border-zinc-500 active:scale-95 transition-all text-center"
                    >
                      <div className="text-[10px] text-zinc-400 font-mono">
                        Оценки «{opt.gradeValue}»
                      </div>
                      <div className="text-sm font-bold text-zinc-100 font-mono mt-0.5">
                        +{opt.neededCount} шт.
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ИНТЕРАКТИВНАЯ БОКОВАЯ КРУТИЛКА / ПОЛЗУНОК СКРОЛЛА (можно тянуть пальцем) */}
          {canScroll && (
            <div
              ref={trackRef}
              onClick={(e) => scrollToTrackPosition(e.clientY)}
              onTouchMove={(e) => {
                if (e.touches[0]) {
                  scrollToTrackPosition(e.touches[0].clientY);
                }
              }}
              className="w-3 my-3 mr-1 bg-zinc-900/90 rounded-full shrink-0 relative overflow-hidden cursor-pointer touch-none border border-zinc-800"
            >
              <div
                className="w-full bg-zinc-400 hover:bg-zinc-200 rounded-full transition-all duration-75 shadow-sm"
                style={{
                  height: `${thumbHeight}%`,
                  top: `${scrollProgress}%`,
                  position: 'absolute',
                }}
              />
            </div>
          )}
        </div>

        {/* 4. Подвал модалки */}
        <div className="px-4 py-3 pb-safe sm:pb-3 border-t border-surface-border bg-surface flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-surface-subtle border border-surface-border transition-colors"
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
            <span>Сохранить цель «{targetInput}»</span>
          </button>
        </div>
      </div>
    </div>
  );
};
