'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  BookOpen,
  Calendar,
  Coffee,
  CheckCircle2,
  Bell,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { DaySchedule, LessonItem, QuarterInfo } from '@/lib/eschools/types';

interface LessonStatusWidgetProps {
  schedule: DaySchedule[];
  quarters: QuarterInfo[];
  currentQuarter: number;
}

export type SchoolStatusType =
  | 'lesson_active'
  | 'break'
  | 'before_school'
  | 'after_school'
  | 'weekend'
  | 'vacation'
  | 'no_lessons';

interface SchoolStatusState {
  type: SchoolStatusType;
  badge: string;
  headline: string;
  detail: string;
  currentLesson?: LessonItem;
  nextLesson?: LessonItem;
  minutesRemaining?: number;
  progressPercent?: number;
  room?: string;
  subject?: string;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

export const LessonStatusWidget: React.FC<LessonStatusWidgetProps> = ({
  schedule,
  quarters,
  currentQuarter,
}) => {
  // Текущее время с обновлением раз в 30 секунд
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const status: SchoolStatusState = useMemo(() => {
    const currentTimeMs = now.getTime();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDayOfMonth = now.getDate();

    // 1. ПРОВЕРКА НА КАНИКУЛЫ
    // Проверяем, попадает ли текущая дата в диапазон активных четвертей
    const activeQuarter = quarters.find((q) => q.number === currentQuarter) || quarters[0];
    let isInsideAnyQuarter = false;

    if (quarters.length > 0) {
      for (const q of quarters) {
        if (q.startDate && q.endDate) {
          const qStart = new Date(q.startDate).getTime();
          // Добавляем 1 день к endDate для включения последнего дня
          const qEnd = new Date(q.endDate).getTime() + 24 * 60 * 60 * 1000;
          if (currentTimeMs >= qStart && currentTimeMs <= qEnd) {
            isInsideAnyQuarter = true;
            break;
          }
        }
      }
    }

    // Если дата вне четвертей — каникулы!
    if (!isInsideAnyQuarter && quarters.length > 0) {
      // Определяем сезон каникул по месяцу
      let vacationName = 'Каникулы';
      if (currentMonth === 10 || currentMonth === 11) vacationName = 'Осенние каникулы';
      else if (currentMonth === 12 || currentMonth === 1) vacationName = 'Зимние каникулы';
      else if (currentMonth === 3 || currentMonth === 4) vacationName = 'Весенние каникулы';
      else if (currentMonth >= 6 && currentMonth <= 8) vacationName = 'Летние каникулы';

      return {
        type: 'vacation',
        badge: 'Каникулы',
        headline: vacationName,
        detail: `Занятий нет. Следующая четверть: ${activeQuarter?.startDate ? activeQuarter.startDate.split('-').reverse().join('.') : 'скоро'}`,
      };
    }

    // 2. ВЫХОДНОЙ ДЕНЬ
    const jsDay = now.getDay(); // 0 = Вс, 1 = Пн, ... 6 = Сб
    const todayDaySchedule = schedule.find((d) => d.dayOfWeek === jsDay);

    if (jsDay === 0 || (jsDay === 6 && (!todayDaySchedule || todayDaySchedule.lessons.length === 0))) {
      return {
        type: 'weekend',
        badge: 'Выходной',
        headline: jsDay === 0 ? 'Воскресенье' : 'Суббота',
        detail: 'Уроков сегодня нет. Ближайшие занятия в понедельник',
      };
    }

    // 3. УЧЕБНЫЙ ДЕНЬ
    if (!todayDaySchedule || todayDaySchedule.lessons.length === 0) {
      return {
        type: 'no_lessons',
        badge: 'Свободный день',
        headline: 'Уроков нет в расписании',
        detail: 'На сегодня занятия не запланированы',
      };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const sortedLessons = [...todayDaySchedule.lessons].sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );

    const firstLesson = sortedLessons[0];
    const lastLesson = sortedLessons[sortedLessons.length - 1];

    const firstStartMin = parseTimeToMinutes(firstLesson.startTime);
    const lastEndMin = parseTimeToMinutes(lastLesson.endTime);

    // А. ДО НАЧАЛА УРОКОВ
    if (currentMinutes < firstStartMin) {
      const minutesUntil = firstStartMin - currentMinutes;
      const hoursUntil = Math.floor(minutesUntil / 60);
      const remMin = minutesUntil % 60;
      const timeStr = hoursUntil > 0 ? `${hoursUntil} ч ${remMin} мин` : `${remMin} мин`;

      return {
        type: 'before_school',
        badge: 'Скоро уроки',
        headline: `Начало в ${firstLesson.startTime}`,
        detail: `Через ${timeStr} • 1 ур: ${firstLesson.subject}${firstLesson.room ? ` (каб. ${firstLesson.room})` : ''}`,
        nextLesson: firstLesson,
        minutesRemaining: minutesUntil,
      };
    }

    // Б. ПОСЛЕ ОКОНЧАНИЯ ВСЕХ УРОКОВ
    if (currentMinutes >= lastEndMin) {
      return {
        type: 'after_school',
        badge: 'Занятия окончены',
        headline: 'Уроки на сегодня завершены',
        detail: `Все ${sortedLessons.length} уроков окончены. Отличного вечера!`,
      };
    }

    // В. УРОК ИЛИ ПЕРЕМЕНА
    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const startMin = parseTimeToMinutes(lesson.startTime);
      const endMin = parseTimeToMinutes(lesson.endTime);

      // ИДЕТ УРОК
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        const minutesLeft = endMin - currentMinutes;
        const totalDuration = Math.max(1, endMin - startMin);
        const elapsed = currentMinutes - startMin;
        const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));

        return {
          type: 'lesson_active',
          badge: `${lesson.lessonNumber} урок идет`,
          headline: lesson.subject,
          detail: `До звонка: ${minutesLeft} мин • ${lesson.room ? `Кабинет ${lesson.room}` : 'Кабинет не указан'}`,
          currentLesson: lesson,
          minutesRemaining: minutesLeft,
          progressPercent: progress,
          room: lesson.room,
          subject: lesson.subject,
        };
      }

