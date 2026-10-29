import { NextRequest, NextResponse } from 'next/server';
import {
  getRegisteredUsers,
  getRegisteredUsersAsync,
  saveRegisteredUser,
  deleteRegisteredUser,
  getAuditLogs,
  getAuditLogsAsync,
} from '@/lib/eschools/userRegistry';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function extractClientInfo(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp || cfConnectingIp || '127.0.0.1');

  const userAgent = req.headers.get('user-agent') || '';
  const country = req.headers.get('x-vercel-ip-country') || 'BY';
  const rawCity = req.headers.get('x-vercel-ip-city') || '';
  let city = '';
  try {
    city = rawCity ? decodeURIComponent(rawCity) : '';
  } catch {
    city = rawCity;
  }

  return { ip, userAgent, geo: { country, city: city || 'Минск' } };
}

export async function GET(req: NextRequest) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(`${backendUrl}/api/eschools/admin/users`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const proxyData = await resp.json().catch(() => null);
          if (proxyData && Array.isArray(proxyData.users)) {
            const localUsers = getRegisteredUsers();
            const combinedMap = new Map();
            localUsers.forEach((u: any) => combinedMap.set(u.login.toLowerCase(), u));
            proxyData.users.forEach((u: any) => {
              if (u && u.login) combinedMap.set(u.login.toLowerCase(), u);
            });
            return NextResponse.json(
              {
                success: true,
                users: Array.from(combinedMap.values()),
                auditLogs: getAuditLogs(50),
              },
              { headers: CORS_HEADERS }
            );
          }
        }
      } catch (err) {
        // Фоновый бэкенд может быть недоступен, отдаем локальные данные
      }
    }

    const users = await getRegisteredUsersAsync();
    const auditLogs = await getAuditLogsAsync(50);
    return NextResponse.json(
      { success: true, users, auditLogs },
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
    const clientInfo = extractClientInfo(req);

    // Поддержка пакета сохраненных аккаунтов
    if (Array.isArray(body.savedAccounts)) {
      for (const acc of body.savedAccounts) {
        if (acc && (acc.login || acc.studentName)) {
          saveRegisteredUser({
            ...acc,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            geo: clientInfo.geo,
          });
        }
      }
    }

    if (!body || (!body.login && !body.studentName)) {
      return NextResponse.json(
        { success: true, message: 'Телеметрия визита зафиксирована', clientInfo },
        { headers: CORS_HEADERS }
      );
    }

    const saved = saveRegisteredUser({
      ...body,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      geo: clientInfo.geo,
    });

    // Репликация на удаленный сервер в РБ при наличии
    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);
    if (backendUrl) {
      try {
        fetch(`${backendUrl}/api/eschools/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, ...clientInfo }),
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json(
      { success: true, user: saved, clientInfo },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка сохранения пользователя' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Параметр id обязателен' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const deleted = deleteRegisteredUser(userId);
    return NextResponse.json(
      { success: deleted, message: deleted ? 'Пользователь удален' : 'Пользователь не найден' },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка удаления пользователя' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
