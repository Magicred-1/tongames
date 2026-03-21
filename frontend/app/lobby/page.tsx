"use client";

import { Suspense, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { useSearchParams } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useGameSocket } from '@/lib/gameSocket';

type TelegramWebApp = { initData?: string };

type JoinButtonProps = {
  hasJoined: boolean;
  syncStatus: 'connecting' | 'connected' | 'offline';
  isAuthenticated: boolean;
  onClick: () => void;
};
type TelegramAwareWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

function JoinButton({ hasJoined, syncStatus, isAuthenticated, onClick }: JoinButtonProps) {
  const isDisabled = hasJoined || syncStatus !== 'connected' || !isAuthenticated;

  if (hasJoined) {
    return (
      <div className="flex items-center gap-3 px-8 py-4 rounded-xl bg-secondary/20 border border-secondary/40 text-secondary font-headline font-bold text-lg uppercase tracking-widest">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
        Joined — Waiting...
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="relative group px-10 py-5 rounded-xl font-headline font-black text-xl uppercase tracking-widest transition-all duration-200
        bg-primary text-on-primary shadow-[0_0_40px_rgba(99,138,255,0.4)]
        hover:bg-primary/90 hover:shadow-[0_0_60px_rgba(99,138,255,0.6)] hover:scale-105
        active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
    >
      <span className="flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>
          {syncStatus === 'connecting' ? 'sync' : syncStatus === 'offline' ? 'wifi_off' : 'sports_esports'}
        </span>
        {syncStatus === 'connecting' ? 'Connecting...' : syncStatus === 'offline' ? 'Server Offline' : 'Join Game'}
      </span>
      {!isDisabled && (
        <div className="absolute inset-0 rounded-xl border-2 border-primary/50 animate-pulse pointer-events-none" />
      )}
    </button>
  );
}

const SYNC_LABELS = {
  connecting: 'CONNECTING...',
  connected: 'SYNC CONNECTED',
  offline: 'SYNC OFFLINE',
} as const;

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mesh" />}>
      <LobbyPageContent />
    </Suspense>
  );
}

