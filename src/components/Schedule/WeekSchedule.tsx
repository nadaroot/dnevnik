'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  Award,
  ArrowLeft,
  Calculator,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { DaySchedule, LessonItem, SubjectItem, QuarterInfo, WeekScheduleData } from '@/lib/eschools/types';
import { getGradeBadgeClasses } from '@/lib/utils';

interface WeekScheduleProps {
  schedule: DaySchedule[];
  weeksSchedule?: WeekScheduleData[];
  subjects?: SubjectItem[];
  quarters?: QuarterInfo[];
  currentQuarter?: number;
  onSelectQuarter?: (quarterNum: number) => void;
  onOpenSubject?: (subject: SubjectItem) => void;
  onOpenCalculator?: (subject: SubjectItem) => void;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

// Форматирование даты в виде "21 октября" или "21.10"
function formatDayMonth(d: Date): string {
  const day = d.getDate();
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  return `${day} ${months[d.getMonth()]}`;
}

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

// Получить понедельник недели для заданной даты
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export const WeekSchedule: React.FC<WeekScheduleProps> = ({
  schedule,
  weeksSchedule = [],
  subjects = [],
  quarters = [],
  currentQuarter = 1,
  onSelectQuarter,
  onOpenSubject,
  onOpenCalculator,
}) => {
  // Текущий день недели в JS: 0 = Вс, 1 = Пн.. 6 = Сб
  const currentJsDay = new Date().getDay();
  const defaultDayIndex = currentJsDay >= 1 && currentJsDay <= 6 ? currentJsDay : 1;

  const [activeDay, setActiveDay] = useState<number>(defaultDayIndex);
  const [now, setNow] = useState<Date>(() => new Date());

  // Смещение недели относительно текущей (0 = текущая неделя, -1 = прошлая, +1 = следующая)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Режим просмотра: обычные страницы дневника ('schedule') или последняя страница с четвертными ('final_grades')
  const [activeView, setActiveView] = useState<'schedule' | 'final_grades'>('schedule');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Расчет дат для текущей просматриваемой недели
  const currentMonday = useMemo(() => {
    const mon = getMonday(new Date());
    mon.setDate(mon.getDate() + weekOffset * 7);
    return mon;
  }, [weekOffset]);

  const currentSaturday = useMemo(() => {
    const sat = new Date(currentMonday);
    sat.setDate(sat.getDate() + 5);
    return sat;
  }, [currentMonday]);

  // Проверка: это текущая календарная неделя?
  const isViewingCurrentCalendarWeek = weekOffset === 0;

  // Массив дат для 6 дней недели (Пн-Сб)
  const weekDayDates = useMemo(() => {
    const dates: { dayOfWeek: number; dateStr: string; shortDate: string; fullDate: Date }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      dates.push({
        dayOfWeek: i + 1,
        dateStr: isoDate,
        shortDate: formatShortDate(d),
        fullDate: d,
      });
    }
    return dates;
  }, [currentMonday]);

  // Быстрая карта отметок по предметам и датам: Map<`${subjectName.toLowerCase()}_${date}`, GradeEntry>
  const gradesDateMap = useMemo(() => {
    const map = new Map<string, { value: number; topic?: string }>();
    subjects.forEach((s) => {
      const sName = s.name.toLowerCase().trim();
      (s.grades || []).forEach((g) => {
        if (g.date) {
          const key = `${sName}_${g.date}`;
          map.set(key, { value: g.value, topic: g.topic });
        }
      });
    });
    return map;
  }, [subjects]);

