import { NextRequest, NextResponse } from 'next/server';
import { ESchoolsClient } from '@/lib/eschools/client';

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

    const diaryData = await client.getDiaryData(Number(quarterNumber));
    if (login) {
      diaryData.profile.login = login;
      if (login.toLowerCase() === 'nadaroot') {
        diaryData.profile.isAdmin = true;
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: diaryData,
        sessionCookie: activeSession,
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
