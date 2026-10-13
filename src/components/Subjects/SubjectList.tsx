'use client';

import React, { useState } from 'react';
import { Search, ChevronRight, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { SubjectItem } from '@/lib/eschools/types';
import { getGradeBadgeClasses } from '@/lib/utils';
import { SubjectDetailModal } from './SubjectDetailModal';

interface SubjectListProps {
  subjects: SubjectItem[];
  onUpdateTarget?: (subjectId: string, target: number) => void;
  selectedSubject: SubjectItem | null;
  onSelectSubject: (subject: SubjectItem | null) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  onUpdateTarget,
  selectedSubject,
  onSelectSubject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'gpa' | 'count'>('name');

  const filteredSubjects = subjects
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'gpa') return b.currentAverage - a.currentAverage;
      if (sortBy === 'count') return b.grades.length - a.grades.length;
      return a.name.localeCompare(b.name, 'ru');
    });

  return (
    <div className="space-y-4">
      {/* Панель поиска и сортировки */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface border border-surface-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по названию предмета..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-subtle border border-surface-border rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Сортировка:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-surface-subtle border border-surface-border rounded text-zinc-200 focus:outline-none font-sans"
          >
            <option value="name">По алфавиту</option>
            <option value="gpa">По среднему баллу</option>
            <option value="count">По числу оценок</option>
          </select>
        </div>
      </div>

      {/* Список предметов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSubjects.map((subject) => {
          const badge = getGradeBadgeClasses(Math.round(subject.currentAverage));
          return (
            <div
              key={subject.id}
              onClick={() => onSelectSubject(subject)}
              className="p-4 rounded-lg bg-surface border border-surface-border hover:border-zinc-700 transition-colors cursor-pointer group flex items-center justify-between"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs md:text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                    {subject.name}
                  </h3>
                  {subject.trend === 'up' && (
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  {subject.trend === 'down' && (
                    <TrendingDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                </div>

                {subject.teacher && (
                  <p className="text-[11px] text-zinc-500 truncate mt-1">
                    {subject.teacher}
                  </p>
                )}

                <div className="mt-2.5 flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span>Оценок: {subject.grades.length}</span>
                  {subject.targetGrade && (
                    <span>Цель: {subject.targetGrade.toFixed(1)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {subject.currentAverage.toFixed(2)}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono rounded-lg bg-surface border border-surface-border">
          Предметы по запросу «{searchQuery}» не найдены
        </div>
      )}

      {/* Модальное окно деталей */}
      <SubjectDetailModal
        subject={selectedSubject}
        onClose={() => onSelectSubject(null)}
        onUpdateTarget={onUpdateTarget}
      />
    </div>
  );
};
