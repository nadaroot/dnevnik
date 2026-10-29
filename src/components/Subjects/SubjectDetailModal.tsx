'use client';

import React, { useEffect } from 'react';
import { X, Activity, Calculator } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { getGradeBadgeClasses, formatDateRu } from '@/lib/utils';
import { StrategyCalculator } from './StrategyCalculator';

interface SubjectDetailModalProps {
  subject: SubjectItem | null;
  onClose: () => void;
  onUpdateTarget?: (subjectId: string, target: number) => void;
  onOpenCalculator?: (subject: SubjectItem) => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  subject,
  onClose,
  onUpdateTarget,
  onOpenCalculator,
}) => {
  useEffect(() => {
    if (subject) {
      document.body.classList.add('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [subject]);

  if (!subject) return null;

  const badge = getGradeBadgeClasses(Math.round(subject.currentAverage));

  // Построение мини-графика для предмета
  const grades = subject.grades || [];
  const width = 400;
  const height = 100;
  const paddingX = 25;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const minVal = 1;
  const maxVal = 10;

  const getX = (idx: number) => {
    if (grades.length <= 1) return width / 2;
    return paddingX + (idx / (grades.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingY - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  };

  const points = grades.map((g, i) => `${getX(i)},${getY(g.value)}`).join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] bg-zinc-950 rounded-t-2xl sm:rounded-xl border border-surface-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок модального окна */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface shrink-0 gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm md:text-base font-bold text-zinc-100 truncate">
              {subject.name}
            </h2>
            {subject.teacher && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {subject.teacher}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenCalculator && subject.isGraded !== false && (
              <button
                type="button"
                onClick={() => {
                  const s = subject;
                  onClose();
                  onOpenCalculator(s);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-surface-subtle border border-surface-border text-zinc-200 hover:text-white active:scale-95"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Калькулятор</span>
              </button>
            )}
            {grades.length > 0 && (
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {subject.currentAverage.toFixed(2)}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-subtle text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Прокручиваемый контент */}
        <div className="modal-scroll flex-1 min-h-0 overflow-y-auto p-4 pb-8 space-y-4">
          {/* График отметок по предмету */}
          {grades.length > 0 && (
            <div className="p-3 rounded-lg bg-surface border border-surface-border">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Хронология оценок
                </span>
                <span>Шкала: 1 – 10</span>
              </div>

              <div className="w-full aspect-[4/1]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                  {[5, 8].map((lineVal) => (
                    <line
                      key={lineVal}
                      x1={paddingX}
                      y1={getY(lineVal)}
                      x2={width - paddingX}
                      y2={getY(lineVal)}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  ))}

                  <polyline
                    points={points}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {grades.map((g, i) => (
                    <g key={g.id || i}>
                      <circle
                        cx={getX(i)}
                        cy={getY(g.value)}
                        r="3"
                        fill="#000000"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      {grades.length <= 16 && (
                        <text
                          x={getX(i)}
                          y={getY(g.value) - 6}
                          textAnchor="middle"
                          fill="#f4f4f5"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {g.value}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* Список полученных оценок */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Все оценки ({grades.length})
            </div>

            {grades.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 font-mono rounded-lg bg-surface border border-surface-border">
                Оценок по этому предмету пока нет
              </div>
            ) : (
              <div className="space-y-1.5">
                {grades.map((grade, idx) => {
                  const gBadge = getGradeBadgeClasses(grade.value);
                  return (
                    <div
                      key={grade.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-zinc-200 truncate">
                          {grade.topic ||
                            (grade.type === 'control'
                              ? 'Контрольная работа'
                              : 'Отметка за урок')}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {formatDateRu(grade.date)}
                        </div>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs border shrink-0 ${gBadge.bg} ${gBadge.text} ${gBadge.border}`}
                      >
                        {grade.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Калькулятор стратегии */}
          {subject.isGraded !== false && (
            <StrategyCalculator
              subject={subject}
              onUpdateTarget={(val) => onUpdateTarget?.(subject.id, val)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
