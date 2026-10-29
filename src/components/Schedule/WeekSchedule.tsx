'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Award,
  ArrowLeft,
  Bell,
  Info,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  DaySchedule,
  LessonItem,
  SubjectItem,
  QuarterInfo,
  WeekScheduleData,
} from '@/lib/eschools/types';
import { normalizeDayLessons, THURSDAY_INFO_HOUR } from '@/lib/eschools/bells';
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

function formatDayMonth(d: Date): string {
  const day = d.getDate();
  const months = [
    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${day} ${months[d.getMonth()]}`;
}

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

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
  onOpenSubject,
}) => {
  const currentJsDay = new Date().getDay();
  const defaultDayIndex = currentJsDay >= 1 && currentJsDay <= 6 ? currentJsDay : 1;

  const [activeDay, setActiveDay] = useState<number>(defaultDayIndex);
  const [now, setNow] = useState<Date>(() => new Date());
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [activeView, setActiveView] = useState<'schedule' | 'final_grades'>('schedule');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

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

  const isViewingCurrentCalendarWeek = weekOffset === 0;

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

  // Формирование расписания недели с применением точного расписания звонков (45 мин + сдвиг в четверг)
  const activeWeekSchedule: DaySchedule[] = useMemo(() => {
    const mondayIso = currentMonday.toISOString().split('T')[0];
    const foundWeek = weeksSchedule.find((w) => {
      return (
        w.startDate === mondayIso ||
        (w.startDate <= mondayIso && w.endDate >= mondayIso)
      );
    });

    const DAY_NAMES = [
      '',
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
    ];

    if (foundWeek && foundWeek.days && foundWeek.days.length > 0) {
      return weekDayDates.map(({ dayOfWeek, dateStr }) => {
        const rawDay = foundWeek.days.find((d) => d.dayOfWeek === dayOfWeek);
        const rawLessons = (rawDay?.lessons || []).map((l) => {
          const gradeKey = `${l.subject.toLowerCase().trim()}_${dateStr}`;
          const matchedGrade = gradesDateMap.get(gradeKey);
          return {
            ...l,
            grade: l.grade ?? matchedGrade?.value,
            gradeTopic: l.gradeTopic ?? matchedGrade?.topic,
          };
        });

        return {
          dayOfWeek,
          dayName: rawDay?.dayName || DAY_NAMES[dayOfWeek] || `День ${dayOfWeek}`,
          date: dateStr,
          lessons: normalizeDayLessons(dayOfWeek, rawLessons),
        };
      });
    }

    return weekDayDates.map(({ dayOfWeek, dateStr }) => {
      const baseDay = schedule.find((d) => d.dayOfWeek === dayOfWeek);
      const dayLessons: LessonItem[] = (baseDay?.lessons || []).map((l) => {
        const gradeKey = `${l.subject.toLowerCase().trim()}_${dateStr}`;
        const matchedGrade = gradesDateMap.get(gradeKey);

        return {
          ...l,
          grade: l.grade ?? matchedGrade?.value,
          gradeTopic: l.gradeTopic ?? matchedGrade?.topic,
        };
      });

      return {
        dayOfWeek,
        dayName: baseDay?.dayName || DAY_NAMES[dayOfWeek] || `День ${dayOfWeek}`,
        date: dateStr,
        lessons: normalizeDayLessons(dayOfWeek, dayLessons),
      };
    });
  }, [weeksSchedule, currentMonday, weekDayDates, schedule, gradesDateMap]);

  const selectedDaySchedule =
    activeWeekSchedule.find((d) => d.dayOfWeek === activeDay) || activeWeekSchedule[0];

  const selectedDayDateObj = weekDayDates.find((w) => w.dayOfWeek === activeDay);

  const isSelectedDayToday =
    isViewingCurrentCalendarWeek && selectedDaySchedule?.dayOfWeek === currentJsDay;

  const isThursdaySelected = selectedDaySchedule?.dayOfWeek === 4;
  const isThursdayInfoHourActive =
    isSelectedDayToday &&
    isThursdaySelected &&
    nowMinutes >= 8 * 60 &&
    nowMinutes < 8 * 60 + 20;

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
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
      const isNonGraded =
        isPassFail || isClassHour || s.isGraded === false || s.periodType === 'none';

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

  const quarterStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    let countTens = 0;
    let countNines = 0;
    let countEights = 0;
    let countLow = 0;

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
        <div className="p-4 sm:p-5 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-100 shrink-0">
              <Award className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono bg-zinc-100 text-zinc-950 font-bold hover:bg-white active:scale-95 transition-all shadow-md shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Назад к расписанию</span>
          </button>
        </div>

        {/* Сводные показатели успеваемости */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-lg bg-surface border border-surface-border">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Четвертной GPA
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {quarterStats.averageQuarterGpa > 0 ? quarterStats.averageQuarterGpa.toFixed(2) : '—'}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              по {quarterStats.count} предм.
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-surface-border">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Десятки (10)
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {quarterStats.countTens} шт.
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              высший балл
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-surface-border">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Девятки (9)
            </div>
            <div className="text-xl font-bold font-mono text-zinc-200 mt-1">
              {quarterStats.countNines} шт.
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              отличный уровень
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-surface-border">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-100 mt-1 truncate">
              {quarterStats.isHonors ? (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Отличник</span>
                </span>
              ) : quarterStats.isGoodStudent ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Target className="w-4 h-4 shrink-0" />
                  <span>Ударник</span>
                </span>
              ) : (
                'Учащийся'
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {quarterStats.countLow === 0 ? 'Без низких оценок' : 'Есть зоны внимания'}
            </div>
          </div>
        </div>

        {/* МОБИЛЬНЫЙ СПИСОК ЧЕТВЕРТНЫХ ОТМЕТОК (без горизонтального скролла!) */}
        <div className="md:hidden space-y-2">
          {quarterlySubjectsData.map((s) => (
            <div
              key={s.id}
              onClick={() => onOpenSubject?.(s)}
              className="p-3 rounded-lg bg-surface border border-surface-border active:bg-surface-subtle transition-colors cursor-pointer flex items-center justify-between gap-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-100 truncate">
                    {s.name}
                  </span>
                  {s.periodType === 'semester' && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                      полугодие
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {s.isPassFail
                    ? 'Зачетная дисциплина'
                    : s.isClassHour
                    ? 'Без аттестации'
                    : `Средний балл: ${s.currentAverage > 0 ? s.currentAverage.toFixed(2) : '—'} (${s.grades?.length || 0} отм.)`}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {s.isPassFail ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                    Зачет
                  </span>
                ) : s.isClassHour ? (
                  <span className="text-zinc-600 font-mono text-xs">—</span>
                ) : typeof s.q1 === 'number' && s.q1 > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500">I четв:</span>
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs border ${getGradeBadgeClasses(
                        s.q1
                      )}`}
                    >
                      {s.q1}
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-500 font-mono text-xs">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ДЕСКТОПНАЯ ТАБЛИЦА ЧЕТВЕРТНЫХ ОТМЕТОК */}
        <div className="hidden md:block rounded-lg bg-surface border border-surface-border overflow-hidden">
          <div className="p-3.5 border-b border-surface-border flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">
              Ведомость четвертных отметок
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {quarterlySubjectsData.length} учебных дисциплин
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
                {quarterlySubjectsData.map((s) => (
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
                    <td className="py-3 px-3 text-center">
                      {typeof s.q2 === 'number' ? (
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
                ))}
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
    <div className="space-y-3.5">
      {/* Верхняя навигационная панель: Стрелки вперед/назад + Последняя страница */}
      <div className="p-3 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 select-none">
        <div className="flex items-center justify-between sm:justify-start gap-1.5">
          <button
            onClick={handlePrevWeek}
            title="Предыдущая неделя дневника"
            className="w-10 h-10 rounded-lg text-xs font-mono font-medium bg-surface-subtle border border-surface-border text-zinc-300 hover:text-white active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="h-10 flex flex-col items-center justify-center px-3 bg-surface-subtle/80 rounded-lg border border-surface-border flex-1 sm:flex-initial sm:min-w-[170px] text-center">
            <span className="text-xs font-bold font-mono text-zinc-100">
              {formatDayMonth(currentMonday)} — {formatDayMonth(currentSaturday)}
            </span>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono">
              {isViewingCurrentCalendarWeek ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Текущая неделя
                </span>
              ) : (
                <span>
                  {weekOffset > 0
                    ? `+${weekOffset} нед. вперед`
                    : `${Math.abs(weekOffset)} нед. назад`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleNextWeek}
            title="Следующая неделя дневника"
            className="w-10 h-10 rounded-lg text-xs font-mono font-medium bg-surface-subtle border border-surface-border text-zinc-300 hover:text-white active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {!isViewingCurrentCalendarWeek && (
            <button
              onClick={handleJumpToCurrentWeek}
              className="h-10 px-3 text-xs font-mono rounded-lg bg-surface-subtle text-zinc-300 hover:text-white border border-surface-border transition-colors flex items-center justify-center"
            >
              Сегодня
            </button>
          )}

          <button
            onClick={() => setActiveView('final_grades')}
            className="w-full sm:w-auto h-10 flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-mono font-bold bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95 transition-all border border-zinc-200 shadow-sm"
          >
            <Award className="w-4 h-4 text-zinc-900 shrink-0" />
            <span>Последняя страница (Четвертные)</span>
          </button>
        </div>
      </div>

      {/* Переключатель дней недели (Пн - Сб) — строгая симметричная сетка 6 колонок без полос прокрутки */}
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl bg-surface border border-surface-border select-none">
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
              className={`h-[64px] sm:h-[68px] rounded-lg text-xs font-mono transition-all text-center relative border flex flex-col justify-between items-center py-1.5 px-0.5 sm:px-1 overflow-hidden ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white shadow-sm'
                  : 'bg-surface-subtle text-zinc-400 border-surface-border hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="font-bold text-[11px] sm:text-xs">{DAY_SHORT[dayOfWeek]}</span>
                {isDayToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-zinc-950' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                )}
              </div>
              <div
                className={`text-[9px] sm:text-[10px] font-mono leading-none ${
                  isActive ? 'text-zinc-800 font-semibold' : 'text-zinc-500'
                }`}
              >
                {shortDate}
              </div>
              <div className="flex items-center justify-center gap-0.5 text-[9px] leading-none opacity-90">
                <span>{lessonsCount}у</span>
                {marksInDay.length > 0 && (
                  <span
                    className={`px-1 rounded text-[8px] font-bold leading-tight ${
                      isActive
                        ? 'bg-zinc-950 text-white'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
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
      <div className="p-3.5 sm:p-5 rounded-lg bg-surface border border-surface-border space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-sm font-bold text-zinc-100">
              {selectedDaySchedule?.dayName}
              {selectedDayDateObj && (
                <span className="font-mono text-zinc-400 font-normal ml-1.5 text-xs">
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
            {isThursdaySelected && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium">
                Инф. час • Сдвиг +20 мин
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Уроков: {selectedDaySchedule?.lessons.length || 0} (по 45 мин)
          </span>
        </div>

        {/* Специальный блок Четверга: Информационный час (08:00 – 08:20) */}
        {isThursdaySelected && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
              isThursdayInfoHourActive
                ? 'bg-zinc-900 border-zinc-300 ring-1 ring-zinc-300/40'
                : 'bg-surface-subtle/60 border-surface-border/80'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    {THURSDAY_INFO_HOUR.title}
                  </span>
                  {isThursdayInfoHourActive && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      Идёт сейчас
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  08:00 – 08:20 (20 мин) • Все основные уроки смещены на +20 минут
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedDaySchedule || selectedDaySchedule.lessons.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-500 font-mono">
            В этот день уроков нет
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDaySchedule.lessons.map((lesson, idx) => {
              const startMin = parseTimeToMinutes(lesson.startTime);
              const endMin = parseTimeToMinutes(lesson.endTime);
              const isLessonActive =
                isSelectedDayToday &&
                startMin > 0 &&
                endMin > 0 &&
                nowMinutes >= startMin &&
                nowMinutes < endMin;

              const nextLesson =
                idx < selectedDaySchedule.lessons.length - 1
                  ? selectedDaySchedule.lessons[idx + 1]
                  : null;
              const nextStartMin = nextLesson ? parseTimeToMinutes(nextLesson.startTime) : 0;
              const breakDuration =
                nextStartMin > endMin && endMin > 0 ? nextStartMin - endMin : 0;
              const isBreakActiveNow =
                isSelectedDayToday &&
                breakDuration > 0 &&
                nowMinutes >= endMin &&
                nowMinutes < nextStartMin;

              const matchedSubject = subjects.find(
                (s) => s.name.toLowerCase().trim() === lesson.subject.toLowerCase().trim()
              );

              return (
                <React.Fragment key={lesson.id || `${lesson.lessonNumber}_${idx}`}>
                  <div
                    onClick={() => {
                      if (matchedSubject && onOpenSubject) {
                        onOpenSubject(matchedSubject);
                      }
                    }}
                    className={`p-3 sm:p-4 rounded-lg border transition-all flex flex-col gap-2 ${
                      matchedSubject ? 'cursor-pointer' : ''
                    } ${
                      isLessonActive
                        ? 'bg-zinc-900 border-zinc-300 ring-1 ring-zinc-300/30 shadow-md'
                        : 'bg-surface-subtle border-surface-border hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                            isLessonActive
                              ? 'bg-zinc-100 text-zinc-950 font-bold'
                              : 'bg-surface-muted border border-surface-border text-zinc-300'
                          }`}
                        >
                          {lesson.lessonNumber}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                              {lesson.subject}
                            </h4>
                            {isLessonActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Идёт урок (ещё {endMin - nowMinutes} мин)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 mt-1 font-mono flex-wrap">
                            {lesson.startTime && (
                              <span className="flex items-center gap-1 text-zinc-300 font-medium">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {lesson.startTime} – {lesson.endTime}
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

                      {/* Отметка за данный урок */}
                      {typeof lesson.grade === 'number' && (
                        <div className="shrink-0 flex flex-col items-end">
                          <span
                            title={lesson.gradeTopic || 'Отметка за урок'}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-mono font-bold border shadow-sm ${getGradeBadgeClasses(
                              lesson.grade
                            )}`}
                          >
                            {lesson.grade}
                          </span>
                          {lesson.gradeTopic && (
                            <span className="text-[9px] text-zinc-400 font-mono mt-0.5 max-w-[85px] truncate text-right">
                              {lesson.gradeTopic}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Домашнее задание */}
                    {lesson.homework && (
                      <div className="p-2.5 rounded-lg bg-surface-muted/70 border border-surface-border text-xs">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono font-semibold mb-0.5">
                          Домашнее задание:
                        </div>
                        <div className="text-zinc-200 font-sans text-xs leading-relaxed break-words">
                          {lesson.homework}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Строка перемены между уроками */}
                  {breakDuration > 0 && nextLesson && (
                    <div
                      className={`px-3 py-1 rounded flex items-center justify-between text-[10px] font-mono ${
                        isBreakActiveNow
                          ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-500/40 font-bold'
                          : 'text-zinc-500'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Bell className="w-3 h-3" />
                        {isBreakActiveNow
                          ? `Сейчас перемена (${nextStartMin - nowMinutes} мин до ${nextLesson.lessonNumber} урока)`
                          : `Перемена ${breakDuration} мин`}
                      </span>
                      <span>
                        {lesson.endTime} – {nextLesson.startTime}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
