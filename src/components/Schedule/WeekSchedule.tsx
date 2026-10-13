'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, BookOpen, User, CheckCircle2 } from 'lucide-react';
import { DaySchedule, LessonItem } from '@/lib/eschools/types';

interface WeekScheduleProps {
  schedule: DaySchedule[];
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

export const WeekSchedule: React.FC<WeekScheduleProps> = ({ schedule }) => {
  // Вычисляем текущий день недели (1 = Пн, 5 = Пт, если выходной — Пн)
  const currentJsDay = new Date().getDay(); // 0 = Вс, 1 = Пн
  const defaultDayIndex = currentJsDay >= 1 && currentJsDay <= 6 ? currentJsDay : 1;

  const [activeDay, setActiveDay] = useState<number>(defaultDayIndex);
  const [now, setNow] = useState<Date>(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const selectedDaySchedule =
    schedule.find((d) => d.dayOfWeek === activeDay) || schedule[0];

  const isToday = selectedDaySchedule?.dayOfWeek === currentJsDay;

  return (
    <div className="space-y-4">
      {/* Переключатель дней недели */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex items-center gap-1.5 overflow-x-auto select-none">
        {schedule.map((day) => {
          const isActive = day.dayOfWeek === activeDay;
          const isDayToday = day.dayOfWeek === currentJsDay;
          return (
            <button
              key={day.dayOfWeek}
              onClick={() => setActiveDay(day.dayOfWeek)}
              className={`flex-1 min-w-[70px] py-2 px-3 rounded text-xs font-mono transition-colors text-center relative ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-100'
                  : 'bg-surface-subtle text-zinc-400 border border-surface-border hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{day.dayName.slice(0, 2)}</span>
                {isDayToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-zinc-950' : 'bg-zinc-100 animate-pulse'}`} />
                )}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5 font-sans">
                {day.lessons.length} ур.
              </div>
            </button>
          );
        })}
      </div>

      {/* Список уроков выбранного дня */}
      <div className="p-4 rounded-lg bg-surface border border-surface-border">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">
              {selectedDaySchedule?.dayName}
            </span>
            {isToday && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Сегодня
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Всего занятий: {selectedDaySchedule?.lessons.length || 0}
          </span>
        </div>

        {(!selectedDaySchedule || selectedDaySchedule.lessons.length === 0) ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">
            В этот день уроков нет
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDaySchedule.lessons.map((lesson) => {
              const startMin = parseTimeToMinutes(lesson.startTime);
              const endMin = parseTimeToMinutes(lesson.endTime);
              const isLessonActive = isToday && startMin > 0 && endMin > 0 && nowMinutes >= startMin && nowMinutes <= endMin;

              return (
                <div
                  key={lesson.id}
                  className={`p-3.5 rounded-lg border transition-colors flex flex-col gap-2 ${
                    isLessonActive
                      ? 'bg-zinc-900 border-zinc-500 ring-1 ring-zinc-500/40'
                      : 'bg-surface-subtle border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isLessonActive
                          ? 'bg-zinc-100 text-zinc-950 font-bold'
                          : 'bg-surface-muted border border-surface-border text-zinc-300'
                      }`}>
                        {lesson.lessonNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs md:text-sm font-semibold text-zinc-100">
                            {lesson.subject}
                          </h4>
                          {isLessonActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Идёт урок
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {lesson.startTime} – {lesson.endTime}
                          </span>
                          {lesson.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              Каб. {lesson.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {lesson.teacher && (
                      <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                        <User className="w-3 h-3" />
                        <span>{lesson.teacher}</span>
                      </div>
                    )}
                  </div>

                  {/* Домашнее задание */}
                  {lesson.homework && (
                    <div className="mt-1 p-2 rounded bg-surface-muted/60 border border-surface-border text-xs">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-0.5">
                        Домашнее задание:
                      </div>
                      <div className="text-zinc-300 font-sans text-[11px]">
                        {lesson.homework}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
