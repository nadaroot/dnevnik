import fs from 'fs';
import path from 'path';

export interface RegisteredUserSubjectSummary {
  name: string;
  average: number;
  gradesCount: number;
  quarterGrade?: number;
}

export interface RegisteredUser {
  id: string;
  login: string;
  studentName: string;
  className: string;
  schoolName: string;
  subdomain?: string;
  overallGpa: number;
  projectedGpa?: number;
  subjectsCount: number;
  gradesCount: number;
  lastUpdated: string;
  subjectsSummary?: RegisteredUserSubjectSummary[];
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
    // Начальные демонстрационные данные, если база только создана
    const initialUsers: RegisteredUser[] = [
      {
        id: 'nadaroot',
        login: 'nadaroot',
        studentName: 'Шипалов Дмитрий',
        className: '8 «А»',
        schoolName: 'ГУО СШ №1',
        overallGpa: 8.42,
        projectedGpa: 8.85,
        subjectsCount: 14,
        gradesCount: 38,
        lastUpdated: new Date().toISOString(),
        subjectsSummary: [
          { name: 'Алгебра', average: 8.8, gradesCount: 7, quarterGrade: 9 },
          { name: 'Геометрия', average: 8.2, gradesCount: 5, quarterGrade: 8 },
          { name: 'Информатика', average: 9.6, gradesCount: 4, quarterGrade: 10 },
          { name: 'Физика', average: 8.0, gradesCount: 6, quarterGrade: 8 },
          { name: 'Химия', average: 7.8, gradesCount: 5, quarterGrade: 8 },
          { name: 'Белорусский язык', average: 8.5, gradesCount: 6, quarterGrade: 9 },
          { name: 'Русский язык', average: 8.1, gradesCount: 5, quarterGrade: 8 },
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

export function saveRegisteredUser(data: Partial<RegisteredUser> & { login: string; studentName?: string }): RegisteredUser {
  const users = getRegisteredUsers();
  const normalizedLogin = (data.login || '').trim().toLowerCase();
  const key = normalizedLogin || (data.studentName || 'user').trim().toLowerCase();

  const existingIndex = users.findIndex(
    (u) =>
      u.login.trim().toLowerCase() === normalizedLogin ||
      (data.studentName && u.studentName.trim().toLowerCase() === data.studentName.trim().toLowerCase())
  );

  const updatedEntry: RegisteredUser = {
    id: existingIndex >= 0 ? users[existingIndex].id : key,
    login: data.login || (existingIndex >= 0 ? users[existingIndex].login : key),
    studentName: data.studentName || (existingIndex >= 0 ? users[existingIndex].studentName : 'Учащийся'),
    className: data.className || (existingIndex >= 0 ? users[existingIndex].className : 'Класс не указан'),
    schoolName: data.schoolName || (existingIndex >= 0 ? users[existingIndex].schoolName : 'Школа'),
    subdomain: data.subdomain || (existingIndex >= 0 ? users[existingIndex].subdomain : undefined),
    overallGpa: typeof data.overallGpa === 'number' ? data.overallGpa : (existingIndex >= 0 ? users[existingIndex].overallGpa : 0),
    projectedGpa: typeof data.projectedGpa === 'number' ? data.projectedGpa : (existingIndex >= 0 ? users[existingIndex].projectedGpa : undefined),
    subjectsCount: typeof data.subjectsCount === 'number' ? data.subjectsCount : (existingIndex >= 0 ? users[existingIndex].subjectsCount : 0),
    gradesCount: typeof data.gradesCount === 'number' ? data.gradesCount : (existingIndex >= 0 ? users[existingIndex].gradesCount : 0),
    lastUpdated: new Date().toISOString(),
    subjectsSummary: data.subjectsSummary || (existingIndex >= 0 ? users[existingIndex].subjectsSummary : []),
  };

  if (existingIndex >= 0) {
    users[existingIndex] = updatedEntry;
  } else {
    users.push(updatedEntry);
  }

  saveRegisteredUsersList(users);
  return updatedEntry;
}
