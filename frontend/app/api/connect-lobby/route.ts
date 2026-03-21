import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const lobbyUrl = new URL('/lobby', requestUrl.origin);

  return NextResponse.redirect(lobbyUrl, { status: 302 });
}