  // Определение расписания для просматриваемой недели:
  // Если в weeksSchedule есть данные по этой неделе, используем их; иначе берем базовое schedule и подставляем даты недели
  const activeWeekSchedule: DaySchedule[] = useMemo(() => {
    // Пробуем найти неделю в weeksSchedule по датам
    const mondayIso = currentMonday.toISOString().split('T')[0];
    const foundWeek = weeksSchedule.find((w) => {
      return (
        w.startDate === mondayIso ||
        (w.startDate <= mondayIso && w.endDate >= mondayIso)
      );
    });

    if (foundWeek && foundWeek.days && foundWeek.days.length > 0) {
      return foundWeek.days;
    }

    // Иначе формируем из шаблона schedule с актуальными датами и оценками
    const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return weekDayDates.map(({ dayOfWeek, dateStr }) => {
      const baseDay = schedule.find((d) => d.dayOfWeek === dayOfWeek);
      const dayLessons: LessonItem[] = (baseDay?.lessons || []).map((l) => {
        // Проверяем, есть ли оценка в этот день по этому предмету
        const gradeKey = `${l.subject.toLowerCase().trim()}_${dateStr}`;
        const matchedGrade = gradesDateMap.get(gradeKey);

        return {
          ...l,
          grade: l.grade || matchedGrade?.value,
          gradeTopic: l.gradeTopic || matchedGrade?.topic,
        };
      });

      return {
        dayOfWeek,
        dayName: baseDay?.dayName || DAY_NAMES[dayOfWeek] || `День ${dayOfWeek}`,
        date: dateStr,
        lessons: dayLessons,
      };
    });
  }, [weeksSchedule, currentMonday, weekDayDates, schedule, gradesDateMap]);

  const selectedDaySchedule =
    activeWeekSchedule.find((d) => d.dayOfWeek === activeDay) || activeWeekSchedule[0];

  const selectedDayDateObj = weekDayDates.find((w) => w.dayOfWeek === activeDay);

  // Является ли выбранный день сегодняшним днем
  const isSelectedDayToday =
    isViewingCurrentCalendarWeek && selectedDaySchedule?.dayOfWeek === currentJsDay;

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const handleJumpToCurrentWeek = () => {
    setWeekOffset(0);
    setActiveDay(defaultDayIndex);
  };

  // Расчет четвертных отметок для "Последней страницы"
  const quarterlySubjectsData = useMemo(() => {
    return subjects.map((s) => {
      const isPassFail =
        s.gradingType === 'pass_fail' || s.name.toLowerCase().includes('искусство');
      const isClassHour =
        s.gradingType === 'none' ||
        s.name.toLowerCase().includes('классный час') ||
        s.name.toLowerCase().includes('информационный час');
      const isNonGraded = isPassFail || isClassHour || s.isGraded === false || s.periodType === 'none';

      // Четвертная отметка по официальным правилам округления (от .50 в пользу учащегося)
      let q1Calculated: number | undefined;
      if (!isNonGraded && s.grades && s.grades.length > 0) {
        q1Calculated = Math.round(s.currentAverage);
      }

      return {
        ...s,
        isNonGraded,
        isPassFail,
        isClassHour,
        q1: s.quarterGrades?.q1 !== undefined ? s.quarterGrades.q1 : q1Calculated,
        q2: s.quarterGrades?.q2,
        q3: s.quarterGrades?.q3,
        q4: s.quarterGrades?.q4,
        year: s.quarterGrades?.year,
      };
    });
  }, [subjects]);

  // Сводка успеваемости по четвертным отметкам
  const quarterStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    let countTens = 0;
    let countNines = 0;
    let countEights = 0;
    let countLow = 0; // <= 4

    quarterlySubjectsData.forEach((s) => {
      if (!s.isNonGraded && typeof s.q1 === 'number' && s.q1 > 0) {
        sum += s.q1;
        count++;
        if (s.q1 === 10) countTens++;
        else if (s.q1 === 9) countNines++;
        else if (s.q1 === 8) countEights++;
        else if (s.q1 <= 4) countLow++;
      }
    });

    const averageQuarterGpa = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    const isHonors = count > 0 && countLow === 0 && averageQuarterGpa >= 9.0;
    const isGoodStudent = count > 0 && countLow === 0 && averageQuarterGpa >= 7.0;

