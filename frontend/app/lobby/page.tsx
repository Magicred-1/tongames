"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { useSearchParams } from 'next/navigation';

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mesh" />}>
      <LobbyPageContent />
    </Suspense>
  );
}

function LobbyPageContent() {
  const searchParams = useSearchParams();
  const [syncStatus, setSyncStatus] = useState('connecting' as 'connecting' | 'connected' | 'offline');

  const websocketUrl = useMemo(() => {
    const fromQuery = searchParams.get('ws');
    if (fromQuery) return fromQuery;

    if (globalThis.window === undefined) return null;
    const protocol = globalThis.window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${globalThis.window.location.hostname}:4020`;
  }, [searchParams]);

  const effectiveSyncStatus = websocketUrl ? syncStatus : 'offline';

  let syncStatusLabel = 'SYNC OFFLINE';
  if (effectiveSyncStatus === 'connected') {
    syncStatusLabel = 'SYNC CONNECTED';
  } else if (effectiveSyncStatus === 'connecting') {
    syncStatusLabel = 'CONNECTING...';
  }

  useEffect(() => {
    if (!websocketUrl) return;

    let active = true;
    const socket = new WebSocket(websocketUrl);

    socket.onopen = () => {
      if (active) setSyncStatus('connected');
    };

    socket.onerror = () => {
      if (active) setSyncStatus('offline');
    };

    socket.onclose = () => {
      if (active) setSyncStatus('offline');
    };

    return () => {
      active = false;
      socket.close();
    };
  }, [websocketUrl]);

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen overflow-hidden selection:bg-primary-container selection:text-white">
      <Header />

      {/* Main Lobby Canvas (TV View) */}
      <main className="pt-24 pb-32 px-12 h-screen flex flex-col items-center justify-center relative">
        {/* Background Tech Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary-container/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-12 gap-12 relative z-10 items-center">
          {/* Left Panel: Jackpot & Stats */}
          <div className="col-span-4 flex flex-col gap-10">
            <div className="bg-surface-container-low p-10 rounded-xl shadow-[0_0_40px_rgba(1,9,52,0.4)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">payments</span>
              </div>
              <p className="font-label text-outline uppercase tracking-widest mb-2">Total Prize Pool</p>
              <div className="flex items-baseline gap-3">
                <h1 className="font-headline font-black text-6xl text-secondary">4,250.00</h1>
                <span className="font-headline font-bold text-2xl text-primary">TON</span>
              </div>
              <div className="mt-8 flex gap-4">
                <div className="flex-1 bg-surface-container-highest/40 px-4 py-3 rounded-lg border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-robotomono">Min Bet</p>
                  <p className="font-headline font-bold text-xl">5 TON</p>
                </div>
                <div className="flex-1 bg-surface-container-highest/40 px-4 py-3 rounded-lg border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-robotomono">Max Bet</p>
                  <p className="font-headline font-bold text-xl">100 TON</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-8 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline font-bold text-2xl uppercase tracking-tighter">Active Lobby</h3>
                <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full font-robotomono text-sm">3/8 PLAYERS</span>
              </div>
              <div className="space-y-4">
                {/* Player Row 1 */}
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg group hover:bg-surface-container-highest/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary font-bold">JD</div>
                    <div>
                      <p className="font-bold text-sm">Joz_Doge.ton</p>
                      <p className="font-robotomono text-[10px] text-outline">EQCv...9sA2</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </div>
                {/* Player Row 2 */}
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg group hover:bg-surface-container-highest/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tertiary to-tertiary-container flex items-center justify-center text-on-tertiary font-bold">KX</div>
                    <div>
                      <p className="font-bold text-sm">KingX.ton</p>
                      <p className="font-robotomono text-[10px] text-outline">EQA4...xP11</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </div>
                {/* Player Row 3 */}
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg group hover:bg-surface-container-highest/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-fixed to-secondary-fixed-dim flex items-center justify-center text-on-secondary font-bold">NA</div>
                    <div>
                      <p className="font-bold text-sm">Nebula.eth</p>
                      <p className="font-robotomono text-[10px] text-outline">EQD0...fG7b</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </div>
                {/* Empty Slot */}
                <div className="flex items-center gap-4 p-4 border border-dashed border-outline-variant/20 rounded-lg opacity-40">
                  <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xs">add</span>
                  </div>
                  <p className="font-robotomono text-xs uppercase tracking-widest">Waiting for player...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: QR Code (The Hero) */}
          <div className="col-span-8 flex flex-col items-center justify-center text-center">
            <div className="relative mb-12">
              {/* Corner Accents */}
              <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
              <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
              {/* QR Wrapper */}
              <div className="bg-surface-container-highest p-8 rounded-2xl shadow-[0_0_80px_rgba(99,138,255,0.2)]">
                <div className="bg-white p-4 rounded-xl">
                  <Image
                    src="/assets/lobby_preview.webp"
                    alt="Join Lobby QR Code"
                    width={256}
                    height={256}
                    className="w-64 h-64"
                  />
                </div>
              </div>
              {/* Scan Indicator Pulsing */}
              <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl animate-pulse scale-110 pointer-events-none"></div>
            </div>
            <div className="space-y-4">
              <h2 className="font-headline font-black text-5xl uppercase italic tracking-tighter">Scan to Join with your Phone</h2>
              <p className="text-xl text-outline-variant max-w-xl mx-auto leading-relaxed">
                Navigate to <span className="text-primary font-bold">TONGAMES.XYZ</span>&nbsp;on your mobile browser or scan the code to initialize your warrior.
              </p>
            </div>
            <div className="mt-16 flex items-center gap-8 bg-surface-container-low/50 backdrop-blur-md px-8 py-6 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-tertiary text-4xl">local_fire_department</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Current Status</p>
                  <p className="font-bold text-lg">{syncStatusLabel}</p>
                </div>
              </div>
              <div className="h-12 w-[2px] bg-outline-variant/20"></div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-secondary text-4xl">stadium</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Arena Venue</p>
                  <p className="font-bold text-lg">THE NEON PIT</p>
                </div>
              </div>
              <div className="h-12 w-[2px] bg-outline-variant/20"></div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-4xl">schedule</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Sync Endpoint</p>
                  <p className="font-bold text-lg text-xs max-w-[220px] truncate">{websocketUrl || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
