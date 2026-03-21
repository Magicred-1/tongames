export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const lobbyConnectUrl = `${requestUrl.origin}/api/connect-sync`;
  const qrProviderUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(lobbyConnectUrl)}`;

  const qrResponse = await fetch(qrProviderUrl, { cache: 'no-store' });

  if (!qrResponse.ok) {
    return new Response('Failed to generate QR code', { status: 502 });
  }

  const qrBuffer = await qrResponse.arrayBuffer();
  const contentType = qrResponse.headers.get('content-type') || 'image/png';

  return new Response(qrBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
    status: 200,
  });
}
