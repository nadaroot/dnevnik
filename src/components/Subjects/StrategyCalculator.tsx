'use client';

import React, { useState } from 'react';
import { Target, Calculator, Check, AlertTriangle, Plus, RotateCcw } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { calculateStrategy, simulateGrades } from '@/lib/eschools/calculator';

interface StrategyCalculatorProps {
  subject: SubjectItem;
  onUpdateTarget?: (target: number) => void;
}

export const StrategyCalculator: React.FC<StrategyCalculatorProps> = ({
  subject,
  onUpdateTarget,
}) => {
  const [targetInput, setTargetInput] = useState<string>(
    subject.targetGrade ? subject.targetGrade.toString() : '8.0'
  );
  const [simulatedGradesList, setSimulatedGradesList] = useState<number[]>([]);

  const targetNum = parseFloat(targetInput) || 8.0;
  const strategy = calculateStrategy(subject.grades, targetNum);

  const { simulatedGpa, delta } = simulateGrades(
    subject.grades,
    simulatedGradesList
  );

  const handleTargetChange = (val: string) => {
    setTargetInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && onUpdateTarget) {
      onUpdateTarget(parsed);
    }
  };

  const addHypotheticalGrade = (val: number) => {
    setSimulatedGradesList((prev) => [...prev, val]);
  };

  const resetSimulation = () => {
    setSimulatedGradesList([]);
  };

  return (
    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border space-y-4">
      {/* Заголовок и ввод цели */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-zinc-300" />
          <span className="text-xs uppercase tracking-wider text-zinc-200 font-medium">
            Калькулятор стратегии
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-mono">Цель:</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="10"
            value={targetInput}
            onChange={(e) => handleTargetChange(e.target.value)}
            className="w-16 px-2 py-1 text-xs font-mono font-bold bg-surface-muted border border-surface-border rounded text-zinc-100 text-center focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Результат расчета стратегии */}
      <div className="p-3 rounded bg-surface border border-surface-border space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">Текущий балл:</span>
          <span className="font-bold text-zinc-100">{subject.currentAverage.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">Требуемый балл:</span>
          <span className="font-bold text-zinc-100">{targetNum.toFixed(1)}</span>
        </div>

        {strategy.isAchieved ? (
          <div className="mt-2 p-2 rounded bg-surface border border-surface-border flex items-center gap-2 text-xs text-zinc-300 font-mono">
            <Check className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>Цель достигнута. Текущий балл выше целевого.</span>
          </div>
        ) : strategy.isImpossible ? (
          <div className="mt-2 p-2 rounded bg-surface border border-surface-border flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-500" />
            <span>Недостижимо (цель превышает 10.0).</span>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-surface-border text-xs space-y-1.5 font-mono">
            <div className="text-zinc-300 font-medium">Для достижения цели необходимо получить:</div>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <div className="p-2 rounded bg-surface-muted border border-surface-border">
                <div className="text-[11px] text-zinc-400">Десяток (10)</div>
                <div className="text-base font-bold text-zinc-100 mt-0.5">
                  {strategy.neededTens} шт.
                </div>
              </div>

              {strategy.neededNines > 0 && (
                <div className="p-2 rounded bg-surface-muted border border-surface-border">
                  <div className="text-[11px] text-zinc-400">Девятки (9)</div>
                  <div className="text-base font-bold text-zinc-200 mt-0.5">
                    {strategy.neededNines} шт.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Интерактивный симулятор отметок */}
      <div className="pt-2 border-t border-surface-border/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Симулятор оценок («Что если»)
          </span>
          {simulatedGradesList.length > 0 && (
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[10, 9, 8, 7, 6, 5].map((val) => (
            <button
              key={val}
              onClick={() => addHypotheticalGrade(val)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded bg-surface-muted border border-surface-border hover:border-zinc-500 text-zinc-200 transition-colors"
            >
              <Plus className="w-3 h-3 text-zinc-400" />
              <span>{val}</span>
            </button>
          ))}
        </div>

        {simulatedGradesList.length > 0 && (
          <div className="mt-3 p-2.5 rounded bg-surface border border-surface-border text-xs font-mono space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Добавлено оценок:</span>
              <span className="text-zinc-200">{simulatedGradesList.join(', ')}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-surface-border">
              <span className="text-zinc-300">Прогнозируемый балл:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-zinc-100">{simulatedGpa.toFixed(2)}</span>
                <span className="text-[11px] text-zinc-400">
                  ({delta > 0 ? `+${delta}` : delta})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
