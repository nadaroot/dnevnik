import { DiaryData, ThemeId, SavedAccount } from './types';

const STORAGE_KEY = 'electro_dnevnik_data_v2';
const SETTINGS_KEY = 'electro_dnevnik_settings_v2';
const ACCOUNTS_KEY = 'electro_dnevnik_accounts_v2';
const THEME_KEY = 'electro_dnevnik_theme_v2';

export interface AppSettings {
  subdomain?: string;
  login: string;
  sessionCookie?: string;
  autoSyncEnabled?: boolean;
  disableBackground?: boolean;
  backgroundBlur?: boolean;
  holidayDecorEnabled?: boolean;
  onboardingCompleted?: boolean;
  notificationsEnabled?: boolean;
  autoHolidayTheme?: boolean;
  customTargets?: Record<string, number>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  subdomain: 'e-schools.by',
  login: '',
  autoSyncEnabled: true,
  disableBackground: false,
  backgroundBlur: true,
  holidayDecorEnabled: true,
  onboardingCompleted: false,
  notificationsEnabled: false,
  autoHolidayTheme: true,
  customTargets: {},
};

export function loadSavedDiaryData(): DiaryData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Ошибка загрузки данных из кэша:', e);
    return null;
  }
}

export function saveDiaryData(data: DiaryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Ошибка сохранения данных:', e);
  }
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Ошибка сохранения настроек:', e);
  }
}

// === МУЛЬТИАККАУНТИНГ ===
export function loadSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAccount(account: SavedAccount): void {
  if (typeof window === 'undefined') return;
  try {
    const accounts = loadSavedAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.id === account.id || a.login.toLowerCase() === account.login.toLowerCase()
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...account };
    } else {
      accounts.push(account);
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Ошибка сохранения аккаунта:', e);
  }
}

export function removeAccount(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const accounts = loadSavedAccounts().filter((a) => a.id !== id);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Ошибка удаления аккаунта:', e);
  }
}

const VALID_THEMES: ThemeId[] = [
  'none',
  'space',
  'halloween',
  'winter',
  'sakura',
  'emerald',
  'kupalle',
  'mothers_day',
  'victory_day',
  'belarus',
];

// === ТЕМЫ ОФОРМЛЕНИЯ ===
export function loadActiveTheme(): ThemeId {
  if (typeof window === 'undefined') return 'space';
  try {
    const theme = localStorage.getItem(THEME_KEY) as ThemeId;
    if (theme && VALID_THEMES.includes(theme)) {
      return theme;
    }
    return 'space';
  } catch {
    return 'space';
  }
}

export function saveActiveTheme(theme: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Ошибка сохранения темы:', e);
  }
}

// === ЦЕЛИ ПО ПРЕДМЕТАМ ===
export function loadCustomTargets(): Record<string, number> {
  const settings = loadSettings();
  return settings.customTargets || {};
}

export function saveCustomTarget(subjectId: string, target: number): void {
  const settings = loadSettings();
  const currentTargets = settings.customTargets || {};
  const updated = { ...currentTargets, [subjectId]: target };
  saveSettings({ ...settings, customTargets: updated });
}

export function removeCustomTarget(subjectId: string): void {
  const settings = loadSettings();
  const currentTargets = { ...(settings.customTargets || {}) };
  delete currentTargets[subjectId];
  saveSettings({ ...settings, customTargets: currentTargets });
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}