function LobbyPageContent() {
  const searchParams = useSearchParams();
  const { state, send } = useGameSocket();
  const { user } = useDynamicContext();
  const playerInfo = useMemo(() => {
    if (!user) return null;
    const telegramCred = user.verifiedCredentials.find(
      (c) => c.format === 'oauth' && c.oauthProvider === 'telegram'
    );
    const blockchainCred = user.verifiedCredentials.find(
      (c) => c.format === 'blockchain'
    );
    return {
      playerAddress: blockchainCred?.address ?? telegramCred?.oauthAccountId ?? user.userId,
      displayName: telegramCred?.oauthUsername ?? undefined,
      avatarUrl: telegramCred?.oauthAccountPhotos?.[0] ?? undefined,
    };
  }, [user]);

  const hasJoined = useMemo(
    () => Boolean(playerInfo && state.players.some((p) => p.address === playerInfo.playerAddress)),
    [state.players, playerInfo]
  );

  const qrCodeUrl = useMemo(() => {
    const target = typeof window !== 'undefined'
      ? window.location.href
      : 'https://tongames.vercel.app/lobby';
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=8&data=${encodeURIComponent(target)}`;
  }, []);

  const handleJoin = useCallback(() => {
    if (!playerInfo || state.syncStatus !== 'connected') return;
    send('LOBBY_JOIN', {
      playerAddress: playerInfo.playerAddress,
      displayName: playerInfo.displayName ?? playerInfo.playerAddress,
      avatarUrl: playerInfo.avatarUrl,
    });
  }, [playerInfo, state.syncStatus, send]);

  const isTelegramWebApp = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const w = window as TelegramAwareWindow;
    const hasInitData = Boolean(w.Telegram?.WebApp?.initData);
    const fromSessionFlag = w.sessionStorage.getItem('dynamicTelegramAuth') === '1';
    const fromQueryFlag = searchParams.get('telegram') === '1';
    return hasInitData || fromSessionFlag || fromQueryFlag;
  }, [searchParams]);

  const syncStatusLabel = SYNC_LABELS[state.syncStatus];

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen overflow-hidden selection:bg-primary-container selection:text-white">
      <Header />

      {/* Main Lobby Canvas (TV View) */}
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-12 min-h-screen flex flex-col items-center justify-center relative">
        {/* Background Tech Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary-container/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10 items-start lg:items-center">
          {/* Left Panel: Jackpot & Stats */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-10 order-2 lg:order-1">
            <div className="bg-surface-container-low p-6 sm:p-8 lg:p-10 rounded-xl shadow-[0_0_40px_rgba(1,9,52,0.4)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">payments</span>
              </div>
              <p className="font-label text-outline uppercase tracking-widest mb-2">Total Prize Pool</p>
              <div className="flex items-baseline gap-3">
                <h1 className="font-headline font-black text-4xl sm:text-5xl lg:text-6xl text-secondary">4,250.00</h1>
                <span className="font-headline font-bold text-xl sm:text-2xl text-primary">TON</span>
              </div>
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex-1 bg-surface-container-highest/40 px-4 py-3 rounded-lg border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-robotomono">Lobby Entry Fee</p>
                  <p className="font-bold text-lg">0.1 TON</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-5 sm:p-8 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline font-bold text-xl sm:text-2xl uppercase tracking-tighter">Active Lobby</h3>
                <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full font-robotomono text-xs sm:text-sm">
                  {state.players.length}/4 PLAYERS
                </span>
              </div>
              <div className="space-y-4">
                {state.players.map((player) => {
                  const name = "@" + (player.displayName ?? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`);
                  const initials = name.slice(0, 2).toUpperCase();
                  return (
                    <div key={player.address} className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg hover:bg-surface-container-highest/60 transition-colors">
                      <div className="flex items-center gap-4">
                        {player.avatarUrl ? (
                          <Image
                            src={player.avatarUrl}
                            alt={name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm">{name}</p>
                          {player.classType && (
                            <p className="font-robotomono text-[10px] text-outline uppercase">{player.classType}</p>
                          )}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                    </div>
                  );
                })}
                {state.players.length === 0 && (
                  <div className="flex items-center gap-4 p-4 border border-dashed border-outline-variant/20 rounded-lg opacity-40">
                    <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs">add</span>
                    </div>
                    <p className="font-robotomono text-xs uppercase tracking-widest">Waiting for players...</p>
                  </div>
                )}
                {state.players.length > 0 && state.players.length < 8 && (
                  <div className="flex items-center gap-4 p-4 border border-dashed border-outline-variant/20 rounded-lg opacity-40">
                    <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs">add</span>
                    </div>
                    <p className="font-robotomono text-xs uppercase tracking-widest">Waiting for player...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: QR Code (The Hero) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center text-center order-1 lg:order-2">
            {isTelegramWebApp ? (
              <div className="w-full max-w-xl glass-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase italic tracking-tighter">Telegram Session Active</h2>
                  <p className="text-sm sm:text-base text-outline-variant mt-3 leading-relaxed">
                    Connected to the sync server. Press the button below to enter the lobby.
                  </p>
                </div>
                <JoinButton
                  hasJoined={hasJoined}
                  syncStatus={state.syncStatus}
                  isAuthenticated={Boolean(user)}
                  onClick={handleJoin}
                />
              </div>
            ) : (
              <>
                <div className="relative mb-8 sm:mb-12">
                  {/* Corner Accents */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                  {/* QR Wrapper */}
                  <div className="bg-surface-container-highest p-8 rounded-2xl shadow-[0_0_80px_rgba(99,138,255,0.2)]">
                    <div className="bg-white p-3 sm:p-4 rounded-xl">
                      <Image
                        src={qrCodeUrl}
                        alt="Join Lobby QR Code"
                        width={256}
                        height={256}
                        className="w-52 h-52 sm:w-64 sm:h-64"
                        unoptimized
                      />
                    </div>
                  </div>
                  {/* Scan Indicator Pulsing */}
                  <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl animate-pulse scale-110 pointer-events-none"></div>
                </div>
                <div className="space-y-6">
                  <h2 className="font-headline font-black text-3xl sm:text-4xl lg:text-5xl uppercase italic tracking-tighter">Scan to Join with your Phone</h2>
                  <p className="text-base sm:text-lg lg:text-xl text-outline-variant max-w-xl mx-auto leading-relaxed">
                    Navigate to <span className="text-primary font-bold">TONGAMES.VERCEL.APP</span>&nbsp;on your mobile browser or scan the code to initialize your warrior.
                  </p>
                  <div className="flex justify-center">
                    <JoinButton
                      hasJoined={hasJoined}
                      syncStatus={state.syncStatus}
                      isAuthenticated={Boolean(user)}
                      onClick={handleJoin}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="mt-8 sm:mt-12 lg:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-4 sm:gap-6 lg:gap-8 bg-surface-container-low/50 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4 sm:py-6 rounded-2xl border border-outline-variant/10 w-full">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-tertiary text-4xl">local_fire_department</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Current Status</p>
                  <p className="font-bold text-lg">{syncStatusLabel}</p>
                </div>
              </div>
              <div className="hidden lg:block h-12 w-[2px] bg-outline-variant/20"></div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-secondary text-4xl">stadium</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Arena Venue</p>
                  <p className="font-bold text-lg">THE NEON PIT</p>
                </div>
              </div>
              <div className="hidden lg:block h-12 w-[2px] bg-outline-variant/20"></div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-4xl">schedule</span>
                <div className="text-left">
                  <p className="font-robotomono text-xs uppercase text-outline">Sync Endpoint</p>
                  <p className="font-bold text-xs sm:text-sm max-w-[220px] truncate">{state.wsUrl ?? 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
