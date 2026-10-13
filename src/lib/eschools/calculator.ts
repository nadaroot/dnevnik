import { CalculationStrategy, GradeEntry, SubjectItem } from './types';

/**
 * Вычисляет средний балл по списку отметок
 */
export function calculateAverage(grades: (GradeEntry | number)[]): number {
  if (!grades || grades.length === 0) return 0;
  const values = grades.map(g => (typeof g === 'number' ? g : g.value));
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / values.length).toFixed(2));
}

/**
 * Симуляция добавления гипотетических отметок к предмету
 */
export function simulateGrades(
  existingGrades: (GradeEntry | number)[],
  hypotheticalGrades: number[]
): { simulatedGpa: number; delta: number } {
  const existingValues = existingGrades.map(g => (typeof g === 'number' ? g : g.value));
  const currentGpa = calculateAverage(existingValues);
  
  const allValues = [...existingValues, ...hypotheticalGrades];
  const simulatedGpa = calculateAverage(allValues);
  const delta = Number((simulatedGpa - currentGpa).toFixed(2));

  return { simulatedGpa, delta };
}

export interface GradeOption {
  gradeValue: number;
  neededCount: number;
  label: string;
  isMinimal: boolean;
  isFastest: boolean;
}

export interface DetailedTargetStrategy {
  target: number;
  currentGpa: number;
  gradesCount: number;
  quarterThreshold: number;
  isQuarterAchieved: boolean;
  isStrictAchieved: boolean;
  options: GradeOption[];
  minimalOption: GradeOption | null;
  fastestOption: GradeOption | null;
  safetyMarginGrade: number;
  safetyMarginCount: number;
  shortSummary: string;
  quarterExplanation: string;
}

export function calculateDetailedTargetStrategy(
  grades: (GradeEntry | number)[],
  targetGrade: number
): DetailedTargetStrategy {
  const values = grades.map(g => (typeof g === 'number' ? g : g.value));
  const count = values.length;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const currentGpa = count > 0 ? Number((sum / count).toFixed(2)) : 0;

  // Порог четвертного округления в школах Беларуси: 0.5 округляется в пользу ученика
  // Например, для 6 нужен средний балл от 5.50, для 7 — от 6.50, для 8 — от 7.50
  const quarterThreshold = targetGrade <= 1 ? 1 : Number((targetGrade - 0.5).toFixed(2));

  const isQuarterAchieved = count > 0 && currentGpa >= quarterThreshold;
  const isStrictAchieved = count > 0 && currentGpa >= targetGrade;

  // Если цель уже достигнута
  if (isQuarterAchieved) {
    const marginGrade = Math.max(1, targetGrade - 1);
    let safetyCount = 0;
    if (marginGrade < quarterThreshold && count > 0) {
      const numerator = sum - quarterThreshold * count;
      const denominator = quarterThreshold - marginGrade;
      if (denominator > 0) {
        safetyCount = Math.max(0, Math.floor(numerator / denominator));
      }
    }

    return {
      target: targetGrade,
      currentGpa,
      gradesCount: count,
      quarterThreshold,
      isQuarterAchieved: true,
      isStrictAchieved,
      options: [],
      minimalOption: null,
      fastestOption: null,
      safetyMarginGrade: marginGrade,
      safetyMarginCount: safetyCount,
      shortSummary: safetyCount > 0
        ? `Цель достигнута (запас: ${safetyCount} шт. «${marginGrade}»)`
        : 'Цель достигнута (без запаса)',
      quarterExplanation: safetyCount > 0
        ? `Текущий балл (${currentGpa}) уже гарантирует ${targetGrade}. Вы можете получить еще ${formatGradeWithCount(marginGrade, safetyCount)} без падения четвертной отметки.`
        : `Текущий балл (${currentGpa}) уже гарантирует ${targetGrade}. Любая отметка ниже ${targetGrade} может снизить балл.`,
    };
  }

  // Расчет необходимых отметок от минимально возможной (например, 6) до 10
  const options: GradeOption[] = [];
  const minViableGrade = Math.max(2, Math.floor(quarterThreshold) + 1);

  for (let gradeVal = minViableGrade; gradeVal <= 10; gradeVal++) {
    if (gradeVal <= quarterThreshold) continue;
    
    let needed: number;
    if (count === 0) {
      needed = 1;
    } else {
      const numerator = quarterThreshold * count - sum;
      if (numerator <= 0) {
        needed = 0;
      } else {
        const denominator = gradeVal - quarterThreshold;
        needed = Math.ceil(numerator / denominator);
      }
    }

    if (needed > 0 && needed <= 50) {
      options.push({
        gradeValue: gradeVal,
        neededCount: needed,
        label: formatGradeWithCount(gradeVal, needed),
        isMinimal: false,
        isFastest: gradeVal === 10,
      });
    }
  }

  // Отмечаем минимальный вариант
  if (options.length > 0) {
    options[0].isMinimal = true;
  }

  const minimalOption = options.length > 0 ? options[0] : null;
  const fastestOption = options.find(o => o.gradeValue === 10) || (options.length > 0 ? options[options.length - 1] : null);

  // Формируем краткое понятное резюме (shortSummary)
  let shortSummary = '';
  if (options.length === 0) {
    shortSummary = 'Достижение цели математически невозможно';
  } else if (minimalOption && fastestOption && minimalOption.gradeValue === fastestOption.gradeValue) {
    shortSummary = `Нужно: ${minimalOption.label}`;
  } else if (minimalOption && fastestOption) {
    shortSummary = `Нужно: ${minimalOption.label} или ${fastestOption.label}`;
  } else {
    shortSummary = `Нужно: ${options[0].label}`;
  }

  // Подробное объяснение
  const formattedOptionsList = options
    .slice(0, 3)
    .map(o => o.label)
    .join(' или ');

  const quarterExplanation = `Для четвертной ${targetGrade} (балл от ${quarterThreshold}) достаточно: ${formattedOptionsList}.`;

  return {
    target: targetGrade,
    currentGpa,
    gradesCount: count,
    quarterThreshold,
    isQuarterAchieved: false,
    isStrictAchieved: false,
    options,
    minimalOption,
    fastestOption,
    safetyMarginGrade: Math.max(1, targetGrade - 1),
    safetyMarginCount: 0,
    shortSummary,
    quarterExplanation,
  };
}

