export type GradeValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface GradeEntry {
  id: string;
  value: number; // 1 - 10
  date: string;  // YYYY-MM-DD
  topic?: string;
  type?: 'regular' | 'control' | 'test' | 'quarter';
}

export type SubjectPeriodType = 'quarter' | 'semester' | 'none';

export interface SubjectItem {
  id: string;
  name: string;
  teacher?: string;
  grades: GradeEntry[];
  currentAverage: number;
  targetGrade?: number;
  critical?: boolean;
  trend?: 'up' | 'down' | 'stable';
  quarterGrade?: number;
  periodType?: SubjectPeriodType; // 'quarter' (четверть) | 'semester' (полугодие - раз в неделю) | 'none' (безоценочный)
  isGraded?: boolean;             // false для классных/инф часов и зачетных предметов
  gradingType?: 'grades' | 'pass_fail' | 'none'; // 'grades' (1-10), 'pass_fail' (зачет/незачет - Искусство), 'none' (классный/инф час)
  lessonsPerWeek?: number;
}

export interface LessonItem {
  id: string;
  lessonNumber: number;
  startTime: string; // "08:30"
  endTime: string;   // "09:15"
  subject: string;
  room: string;
  teacher?: string;
  homework?: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 1 = Monday, 6 = Saturday
  dayName: string;   // "Понедельник", etc.
  date?: string;
  lessons: LessonItem[];
}

export interface QuarterInfo {
  number: number; // 1, 2, 3, 4
  name: string;   // "I четверть"
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isActive: boolean;
}

export interface UserProfile {
  studentName: string;
  schoolName: string;
  className: string;
  subdomain: string;
  lastSync?: string;
  login?: string;
  isAdmin?: boolean;
}

export interface DiaryData {
  profile: UserProfile;
  quarters: QuarterInfo[];
  currentQuarter: number;
  subjects: SubjectItem[];
  schedule: DaySchedule[];
  overallGpa: number;
  historyGpa: { date: string; gpa: number }[];
}

export interface CalculationStrategy {
  target: number;
  currentGpa: number;
  gradesCount: number;
  neededTens: number;
  neededNines: number;
  neededEights: number;
  isAchieved: boolean;
  isImpossible: boolean;
  explanation: string;
}

export type ThemeId =
  | 'none'
  | 'space'
  | 'halloween'
  | 'winter'
  | 'sakura'
  | 'emerald'
  | 'kupalle'
  | 'mothers_day'
  | 'victory_day'
  | 'belarus';

export interface HolidayInfo {
  id: string;
  name: string;
  greeting: string;
  icon: string;
  badgeText: string;
  accentColor: string;
  dateRange: { startMonth: number; startDay: number; endMonth: number; endDay: number };
  themeId?: ThemeId;
  description?: string;
}

export interface SavedAccount {
  id: string;
  login: string;
  password?: string;
  studentName: string;
  schoolName: string;
  className: string;
  sessionCookie?: string;
  overallGpa?: number;
  lastSync?: string;
  isAdmin?: boolean;
  addedAt: number;
}
