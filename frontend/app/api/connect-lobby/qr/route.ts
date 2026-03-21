export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const lobbyConnectUrl = `${requestUrl.origin}/api/connect-sync`;

  // Determine the server URL for QR generation
  // Priority: NEXT_PUBLIC_QR_SERVER -> derive from WS config -> localhost:4020
  const configuredQrServer = process.env.NEXT_PUBLIC_QR_SERVER || process.env.QR_SERVER;
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL;
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST || process.env.WS_HOST;
  const wsPort = process.env.NEXT_PUBLIC_WS_PORT || process.env.WS_PORT || '4020';

  let qrServerUrl: string;

  if (configuredQrServer) {
    qrServerUrl = configuredQrServer;
  } else if (configuredWsUrl) {
    // Extract host from WS URL (e.g., ws://localhost:4020 -> http://localhost:4020)
    const wsUrlObj = new URL(configuredWsUrl);
    qrServerUrl = `http://${wsUrlObj.host}`;
  } else if (wsHost) {
    // Construct from host and port
    qrServerUrl = `http://${wsHost}:${wsPort}`;
  } else {
    // Default fallback
    qrServerUrl = `http://${requestUrl.hostname}:${wsPort}`;
  }

  // Call the server's QR endpoint
  const qrEndpointUrl = `${qrServerUrl}/api/qr?data=${encodeURIComponent(lobbyConnectUrl)}`;

  try {
    const qrResponse = await fetch(qrEndpointUrl, { cache: 'no-store' });

    if (!qrResponse.ok) {
      console.error(`[QR] Server QR generation failed with status ${qrResponse.status}`);
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
  } catch (error) {
    console.error('[QR] Server request failed:', error);
    return new Response('Failed to generate QR code', { status: 502 });
  }
}
