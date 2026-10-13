'use client';

import React, { useState, useEffect } from 'react';
import { Target, X, Calculator, Check, Trash2, Sparkles, TrendingUp } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { calculateDetailedTargetStrategy } from '@/lib/eschools/calculator';
import { getGradeBadgeClasses } from '@/lib/utils';

interface TargetModalProps {
  subject: SubjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTarget: (subjectId: string, target: number) => void;
  onClearTarget: (subjectId: string) => void;
}

export const TargetModal: React.FC<TargetModalProps> = ({
  subject,
  isOpen,
  onClose,
  onSaveTarget,
  onClearTarget,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<number>(8);
  const [customInput, setCustomInput] = useState<string>('8.0');

  useEffect(() => {
    if (subject) {
      const initial = subject.targetGrade || Math.min(10, Math.ceil(subject.currentAverage || 7));
      setSelectedTarget(initial);
      setCustomInput(initial.toString());
    }
  }, [subject]);

  if (!isOpen || !subject) return null;

  const currentGpa = subject.currentAverage || 0;
  const strategy = calculateDetailedTargetStrategy(subject.grades || [], selectedTarget);

  const handleSelectQuick = (val: number) => {
    setSelectedTarget(val);
    setCustomInput(val.toString());
  };

  const handleCustomChange = (valStr: string) => {
    setCustomInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
      setSelectedTarget(Number(parsed.toFixed(1)));
    }
  };

  const handleSave = () => {
    onSaveTarget(subject.id, selectedTarget);
    onClose();
  };

  const handleClear = () => {
    onClearTarget(subject.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-surface-border shadow-2xl overflow-hidden flex flex-col">
        {/* Шапка модалки */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100">
              <Target className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Целевой балл
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                {subject.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Тело модалки */}
        <div className="p-5 space-y-4">
          {/* Текущий балл предмета */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-surface-border">
            <span className="text-xs text-zinc-400">Текущий средний балл:</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getGradeBadgeClasses(Math.round(currentGpa))}`}>
                {currentGpa > 0 ? currentGpa.toFixed(2) : 'Нет отметок'}
              </span>
            </div>
          </div>

          {/* Быстрый выбор цели */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
              Выберите желаемый балл:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 8, 9, 10].map((num) => {
                const isSelected = selectedTarget === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectQuick(num)}
                    className={`py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-900 border-white shadow-md'
                        : 'bg-surface-subtle text-zinc-300 border-surface-border hover:border-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Точный ввод цели */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-zinc-400">
                Или введите точное значение (от 1.0 до 10.0):
              </label>
              <span className="text-xs font-mono font-bold text-zinc-200">
                {selectedTarget}
              </span>
            </div>
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={customInput}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-subtle border border-surface-border text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Расчет стратегии достижения цели */}
          <div className="p-3.5 rounded-lg bg-surface-subtle/80 border border-surface-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
              <span>Расчет стратегии для балла {selectedTarget}:</span>
            </div>

            {strategy.isQuarterAchieved ? (
              <div className="text-[11px] text-zinc-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>{strategy.quarterExplanation}</span>
              </div>
            ) : strategy.options.length === 0 ? (
              <div className="text-[11px] text-zinc-400">
                Достичь этого балла текущими отметками трудно.
              </div>
            ) : (
              <div className="text-[11px] text-zinc-300 space-y-1.5">
                <div>
                  Для четвертной отметки <strong className="text-zinc-100">{selectedTarget}</strong> (балл от {strategy.quarterThreshold}):
                </div>
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] pt-0.5">
                  {strategy.options.map((opt) => (
                    <span
                      key={opt.gradeValue}
                      className="px-2 py-0.5 rounded bg-surface border border-surface-border text-zinc-200"
                    >
                      {opt.isMinimal ? 'Мин: ' : ''}«{opt.gradeValue}»: <strong>+{opt.neededCount} шт</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Подвал с кнопками */}
        <div className="p-4 border-t border-surface-border bg-surface-subtle/40 flex items-center justify-between gap-2">
          {subject.targetGrade ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-surface-subtle transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Сбросить цель</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Выставить цель</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
