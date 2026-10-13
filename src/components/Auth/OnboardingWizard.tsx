'use client';

import React, { useState } from 'react';
import { Sparkles, Target, Palette, Check, ArrowRight, X } from 'lucide-react';
import { SubjectItem, ThemeId } from '@/lib/eschools/types';
import { THEMES_LIST } from '@/lib/eschools/themes';

interface OnboardingWizardProps {
  studentName: string;
  subjects: SubjectItem[];
  isOpen: boolean;
  onFinish: (targets: Record<string, number>, theme: ThemeId) => void;
  onClose: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  studentName,
  subjects,
  isOpen,
  onFinish,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('space');

  if (!isOpen) return null;

  const handleSetTarget = (subjId: string, val: number) => {
    setTargets((prev) => ({
      ...prev,
      [subjId]: prev[subjId] === val ? 0 : val,
    }));
  };

  const handleNextOrFinish = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onFinish(targets, selectedTheme);
    }
  };

  const gradedSubjects = subjects.filter((s) => s.isGraded !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Шапка визарда */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
              {step === 1 ? (
                <Target className="w-5 h-5 text-zinc-300" />
              ) : (
                <Palette className="w-5 h-5 text-zinc-300" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {step === 1 ? 'Шаг 1: Цели на четверть' : 'Шаг 2: Цветовая тема'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {step === 1
                  ? `Привет, ${studentName}! Отметь желаемый балл по предметам:`
                  : 'Выберите атмосферный фон или строгий черный OLED:'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Шаг 1: Выбор целей по предметам */}
        {step === 1 && (
          <div className="p-5 overflow-y-auto space-y-3 flex-1 max-h-[60vh]">
            <div className="text-xs text-zinc-400 mb-2">
              Нажмите на нужную отметку, чтобы зафиксировать цель (или пропустите предмет):
            </div>

            <div className="space-y-2">
              {gradedSubjects.slice(0, 10).map((s) => {
                const currentTarget = targets[s.id] || s.targetGrade || 0;
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-surface border border-surface-border flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-zinc-100 truncate">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Текущий балл: {s.currentAverage > 0 ? s.currentAverage.toFixed(2) : 'Нет отметок'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {[7, 8, 9, 10].map((num) => {
                        const isChosen = currentTarget === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleSetTarget(s.id, num)}
                            className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all border ${
                              isChosen
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-surface-subtle text-zinc-400 border-surface-border hover:border-zinc-600'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Шаг 2: Выбор темы оформления */}
        {step === 2 && (
          <div className="p-5 overflow-y-auto space-y-3 flex-1 max-h-[60vh]">
            <div className="text-xs text-zinc-400 mb-2">
              Выберите тему (фон можно настроить или полностью отключить в любой момент):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEMES_LIST.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-zinc-200 bg-surface-subtle shadow-md'
                        : 'border-surface-border bg-surface/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span className="text-xs font-bold text-zinc-100">
                          {theme.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-200" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      {theme.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Подвал визарда */}
        <div className="p-4 border-t border-surface-border bg-surface-subtle/40 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            Шаг {step} из 2
          </div>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200"
              >
                Назад
              </button>
            )}
            <button
              onClick={handleNextOrFinish}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
            >
              <span>{step === 1 ? 'Далее' : 'Завершить и войти'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