      // ПЕРЕМЕНА МЕЖДУ УРОКАМИ
      if (i < sortedLessons.length - 1) {
        const nextLesson = sortedLessons[i + 1];
        const nextStartMin = parseTimeToMinutes(nextLesson.startTime);

        if (currentMinutes >= endMin && currentMinutes < nextStartMin) {
          const breakLeft = nextStartMin - currentMinutes;
          const totalBreak = Math.max(1, nextStartMin - endMin);
          const elapsedBreak = currentMinutes - endMin;
          const breakProgress = Math.min(100, Math.round((elapsedBreak / totalBreak) * 100));

          return {
            type: 'break',
            badge: 'Перемена',
            headline: `Перемена (${breakLeft} мин до звонка)`,
            detail: `След: ${nextLesson.lessonNumber}. ${nextLesson.subject}${nextLesson.room ? ` (каб. ${nextLesson.room})` : ''}`,
            nextLesson,
            minutesRemaining: breakLeft,
            progressPercent: breakProgress,
          };
        }
      }
    }

    return {
      type: 'after_school',
      badge: 'Уроки завершены',
      headline: 'Уроки на сегодня завершены',
      detail: `Все ${sortedLessons.length} уроков окончены`,
    };
  }, [now, schedule, quarters, currentQuarter]);

  return (
    <div className="p-5 rounded-lg bg-surface border border-surface-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            {status.type === 'lesson_active' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-100" />
              </span>
            ) : status.type === 'break' ? (
              <Bell className="w-3.5 h-3.5 text-zinc-400" />
            ) : status.type === 'vacation' ? (
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            ) : status.type === 'weekend' ? (
              <Coffee className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
            )}
            Расписание сейчас
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              status.type === 'lesson_active'
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                : status.type === 'break'
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-surface-subtle text-zinc-400 border-surface-border'
            }`}
          >
            {status.badge}
          </span>
        </div>

        {/* Главный заголовок состояния */}
        <div className="mt-3">
          <div className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight truncate">
            {status.headline}
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono leading-relaxed line-clamp-2">
            {status.detail}
          </p>
        </div>

        {/* Прогресс-бар идущего урока или перемены */}
        {typeof status.progressPercent === 'number' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-1">
              <span>До звонка</span>
              <span className="text-zinc-300 font-bold">{status.minutesRemaining} мин</span>
            </div>
            <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-surface-border">
              <div
                className="h-full bg-zinc-200 rounded-full transition-all duration-500"
                style={{ width: `${status.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Нижняя строчка с контекстом */}
      <div className="mt-4 pt-3 border-t border-surface-border/60 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
        {status.type === 'lesson_active' && status.room ? (
          <span className="flex items-center gap-1 text-zinc-300">
            <MapPin className="w-3 h-3 text-zinc-400" />
            Кабинет {status.room}
          </span>
        ) : status.type === 'break' && status.nextLesson ? (
          <span className="text-zinc-300 truncate">
            Далее: {status.nextLesson.subject}
          </span>
        ) : (
          <span>Текущее время: {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
        )}

        <span className="text-zinc-400">
          {now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
};