export function pluralizeGrades(count: number, one: string, two: string, five: string): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}

export function formatGradeWithCount(val: number, count: number): string {
  const names: Record<number, [string, string, string]> = {
    10: ['десятку', 'десятки', 'десяток'],
    9: ['девятку', 'девятки', 'девяток'],
    8: ['восьмёрку', 'восьмёрки', 'восьмёрок'],
    7: ['семёрку', 'семёрки', 'семёрок'],
    6: ['шестёрку', 'шестёрки', 'шестёрок'],
    5: ['пятёрку', 'пятёрки', 'пятёрок'],
    4: ['четвёрку', 'четвёрки', 'четвёрок'],
    3: ['тройку', 'тройки', 'троек'],
    2: ['двойку', 'двойки', 'двоек'],
    1: ['единицу', 'единицы', 'единиц'],
  };

  const forms = names[val] || ['оценку', 'оценки', 'оценок'];
  const text = pluralizeGrades(count, forms[0], forms[1], forms[2]);
  return `${count} ${text} (${val})`;
}

/**
 * Совместимость с предыдущим калькулятором
 */
export function calculateStrategy(
  grades: (GradeEntry | number)[],
  targetGpa: number
): CalculationStrategy {
  const detailed = calculateDetailedTargetStrategy(grades, targetGpa);
  const needed10 = detailed.options.find(o => o.gradeValue === 10)?.neededCount || 0;
  const needed9 = detailed.options.find(o => o.gradeValue === 9)?.neededCount || -1;
  const needed8 = detailed.options.find(o => o.gradeValue === 8)?.neededCount || -1;

  return {
    target: targetGpa,
    currentGpa: detailed.currentGpa,
    gradesCount: detailed.gradesCount,
    neededTens: needed10,
    neededNines: needed9,
    neededEights: needed8,
    isAchieved: detailed.isQuarterAchieved,
    isImpossible: detailed.options.length === 0 && !detailed.isQuarterAchieved,
    explanation: detailed.quarterExplanation,
  };
}

export interface ProjectedGpaStats {
  currentGpa: number;
  projectedGpa: number;
  difference: number;
  gradedCount: number;
  targetsSetCount: number;
  achievedCount: number;
  pendingCount: number;
}

/**
 * Вычисляет предполагаемый средний балл по установленным целям предметов
 * и сопоставляет его с текущим средним баллом.
 */
export function calculateProjectedGpa(
  subjects: SubjectItem[],
  fallbackGpa: number = 0
): ProjectedGpaStats {
  const graded = subjects.filter((s) => {
    if (s.isGraded === false || s.periodType === 'none') return false;
    const lower = s.name.toLowerCase();
    if (
      s.gradingType === 'pass_fail' ||
      s.gradingType === 'none' ||
      lower.includes('искусство') ||
      lower.includes('классный час') ||
      lower.includes('информационный час')
    ) {
      return false;
    }
    return true;
  });

  if (graded.length === 0) {
    return {
      currentGpa: fallbackGpa,
      projectedGpa: fallbackGpa,
      difference: 0,
      gradedCount: 0,
      targetsSetCount: 0,
      achievedCount: 0,
      pendingCount: 0,
    };
  }

  let currentSum = 0;
  let currentCount = 0;
  let targetSum = 0;
  let targetsSetCount = 0;
  let achievedCount = 0;
  let pendingCount = 0;

  graded.forEach((s) => {
    const avg = s.currentAverage > 0 ? s.currentAverage : 0;
    if (avg > 0) {
      currentSum += avg;
      currentCount++;
    }

    if (s.targetGrade && s.targetGrade > 0) {
      targetsSetCount++;
      targetSum += s.targetGrade;
      const threshold = s.targetGrade <= 1 ? 1 : Number((s.targetGrade - 0.5).toFixed(2));
      if (avg >= threshold) {
        achievedCount++;
      } else {
        pendingCount++;
      }
    } else {
      // Если цель не задана пользователем, предполагаемой оценкой считаем ожидаемую округленную
      const expected = avg > 0 ? Math.round(avg) : 0;
      targetSum += expected > 0 ? expected : avg;
    }
  });

  const currentGpa = currentCount > 0 ? Number((currentSum / currentCount).toFixed(2)) : fallbackGpa;
  const projectedGpa = Number((targetSum / graded.length).toFixed(2));
  const difference = Number((projectedGpa - currentGpa).toFixed(2));

  return {
    currentGpa,
    projectedGpa,
    difference,
    gradedCount: graded.length,
    targetsSetCount,
    achievedCount,
    pendingCount,
  };
}
