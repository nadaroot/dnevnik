export async function onRequest(context: any) {
  const backendUrl = context.env.BACKEND_API_URL || 'https://suspose.tailcfe40a.ts.net';
  let backendStatus = 'unknown';

  try {
    const resp = await fetch(`${backendUrl}/api/eschools/test`, { method: 'GET' });
    backendStatus = resp.ok ? 'connected' : `http_${resp.status}`;
  } catch (e: any) {
    backendStatus = `error: ${e.message}`;
  }

  return new Response(
    JSON.stringify({
      success: true,
      edge: 'Cloudflare Pages Active',
      backendUrl,
      backendStatus,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
