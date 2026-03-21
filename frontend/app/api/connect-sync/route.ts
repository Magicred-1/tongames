import { NextResponse } from 'next/server';

function getWebsocketUrl(requestUrl: URL) {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL;
  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  const protocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.NEXT_PUBLIC_WS_HOST || process.env.WS_HOST || requestUrl.hostname;
  const port = process.env.NEXT_PUBLIC_WS_PORT || process.env.WS_PORT || '4020';
  const path = process.env.NEXT_PUBLIC_WS_PATH || process.env.WS_PATH || '';

  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path;
  return `${protocol}//${host}:${port}${normalizedPath}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const wsUrl = getWebsocketUrl(requestUrl);

  const lobbyUrl = new URL('/lobby', requestUrl.origin);
  lobbyUrl.searchParams.set('ws', wsUrl);

  return NextResponse.redirect(lobbyUrl, { status: 302 });
}
