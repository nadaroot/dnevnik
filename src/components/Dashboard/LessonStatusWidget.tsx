'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Coffee,
  Bell,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { DaySchedule, LessonItem, QuarterInfo } from '@/lib/eschools/types';
import { normalizeDayLessons, THURSDAY_INFO_HOUR } from '@/lib/eschools/bells';

interface LessonStatusWidgetProps {
  schedule: DaySchedule[];
  quarters: QuarterInfo[];
  currentQuarter: number;
}

export type SchoolStatusType =
  | 'lesson_active'
  | 'info_hour'
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
  // Текущее время с обновлением раз в 15 секунд
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const status: SchoolStatusState = useMemo(() => {
    const currentTimeMs = now.getTime();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. ПРОВЕРКА НА КАНИКУЛЫ
    const activeQuarter = quarters.find((q) => q.number === currentQuarter) || quarters[0];
    let isInsideAnyQuarter = false;

    if (quarters.length > 0) {
      for (const q of quarters) {
        if (q.startDate && q.endDate) {
          const qStart = new Date(q.startDate).getTime();
          const qEnd = new Date(q.endDate).getTime() + 24 * 60 * 60 * 1000;
          if (currentTimeMs >= qStart && currentTimeMs <= qEnd) {
            isInsideAnyQuarter = true;
            break;
          }
        }
      }
    }

    if (!isInsideAnyQuarter && quarters.length > 0) {
      let vacationName = 'Каникулы';
      if (currentMonth === 10 || currentMonth === 11) vacationName = 'Осенние каникулы';
      else if (currentMonth === 12 || currentMonth === 1) vacationName = 'Зимние каникулы';
      else if (currentMonth === 3 || currentMonth === 4) vacationName = 'Весенние каникулы';
      else if (currentMonth >= 6 && currentMonth <= 8) vacationName = 'Летние каникулы';

      return {
        type: 'vacation',
        badge: 'Каникулы',
        headline: vacationName,
        detail: `Занятий нет. Следующая четверть: ${
          activeQuarter?.startDate
            ? activeQuarter.startDate.split('-').reverse().join('.')
            : 'скоро'
        }`,
      };
    }

    // 2. ВЫХОДНОЙ ДЕНЬ
    const jsDay = now.getDay(); // 0 = Вс, 1 = Пн, ... 6 = Сб
    const todayDaySchedule = schedule.find((d) => d.dayOfWeek === jsDay);

    if (
      jsDay === 0 ||
      (jsDay === 6 && (!todayDaySchedule || todayDaySchedule.lessons.length === 0))
    ) {
      return {
        type: 'weekend',
        badge: 'Выходной',
        headline: jsDay === 0 ? 'Воскресенье' : 'Суббота',
        detail: 'Уроков сегодня нет. Ближайшие занятия в понедельник в 08:00',
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
    const normalizedLessons = normalizeDayLessons(jsDay, todayDaySchedule.lessons);
    const sortedLessons = [...normalizedLessons].sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );

    const firstLesson = sortedLessons[0];
    const lastLesson = sortedLessons[sortedLessons.length - 1];

    const firstStartMin = parseTimeToMinutes(firstLesson.startTime);
    const lastEndMin = parseTimeToMinutes(lastLesson.endTime);

    // ОСОБЕННОСТЬ ЧЕТВЕРГА: Информационный час 08:00 – 08:20 (уроки смещены на +20 мин)
    if (jsDay === 4) {
      const infoStartMin = parseTimeToMinutes(THURSDAY_INFO_HOUR.startTime); // 480 (08:00)
      const infoEndMin = parseTimeToMinutes(THURSDAY_INFO_HOUR.endTime); // 500 (08:20)

      if (currentMinutes < infoStartMin) {
        const minutesUntil = infoStartMin - currentMinutes;
        const hoursUntil = Math.floor(minutesUntil / 60);
        const remMin = minutesUntil % 60;
        const timeStr = hoursUntil > 0 ? `${hoursUntil} ч ${remMin} мин` : `${remMin} мин`;

        return {
          type: 'before_school',
          badge: 'Четверг (+20 мин)',
          headline: `Инф. час в 08:00 • 1 ур. в ${firstLesson.startTime}`,
          detail: `Через ${timeStr} • 1 ур: ${firstLesson.subject}${
            firstLesson.room ? ` (каб. ${firstLesson.room})` : ''
          }`,
          nextLesson: firstLesson,
          minutesRemaining: minutesUntil,
        };
      }

      if (currentMinutes >= infoStartMin && currentMinutes < infoEndMin) {
        const minutesLeft = infoEndMin - currentMinutes;
        const elapsed = currentMinutes - infoStartMin;
        const progress = Math.min(100, Math.round((elapsed / 20) * 100));

        return {
          type: 'info_hour',
          badge: 'Инф. час идет',
          headline: 'Информационный час (08:00 – 08:20)',
          detail: `До 1-го урока (${firstLesson.subject}): ${minutesLeft} мин`,
          nextLesson: firstLesson,
          minutesRemaining: minutesLeft,
          progressPercent: progress,
        };
      }
    }

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
        detail: `Через ${timeStr} • 1 ур: ${firstLesson.subject}${
          firstLesson.room ? ` (каб. ${firstLesson.room})` : ''
        }`,
        nextLesson: firstLesson,
        minutesRemaining: minutesUntil,
      };
    }

    // Б. ПОСЛЕ ОКОНЧАНИЯ ВСЕХ УРОКОВ
    if (lastEndMin > 0 && currentMinutes >= lastEndMin) {
      return {
        type: 'after_school',
        badge: 'Занятия окончены',
        headline: 'Уроки на сегодня завершены',
        detail: `Все ${sortedLessons.length} ур. окончены в ${lastLesson.endTime}. Отличного отдыха!`,
      };
    }

    // В. УРОК ИЛИ ПЕРЕМЕНА
    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const startMin = parseTimeToMinutes(lesson.startTime);
      const endMin = parseTimeToMinutes(lesson.endTime);

      // ИДЕТ УРОК (45 минут)
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        const minutesLeft = endMin - currentMinutes;
        const totalDuration = Math.max(1, endMin - startMin);
        const elapsed = currentMinutes - startMin;
        const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));

        return {
          type: 'lesson_active',
          badge: `${lesson.lessonNumber} урок (${lesson.startTime}–${lesson.endTime})`,
          headline: lesson.subject,
          detail: `До звонка с урока: ${minutesLeft} мин${
            lesson.room ? ` • Каб. ${lesson.room}` : ''
          }`,
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
            badge: `Перемена до ${nextLesson.startTime}`,
            headline: `Перемена (${breakLeft} мин до ${nextLesson.lessonNumber} урока)`,
            detail: `Далее в ${nextLesson.startTime}: ${nextLesson.lessonNumber}. ${
              nextLesson.subject
            }${nextLesson.room ? ` (каб. ${nextLesson.room})` : ''}`,
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            {status.type === 'lesson_active' || status.type === 'info_hour' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            ) : status.type === 'break' ? (
              <Bell className="w-3.5 h-3.5 text-yellow-400" />
            ) : status.type === 'vacation' ? (
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            ) : status.type === 'weekend' ? (
              <Coffee className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
            )}
            Звонки сейчас
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
              status.type === 'lesson_active' || status.type === 'info_hour'
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                : status.type === 'break'
                ? 'bg-yellow-400/20 text-yellow-300 border-yellow-500/40'
                : 'bg-surface-subtle text-zinc-400 border-surface-border'
            }`}
          >
            {status.badge}
          </span>
        </div>

        {/* Главный заголовок состояния */}
        <div className="mt-3">
          <div className="text-base md:text-lg font-bold text-zinc-100 tracking-tight truncate">
            {status.headline}
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono leading-relaxed line-clamp-2">
            {status.detail}
          </p>
        </div>

        {/* Прогресс-бар идущего урока или перемены */}
        {typeof status.progressPercent === 'number' && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
              <span>
                {status.type === 'break'
                  ? 'До начала урока'
                  : status.type === 'info_hour'
                  ? 'До конца инф. часа'
                  : 'До конца урока (45 мин)'}
              </span>
              <span className="text-zinc-100 font-bold">осталось {status.minutesRemaining} мин</span>
            </div>
            <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-surface-border">
              <div
                className="h-full bg-zinc-100 rounded-full transition-all duration-500"
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
          <span className="text-zinc-300 truncate pr-2">
            Далее: {status.nextLesson.subject}
          </span>
        ) : (
          <span>
            Время: {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        <span className="text-zinc-400 shrink-0">
          {now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
};
