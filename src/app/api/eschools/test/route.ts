import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  const isVercel = Boolean(process.env.VERCEL);
  const backendUrl = process.env.BACKEND_API_URL || (isVercel ? 'https://suspose.tailcfe40a.ts.net' : null);

  let backendStatus = 'direct_server';
  if (backendUrl) {
    try {
      const resp = await fetch(`${backendUrl}/api/eschools/test`, {
        cache: 'no-store',
      });
      backendStatus = resp.ok ? 'connected' : `http_${resp.status}`;
    } catch (e: any) {
      backendStatus = `error: ${e.message}`;
    }
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: isVercel ? 'electro-dnevnik-vercel' : 'electro-dnevnik-api',
      backendStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { headers: CORS_HEADERS }
  );
}