    return {
      averageQuarterGpa,
      count,
      countTens,
      countNines,
      countEights,
      countLow,
      isHonors,
      isGoodStudent,
    };
  }, [quarterlySubjectsData]);

  // ==========================================
  // ВИД: ПОСЛЕДНЯЯ СТРАНИЦА (Четвертные отметки)
  // ==========================================
  if (activeView === 'final_grades') {
    return (
      <div className="space-y-4">
        {/* Шапка последней страницы */}
        <div className="p-4 sm:p-5 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100 shrink-0">
              <Award className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  Последняя страница дневника
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                  ИТОГИ ЧЕТВЕРТЕЙ
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Сводная ведомость четвертных, полугодовых и годовых отметок
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('schedule')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-zinc-100 text-zinc-950 font-bold hover:bg-white active:scale-95 transition-all shadow-md shrink-0 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться к страницам дневника</span>
          </button>
        </div>

        {/* Сводные показатели успеваемости */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Четвертной GPA
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 mt-1">
              {quarterStats.averageQuarterGpa > 0 ? quarterStats.averageQuarterGpa.toFixed(2) : '—'}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              по {quarterStats.count} предметам
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Десятки (10)
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {quarterStats.countTens} шт.
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              отличные оценки
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Девятки (9)
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-200 mt-1">
              {quarterStats.countNines} шт.
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              высокий уровень
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-100 mt-1 truncate">
              {quarterStats.isHonors
                ? 'Отличник 🌟'
                : quarterStats.isGoodStudent
                ? 'Ударник 🎯'
                : 'Учащийся'}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {quarterStats.countLow === 0 ? 'Без троек и ниже' : 'Есть зоны внимания'}
            </div>
          </div>
        </div>

        {/* Таблица четвертных отметок */}
        <div className="rounded-lg bg-surface border border-surface-border overflow-hidden">
          <div className="p-3.5 border-b border-surface-border flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">
              Ведомость отметок учащегося
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {quarterlySubjectsData.length} учебных дисциплин
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-surface-border/80 text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-surface-subtle/50">
                  <th className="py-2.5 px-4 font-medium">Учебный предмет</th>
                  <th className="py-2.5 px-3 font-medium text-center">I четв.</th>
                  <th className="py-2.5 px-3 font-medium text-center">II четв.</th>
                  <th className="py-2.5 px-3 font-medium text-center">III четв.</th>
                  <th className="py-2.5 px-3 font-medium text-center">IV четв.</th>
                  <th className="py-2.5 px-3 font-medium text-center">Годовая</th>
                  <th className="py-2.5 px-3 font-medium text-right">Ср. балл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/40 font-mono text-xs">
                {quarterlySubjectsData.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onOpenSubject?.(s)}
                      className="hover:bg-surface-subtle/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-sans font-medium text-zinc-100 group-hover:text-white">
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {s.periodType === 'semester' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                              полугодие
                            </span>
                          )}
                        </div>
                      </td>

                      {/* I четверть */}
                      <td className="py-3 px-3 text-center">
                        {s.isPassFail ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                            Зачет
                          </span>
                        ) : s.isClassHour ? (
                          <span className="text-zinc-600">—</span>
                        ) : typeof s.q1 === 'number' && s.q1 > 0 ? (
                          <span
                            className={`w-7 h-6 mx-auto rounded flex items-center justify-center font-bold text-xs border ${getGradeBadgeClasses(
                              s.q1
                            )}`}
                          >
                            {s.q1}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      {/* II четверть */}
                      <td className="py-3 px-3 text-center">
                        {s.isPassFail ? (
                          <span className="text-zinc-600 font-bold text-[10px]">—</span>
                        ) : typeof s.q2 === 'number' ? (
                          <span
                            className={`w-7 h-6 mx-auto rounded flex items-center justify-center font-bold text-xs border ${getGradeBadgeClasses(
                              s.q2
                            )}`}
                          >
                            {s.q2}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* III четверть */}
                      <td className="py-3 px-3 text-center">
                        {typeof s.q3 === 'number' ? (
                          <span
                            className={`w-7 h-6 mx-auto rounded flex items-center justify-center font-bold text-xs border ${getGradeBadgeClasses(
                              s.q3
                            )}`}
                          >
                            {s.q3}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* IV четверть */}
                      <td className="py-3 px-3 text-center">
                        {typeof s.q4 === 'number' ? (
                          <span
                            className={`w-7 h-6 mx-auto rounded flex items-center justify-center font-bold text-xs border ${getGradeBadgeClasses(
                              s.q4
                            )}`}
                          >
                            {s.q4}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Годовая */}
                      <td className="py-3 px-3 text-center">
                        {s.isPassFail ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                            Зачтено
                          </span>
                        ) : typeof s.year === 'number' ? (
                          <span
                            className={`w-7 h-6 mx-auto rounded flex items-center justify-center font-bold text-xs border ${getGradeBadgeClasses(
                              s.year
                            )}`}
                          >
                            {s.year}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Текущий средний балл */}
                      <td className="py-3 px-3 text-right">
                        {!s.isNonGraded && s.currentAverage > 0 ? (
                          <span className="font-bold text-zinc-200">
                            {s.currentAverage.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ВИД: СТРАНИЦЫ ДНЕВНИКА (Листание недель)
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Верхняя навигационная панель: Стрелки вперед/назад + Последняя страница */}
      <div className="p-3.5 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        {/* Стрелки перелистывания недель */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            title="Предыдущая неделя дневника"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-surface-subtle border border-surface-border text-zinc-300 hover:text-white hover:border-zinc-600 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Назад</span>
          </button>

          <div className="flex flex-col items-center justify-center px-3 py-1 bg-surface-subtle/80 rounded-lg border border-surface-border min-w-[170px] text-center">
            <span className="text-xs font-bold font-mono text-zinc-100">
              {formatDayMonth(currentMonday)} — {formatDayMonth(currentSaturday)}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
              {isViewingCurrentCalendarWeek ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Текущая неделя
                </span>
              ) : (
                <span>
                  {weekOffset > 0 ? `+${weekOffset} нед. вперед` : `${Math.abs(weekOffset)} нед. назад`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleNextWeek}
            title="Следующая неделя дневника"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-surface-subtle border border-surface-border text-zinc-300 hover:text-white hover:border-zinc-600 active:scale-95 transition-all"
          >
            <span className="hidden sm:inline">Вперед</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isViewingCurrentCalendarWeek && (
            <button
              onClick={handleJumpToCurrentWeek}
              className="text-[11px] font-mono px-2 py-1.5 rounded bg-surface-subtle text-zinc-400 hover:text-zinc-200 border border-surface-border transition-colors ml-1"
            >
              К сегодняшнему
            </button>
          )}
        </div>

        {/* Кнопка "Последняя страница" (где четвертные отметки) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setActiveView('final_grades')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95 transition-all border border-zinc-200 shadow-sm"
          >
            <Award className="w-4 h-4 text-zinc-900" />
            <span>Последняя страница (Четвертные)</span>
          </button>
        </div>
      </div>

      {/* Переключатель дней недели (Пн - Сб) с датами */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex items-center gap-1.5 overflow-x-auto select-none scrollbar-none">
        {weekDayDates.map(({ dayOfWeek, shortDate }) => {
          const dayData = activeWeekSchedule.find((d) => d.dayOfWeek === dayOfWeek);
          const isActive = dayOfWeek === activeDay;
          const isDayToday = isViewingCurrentCalendarWeek && dayOfWeek === currentJsDay;
          const DAY_SHORT = ['', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

          const lessonsCount = dayData?.lessons.length || 0;
          const marksInDay = (dayData?.lessons || []).filter((l) => typeof l.grade === 'number');

          return (
            <button
              key={dayOfWeek}
              onClick={() => setActiveDay(dayOfWeek)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-lg text-xs font-mono transition-all text-center relative border ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white shadow-md'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-bold">{DAY_SHORT[dayOfWeek]}</span>
                {isDayToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-zinc-950' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                )}
              </div>
              <div
                className={`text-[10px] mt-0.5 font-mono ${
                  isActive ? 'text-zinc-800 font-semibold' : 'text-zinc-500'
                }`}
              >
                {shortDate}
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] mt-0.5 opacity-90">
                <span>{lessonsCount} ур.</span>
                {marksInDay.length > 0 && (
                  <span
                    className={`px-1 py-0.1 rounded text-[9px] font-bold ${
                      isActive ? 'bg-zinc-950 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    +{marksInDay.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Список уроков выбранного дня */}
      <div className="p-4 sm:p-5 rounded-lg bg-surface border border-surface-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-100">
              {selectedDaySchedule?.dayName}
              {selectedDayDateObj && (
                <span className="font-mono text-zinc-400 font-normal ml-2">
                  ({selectedDayDateObj.shortDate})
                </span>
              )}
            </span>
            {isSelectedDayToday && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Сегодня
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Уроков: {selectedDaySchedule?.lessons.length || 0}
          </span>
        </div>

        {!selectedDaySchedule || selectedDaySchedule.lessons.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">
            В этот день уроков нет
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDaySchedule.lessons.map((lesson) => {
              const startMin = parseTimeToMinutes(lesson.startTime);
              const endMin = parseTimeToMinutes(lesson.endTime);
              const isLessonActive =
                isSelectedDayToday &&
                startMin > 0 &&
                endMin > 0 &&
                nowMinutes >= startMin &&
                nowMinutes <= endMin;

              return (
                <div
                  key={lesson.id}
                  className={`p-3.5 sm:p-4 rounded-lg border transition-all flex flex-col gap-2.5 ${
                    isLessonActive
                      ? 'bg-zinc-900 border-zinc-400 ring-1 ring-zinc-400/40'
                      : 'bg-surface-subtle border-surface-border hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                          isLessonActive
                            ? 'bg-zinc-100 text-zinc-950 font-bold'
                            : 'bg-surface-muted border border-surface-border text-zinc-300'
                        }`}
                      >
                        {lesson.lessonNumber}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                            {lesson.subject}
                          </h4>
                          {isLessonActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Идёт урок
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 font-mono flex-wrap">
                          {lesson.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {lesson.startTime}
                              {lesson.endTime ? ` – ${lesson.endTime}` : ''}
                            </span>
                          )}
                          {lesson.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              Каб. {lesson.room}
                            </span>
                          )}
                          {lesson.teacher && (
                            <span className="flex items-center gap-1 text-zinc-500">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{lesson.teacher}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Отметка за данный урок (если была выставлена) */}
                    {typeof lesson.grade === 'number' && (
                      <div className="shrink-0 flex flex-col items-end">
                        <span
                          title={lesson.gradeTopic || 'Отметка за урок'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono font-bold border shadow-sm ${getGradeBadgeClasses(
                            lesson.grade
                          )}`}
                        >
                          {lesson.grade}
                        </span>
                        {lesson.gradeTopic && (
                          <span className="text-[9px] text-zinc-400 font-mono mt-0.5 max-w-[90px] truncate text-right">
                            {lesson.gradeTopic}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Домашнее задание */}
                  {lesson.homework && (
                    <div className="p-2.5 rounded-lg bg-surface-muted/70 border border-surface-border text-xs">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono font-semibold mb-1">
                        Домашнее задание:
                      </div>
                      <div className="text-zinc-200 font-sans text-xs leading-relaxed">
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
