import { NextRequest, NextResponse } from 'next/server';
import { getRegisteredUsers, saveRegisteredUser } from '@/lib/eschools/userRegistry';

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

export async function GET(req: NextRequest) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(`${backendUrl}/api/eschools/admin/users`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const proxyData = await resp.json().catch(() => null);
          if (proxyData && Array.isArray(proxyData.users)) {
            // Объединяем с локальными пользователями
            const localUsers = getRegisteredUsers();
            const combinedMap = new Map();
            localUsers.forEach((u) => combinedMap.set(u.login.toLowerCase(), u));
            proxyData.users.forEach((u: any) => {
              if (u && u.login) combinedMap.set(u.login.toLowerCase(), u);
            });
            return NextResponse.json(
              { success: true, users: Array.from(combinedMap.values()) },
              { headers: CORS_HEADERS }
            );
          }
        }
      } catch (err) {
        console.error('Ошибка связи с белорусским бэкендом для админки:', err);
      }
    }

    const users = getRegisteredUsers();
    return NextResponse.json(
      { success: true, users },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка загрузки пользователей' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || (!body.login && !body.studentName)) {
      return NextResponse.json(
        { success: false, error: 'Логин или имя учащегося обязательны' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const saved = saveRegisteredUser(body);

    // Если работаем с удаленным сервером в РБ, дублируем регистрацию туда
    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);
    if (backendUrl) {
      try {
        fetch(`${backendUrl}/api/eschools/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json(
      { success: true, user: saved },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка сохранения пользователя' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
