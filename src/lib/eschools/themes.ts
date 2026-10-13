import { ThemeId } from './types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  accentColor: string;
  accentHover: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  glowColor: string;
  particleColor: string;
  ambientLight: string;
  isNone?: boolean;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  none: {
    id: 'none',
    name: 'Без фона (Pure OLED)',
    subtitle: '100% глубокий черный OLED вакуум, без анимаций и нагрузок',
    accentColor: '#e4e4e7',
    accentHover: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.1)',
    badgeText: '#f4f4f5',
    cardBg: 'rgba(9, 9, 11, 0.95)',
    cardBorder: 'rgba(39, 39, 42, 0.8)',
    glowColor: 'transparent',
    particleColor: 'transparent',
    ambientLight: 'transparent',
    isNone: true,
  },
  space: {
    id: 'space',
    name: 'OLED Космос',
    subtitle: 'Глубокий вакуум, плавающие созвездия и звездная пыль',
    accentColor: '#f4f4f5',
    accentHover: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeText: '#f4f4f5',
    cardBg: 'rgba(9, 9, 11, 0.85)',
    cardBorder: 'rgba(39, 39, 42, 0.9)',
    glowColor: 'rgba(255, 255, 255, 0.15)',
    particleColor: '#ffffff',
    ambientLight: 'transparent',
  },
  kupalle: {
    id: 'kupalle',
    name: 'Купалье',
    subtitle: 'Купальская ночь, папараць-кветка, светлячки и венки',
    accentColor: '#10b981',
    accentHover: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#a7f3d0',
    cardBg: 'rgba(6, 18, 14, 0.88)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    particleColor: '#34d399',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(5, 150, 105, 0.14), transparent 70%)',
  },
  mothers_day: {
    id: 'mothers_day',
    name: 'День матери (14 октября)',
    subtitle: 'Теплый свет, нежные лепестки роз и атмосфера заботы',
    accentColor: '#ec4899',
    accentHover: '#f472b6',
    badgeBg: 'rgba(236, 72, 153, 0.18)',
    badgeText: '#fbcfe8',
    cardBg: 'rgba(22, 10, 18, 0.88)',
    cardBorder: 'rgba(236, 72, 153, 0.35)',
    glowColor: 'rgba(236, 72, 153, 0.22)',
    particleColor: '#fbcfe8',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(219, 39, 119, 0.14), transparent 70%)',
  },
  winter: {
    id: 'winter',
    name: 'Новый Год',
    subtitle: 'Морозная зима, плавно падающие снежинки и ледяное сияние',
    accentColor: '#38bdf8',
    accentHover: '#7dd3fc',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeText: '#bae6fd',
    cardBg: 'rgba(8, 14, 26, 0.88)',
    cardBorder: 'rgba(56, 189, 248, 0.32)',
    glowColor: 'rgba(56, 189, 248, 0.22)',
    particleColor: '#e0f2fe',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(14, 116, 144, 0.15), transparent 70%)',
  },
  halloween: {
    id: 'halloween',
    name: 'Хэллоуин',
    subtitle: 'Зловещая ночь, парящие тыквы, призрачные огни и летучие мыши',
    accentColor: '#f97316',
    accentHover: '#fb923c',
    badgeBg: 'rgba(249, 115, 22, 0.18)',
    badgeText: '#fdba74',
    cardBg: 'rgba(15, 10, 20, 0.88)',
    cardBorder: 'rgba(249, 115, 22, 0.35)',
    glowColor: 'rgba(249, 115, 22, 0.25)',
    particleColor: '#fb923c',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(120, 40, 200, 0.12), transparent 70%)',
  },
  victory_day: {
    id: 'victory_day',
    name: 'День Победы (9 Мая)',
    subtitle: 'Праздничный салют, рубиновые искры и память героев',
    accentColor: '#ef4444',
    accentHover: '#f87171',
    badgeBg: 'rgba(239, 68, 68, 0.18)',
    badgeText: '#fca5a5',
    cardBg: 'rgba(20, 8, 8, 0.88)',
    cardBorder: 'rgba(239, 68, 68, 0.35)',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    particleColor: '#f59e0b',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.14), transparent 70%)',
  },
  belarus: {
    id: 'belarus',
    name: 'Беларусь',
    subtitle: 'Национальный белорусский стиль, васильки и символы',
    accentColor: '#22c55e',
    accentHover: '#4ade80',
    badgeBg: 'rgba(34, 197, 94, 0.18)',
    badgeText: '#bbf7d0',
    cardBg: 'rgba(10, 20, 14, 0.88)',
    cardBorder: 'rgba(34, 197, 94, 0.35)',
    glowColor: 'rgba(34, 197, 94, 0.22)',
    particleColor: '#86efac',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.12), transparent 70%)',
  },
  sakura: {
    id: 'sakura',
    name: 'Сакура',
    subtitle: 'Лепестки японской вишни, кружащиеся в ночном киберпространстве',
    accentColor: '#f472b6',
    accentHover: '#f687b3',
    badgeBg: 'rgba(244, 114, 182, 0.18)',
    badgeText: '#fbcfe8',
    cardBg: 'rgba(20, 10, 18, 0.88)',
    cardBorder: 'rgba(244, 114, 182, 0.35)',
    glowColor: 'rgba(244, 114, 182, 0.22)',
    particleColor: '#fbcfe8',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(219, 39, 119, 0.12), transparent 70%)',
  },
  emerald: {
    id: 'emerald',
    name: 'Кибер Изумруд',
    subtitle: 'Матричный стиль, неоновые линии и цифровой изумрудный поток',
    accentColor: '#10b981',
    accentHover: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#a7f3d0',
    cardBg: 'rgba(6, 18, 14, 0.88)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    particleColor: '#34d399',
    ambientLight: 'radial-gradient(circle at 50% 0%, rgba(5, 150, 105, 0.14), transparent 70%)',
  },
};

export const THEMES_LIST = Object.values(THEMES);

export function getTheme(id?: ThemeId | null): ThemeConfig {
  if (id && THEMES[id]) {
    return THEMES[id];
  }
  return THEMES.space;
}
