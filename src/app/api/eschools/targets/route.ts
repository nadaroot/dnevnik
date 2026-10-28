import { NextRequest, NextResponse } from 'next/server';
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

function readAllTargets(): Record<string, Record<string, number>> {
  const preferredPath = path.join(process.cwd(), 'data', 'targets.json');
  const fallbackPath = '/tmp/eschools_targets.json';

  const targetPath = fs.existsSync(preferredPath)
    ? preferredPath
    : (fs.existsSync(fallbackPath) ? fallbackPath : null);

  if (!targetPath) return {};

  try {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Ошибка чтения targets.json:', err);
    return {};
  }
}

function writeAllTargets(data: Record<string, Record<string, number>>): void {
  const content = JSON.stringify(data, null, 2);
  const preferredPath = path.join(process.cwd(), 'data', 'targets.json');
  const fallbackPath = '/tmp/eschools_targets.json';

  try {
    const dataDir = path.dirname(preferredPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(preferredPath, content, 'utf-8');
  } catch {}

  try {
    fs.writeFileSync(fallbackPath, content, 'utf-8');
  } catch (err) {
    console.error('Ошибка записи targets.json:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const login = (searchParams.get('login') || '').trim().toLowerCase();

    if (!login) {
      return NextResponse.json(
        { success: false, error: 'Параметр login обязателен' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(`${backendUrl}/api/eschools/targets?login=${encodeURIComponent(login)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json().catch(() => ({ success: false, targets: {} }));
        return NextResponse.json(data, { status: resp.status, headers: CORS_HEADERS });
      } catch (proxyErr) {
        console.error('Ошибка проксирования GET /api/eschools/targets:', proxyErr);
      }
    }

    const all = readAllTargets();
    const userTargets = all[login] || {};
    return NextResponse.json(
      { success: true, targets: userTargets },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка сервера' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { login: rawLogin, subjectId, target, targets } = body;
    const login = (rawLogin || '').trim().toLowerCase();

    if (!login) {
      return NextResponse.json(
        { success: false, error: 'Параметр login обязателен' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const isVercel = Boolean(process.env.VERCEL);
    const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(`${backendUrl}/api/eschools/targets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json().catch(() => ({ success: false }));
        return NextResponse.json(data, { status: resp.status, headers: CORS_HEADERS });
      } catch (proxyErr) {
        console.error('Ошибка проксирования POST /api/eschools/targets:', proxyErr);
      }
    }

    const all = readAllTargets();
    if (!all[login]) {
      all[login] = {};
    }

    if (targets && typeof targets === 'object') {
      all[login] = { ...all[login], ...targets };
    } else if (subjectId) {
      if (typeof target === 'number' && target > 0) {
        all[login][subjectId] = target;
      } else {
        delete all[login][subjectId];
      }
    }

    writeAllTargets(all);

    return NextResponse.json(
      { success: true, targets: all[login] },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка сохранения' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
