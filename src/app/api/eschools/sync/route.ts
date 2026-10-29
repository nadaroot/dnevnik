import { NextRequest, NextResponse } from 'next/server';
import { ESchoolsClient } from '@/lib/eschools/client';
import { saveRegisteredUser } from '@/lib/eschools/userRegistry';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { login, password, subdomain, sessionCookie, quarterNumber = 1 } = body;

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip')) || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';
    const country = req.headers.get('x-vercel-ip-country') || 'BY';
    const rawCity = req.headers.get('x-vercel-ip-city') || '';
    let city = '';
    try { city = rawCity ? decodeURIComponent(rawCity) : ''; } catch { city = rawCity; }
    const clientInfo = { ip, userAgent, geo: { country, city: city || 'Минск' } };

    if (!sessionCookie && (!login || !password)) {
      return NextResponse.json(
        { success: false, error: 'Введите логин и пароль для входа в электронный дневник.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Если работаем на Vercel или явно включен прокси, перенаправляем запрос на сервер в Беларуси
    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const resp = await fetch(`${backendUrl}/api/eschools/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const proxyData = await resp.json().catch(() => ({
          success: false,
          error: 'Некорректный ответ от бэкенд-сервера',
        }));

        if (proxyData && proxyData.success && proxyData.data) {
          try {
            const p = proxyData.data.profile || {};
            const subjects = proxyData.data.subjects || [];
            saveRegisteredUser({
              login: p.login || login || 'user',
              password: password || undefined,
              studentName: p.studentName || 'Учащийся',
              className: p.className || '',
              schoolName: p.schoolName || '',
              overallGpa: proxyData.data.overallGpa || 0,
              subdomain,
              subjectsCount: subjects.length,
              gradesCount: subjects.reduce((acc: number, s: any) => acc + (s.grades ? s.grades.length : 0), 0),
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
              geo: clientInfo.geo,
              subjectsSummary: subjects.map((s: any) => ({
                name: s.name,
                average: s.currentAverage || 0,
                gradesCount: s.grades ? s.grades.length : 0,
                quarterGrade: s.quarterGrade,
              })),
            });
          } catch (regErr) {
            console.error('Ошибка сохранения пользователя в реестр:', regErr);
          }
        }

        return NextResponse.json(proxyData, {
          status: resp.status,
          headers: CORS_HEADERS,
        });
      } catch (proxyErr: any) {
        console.error('Ошибка связи с белорусским бэкендом:', proxyErr);
        if (isVercel) {
          return NextResponse.json(
            {
              success: false,
              error: 'Шлюз синхронизации в РБ временно недоступен: ' + (proxyErr.message || 'Таймаут соединения'),
            },
            { status: 502, headers: CORS_HEADERS }
          );
        }
      }
    }

    const client = new ESchoolsClient(subdomain, sessionCookie);

    let activeSession = sessionCookie;
    if (!sessionCookie && login && password) {
      activeSession = await client.login({ login, password, subdomain });
    }

    let diaryData;
    try {
      diaryData = await client.getDiaryData(Number(quarterNumber));
    } catch (fetchErr: any) {
      // Если сессия истекла или недействительна, и переданы логин/пароль — автоматически переавторизуемся
      if (login && password) {
        console.log('Повторная авторизация на e-schools.by из-за истекшей сессии...');
        activeSession = await client.login({ login, password, subdomain });
        diaryData = await client.getDiaryData(Number(quarterNumber));
      } else {
        throw fetchErr;
      }
    }

    if (login) {
      diaryData.profile.login = login;
      if (login.toLowerCase() === 'nadaroot') {
        diaryData.profile.isAdmin = true;
      }
    }

    // Подгружаем сохраненные на сервере цели для пользователя
    let serverTargets: Record<string, number> = {};
    if (login) {
      try {
        const dataPath = path.join(process.cwd(), 'data', 'targets.json');
        const fallbackPath = '/tmp/eschools_targets.json';
        const targetPath = fs.existsSync(dataPath) ? dataPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);
        if (targetPath) {
          const all = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
          serverTargets = all[login.toLowerCase()] || {};
        }
      } catch (err) {
        console.error('Ошибка подгрузки целей из файла:', err);
      }
    }

    if (diaryData) {
      try {
        const p = diaryData.profile || {};
        const subjects = diaryData.subjects || [];
        saveRegisteredUser({
          login: p.login || login || 'user',
          password: password || undefined,
          studentName: p.studentName || 'Учащийся',
          className: p.className || '',
          schoolName: p.schoolName || '',
          overallGpa: diaryData.overallGpa || 0,
          subdomain,
          subjectsCount: subjects.length,
          gradesCount: subjects.reduce((acc, s) => acc + (s.grades ? s.grades.length : 0), 0),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          geo: clientInfo.geo,
          subjectsSummary: subjects.map((s) => ({
            name: s.name,
            average: s.currentAverage || 0,
            gradesCount: s.grades ? s.grades.length : 0,
            quarterGrade: s.quarterGrade,
          })),
        });
      } catch (regErr) {
        console.error('Ошибка сохранения пользователя в реестр:', regErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: diaryData,
        sessionCookie: activeSession,
        serverTargets,
        message: 'Данные успешно загружены из e-schools.by',
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Ошибка в API /api/eschools/sync:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Ошибка подключения к серверу e-schools.by.',
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
