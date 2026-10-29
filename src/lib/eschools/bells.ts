import { LessonItem } from './types';

export interface BellSlot {
  lessonNumber: number;
  startTime: string;
  endTime: string;
  breakAfterMinutes: number;
}

/**
 * Расписание звонков:
 * - Обычные дни (Пн, Вт, Ср, Пт, Сб):
 *   Уроки по 45 минут.
 *   1 урок: 08:00 – 08:45 (перемена 15 мин -> 09:00)
 *   2 урок: 09:00 – 09:45 (перемена 15 мин -> 10:00)
 *   3 урок: 10:00 – 10:45 (перемена 15 мин -> 11:00)
 *   4 урок: 11:00 – 11:45 (перемена 15 мин -> 12:00)
 *   5 урок: 12:00 – 12:45 (перемена 10 мин -> 12:55)
 *   6 урок: 12:55 – 13:40 (перемена 10 мин -> 13:50)
 *   7 урок: 13:50 – 14:35 (перемена 10 мин -> 14:45)
 *   8 урок: 14:45 – 15:30
 *
 * - Четверг (dayOfWeek === 4):
 *   Информационный час: 08:00 – 08:20 (20 минут).
 *   Все уроки смещены на +20 минут:
 *   1 урок: 08:20 – 09:05 (перемена 15 мин -> 09:20)
 *   2 урок: 09:20 – 10:05 (перемена 15 мин -> 10:20)
 *   3 урок: 10:20 – 11:05 (перемена 15 мин -> 11:20)
 *   4 урок: 11:20 – 12:05 (перемена 15 мин -> 12:20)
 *   5 урок: 12:20 – 13:05 (перемена 10 мин -> 13:15)
 *   6 урок: 13:15 – 14:00 (перемена 10 мин -> 14:10)
 *   7 урок: 14:10 – 14:55 (перемена 10 мин -> 15:05)
 *   8 урок: 15:05 – 15:50
 */

export const REGULAR_BELL_SCHEDULE: BellSlot[] = [
  { lessonNumber: 1, startTime: '08:00', endTime: '08:45', breakAfterMinutes: 15 },
  { lessonNumber: 2, startTime: '09:00', endTime: '09:45', breakAfterMinutes: 15 },
  { lessonNumber: 3, startTime: '10:00', endTime: '10:45', breakAfterMinutes: 15 },
  { lessonNumber: 4, startTime: '11:00', endTime: '11:45', breakAfterMinutes: 15 },
  { lessonNumber: 5, startTime: '12:00', endTime: '12:45', breakAfterMinutes: 10 },
  { lessonNumber: 6, startTime: '12:55', endTime: '13:40', breakAfterMinutes: 10 },
  { lessonNumber: 7, startTime: '13:50', endTime: '14:35', breakAfterMinutes: 10 },
  { lessonNumber: 8, startTime: '14:45', endTime: '15:30', breakAfterMinutes: 0 },
];

export const THURSDAY_INFO_HOUR = {
  title: 'Информационный час',
  startTime: '08:00',
  endTime: '08:20',
  durationMinutes: 20,
};

export const THURSDAY_BELL_SCHEDULE: BellSlot[] = [
  { lessonNumber: 1, startTime: '08:20', endTime: '09:05', breakAfterMinutes: 15 },
  { lessonNumber: 2, startTime: '09:20', endTime: '10:05', breakAfterMinutes: 15 },
  { lessonNumber: 3, startTime: '10:20', endTime: '11:05', breakAfterMinutes: 15 },
  { lessonNumber: 4, startTime: '11:20', endTime: '12:05', breakAfterMinutes: 15 },
  { lessonNumber: 5, startTime: '12:20', endTime: '13:05', breakAfterMinutes: 10 },
  { lessonNumber: 6, startTime: '13:15', endTime: '14:00', breakAfterMinutes: 10 },
  { lessonNumber: 7, startTime: '14:10', endTime: '14:55', breakAfterMinutes: 10 },
  { lessonNumber: 8, startTime: '15:05', endTime: '15:50', breakAfterMinutes: 0 },
];

export function getBellSlot(dayOfWeek: number, lessonNumber: number): BellSlot {
  const table = dayOfWeek === 4 ? THURSDAY_BELL_SCHEDULE : REGULAR_BELL_SCHEDULE;
  const found = table.find((b) => b.lessonNumber === lessonNumber);
  if (found) return found;

  // Fallback если урок > 8
  const offset = dayOfWeek === 4 ? 20 : 0;
  const baseStartMin = 8 * 60 + offset + (lessonNumber - 1) * 55;
  const baseEndMin = baseStartMin + 45;
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    lessonNumber,
    startTime: fmt(baseStartMin),
    endTime: fmt(baseEndMin),
    breakAfterMinutes: 10,
  };
}

/**
 * Применяет точное расписание звонков школы (с учетом смещения на 20 мин в четверг из-за инф. часа)
 * ко всем урокам дня.
 */
export function normalizeDayLessons(dayOfWeek: number, lessons: LessonItem[]): LessonItem[] {
  if (!lessons || lessons.length === 0) return [];

  return lessons.map((lesson, idx) => {
    const num = lesson.lessonNumber || idx + 1;
    const lowerSubj = (lesson.subject || '').toLowerCase();
    const isInfoHour =
      lowerSubj.includes('информационный час') || lowerSubj.includes('час информирования');

    if (dayOfWeek === 4 && isInfoHour && num === 0) {
      return {
        ...lesson,
        startTime: THURSDAY_INFO_HOUR.startTime,
        endTime: THURSDAY_INFO_HOUR.endTime,
      };
    }

    const slot = getBellSlot(dayOfWeek, num);
    return {
      ...lesson,
      lessonNumber: num,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  });
}
