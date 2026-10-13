import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GradeBadgeStyle {
  bg: string;
  text: string;
  border: string;
  toString: () => string;
}

/**
 * Оформление фоновой подложки для оценок:
 * - 8 – 10: белый плотный фон, черный текст (для красоты и максимальной контрастности)
 * - 5 – 7: плотный матовый желтый фон, черный текст
 * - 1 – 4: плотный матовый красный фон, белый текст
 */
export function getGradeBadgeClasses(grade: number): GradeBadgeStyle {
  if (grade >= 8) {
    const s = { bg: 'bg-white', text: 'text-zinc-950', border: 'border-zinc-200' };
    return { ...s, toString: () => `${s.bg} ${s.text} ${s.border}` };
  }
  if (grade >= 5) {
    const s = { bg: 'bg-yellow-400', text: 'text-zinc-950', border: 'border-yellow-500' };
    return { ...s, toString: () => `${s.bg} ${s.text} ${s.border}` };
  }
  const s = { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' };
  return { ...s, toString: () => `${s.bg} ${s.text} ${s.border}` };
}

export function formatDateRu(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  } catch {
    return dateStr;
  }
}
