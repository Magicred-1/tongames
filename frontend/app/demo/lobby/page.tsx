"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

// ── Mock players ───────────────────────────────────────────────────────────────
const MOCK_PLAYERS = [
  { id: 'me',  name: 'NexusNode',  initials: 'NE', color: 'from-primary to-primary-container',     cls: 'TITAN'       },
  { id: 'p1',  name: 'CryptoWolf', initials: 'CW', color: 'from-tertiary to-tertiary-container',   cls: 'SPELLWEAVER' },
  { id: 'p2',  name: 'ShadowByte', initials: 'SB', color: 'from-secondary to-secondary-container', cls: 'SHADOW'      },
  { id: 'p3',  name: 'IronFist',   initials: 'IF', color: 'from-primary to-primary-container',     cls: 'TITAN'       },
];

const COUNTDOWN_FROM = 5;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ──────────────────────────────────────────────────────────────────
export default function DemoLobbyPage() {
  const router = useRouter();
  const [joined,    setJoined]    = useState<typeof MOCK_PLAYERS>([]);
  const [phase,     setPhase]     = useState<'filling' | 'found' | 'countdown' | 'launching'>('filling');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      // Players join one by one
      for (const player of MOCK_PLAYERS) {
        await wait(700);
        setJoined(prev => [...prev, player]);
      }

      // Match found
      await wait(500);
      setPhase('found');
      await wait(1000);
      setPhase('countdown');

      // Countdown
      for (let i = COUNTDOWN_FROM; i >= 1; i--) {
        setCountdown(i);
        await wait(1000);
      }
      setPhase('launching');
      await wait(400);
      router.push('/demo/arena');
    }

    run();
  }, [router]);

  const isFull     = joined.length === MOCK_PLAYERS.length;
  const isFound    = phase === 'found' || phase === 'countdown' || phase === 'launching';
  const isCountdown = phase === 'countdown' || phase === 'launching';

  // countdown ring progress
  const radius  = 44;
  const circ    = 2 * Math.PI * radius;
  const progress = isCountdown ? ((countdown - 1) / COUNTDOWN_FROM) * circ : circ;

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen overflow-hidden selection:bg-primary-container selection:text-white">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-12 min-h-screen flex flex-col items-center justify-center relative">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary-container/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/10 blur-[100px] rounded-full" />
        </div>

        {/* Demo badge */}
        <div className="absolute top-24 right-4 sm:right-6 lg:right-12 flex items-center gap-2 bg-tertiary/10 border border-tertiary/30 rounded-full px-3 py-1.5 z-20">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          <span className="font-robotomono text-[10px] text-tertiary uppercase tracking-widest">Demo Mode</span>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10 items-start lg:items-center">

          {/* Left: Prize pool + player list */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-10 order-2 lg:order-1">
            {/* Prize pool */}
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-xl shadow-[0_0_40px_rgba(1,9,52,0.4)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">payments</span>
              </div>
              <p className="font-label text-outline uppercase tracking-widest mb-2">Total Prize Pool</p>
              <div className="flex items-baseline gap-3">
                <h1 className="font-headline font-black text-4xl sm:text-5xl lg:text-6xl text-secondary">0.04</h1>
                <span className="font-headline font-bold text-xl sm:text-2xl text-primary">TON</span>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-surface-container-highest/40 px-4 py-3 rounded-lg border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-robotomono">Entry Fee</p>
                  <p className="font-bold text-lg">0.01 TON</p>
                </div>
                <div className="bg-surface-container-highest/40 px-4 py-3 rounded-lg border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-robotomono">Max Players</p>
                  <p className="font-bold text-lg">4</p>
                </div>
              </div>
            </div>

            {/* Active lobby */}
            <div className="bg-surface-container-low p-5 sm:p-8 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline font-bold text-xl sm:text-2xl uppercase tracking-tighter">Active Lobby</h3>
                <span className={`px-3 py-1 rounded-full font-robotomono text-xs sm:text-sm transition-all ${
                  isFull ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                }`}>
                  {joined.length}/4 PLAYERS
                </span>
              </div>

              <div className="space-y-3">
                {joined.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg animate-[fadeIn_0.4s_ease]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-on-primary font-bold text-xs`}>
                        {p.initials}
                      </div>
                      <div>
                        <p className="font-bold text-sm">@{p.name}</p>
                        <p className="font-robotomono text-[10px] text-outline uppercase">{p.cls}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 4 - joined.length) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-dashed border-outline-variant/20 rounded-lg opacity-40">
                    <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">person_add</span>
                    </div>
                    <p className="font-robotomono text-xs uppercase tracking-widest">Waiting for player…</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Hero panel */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center text-center order-1 lg:order-2 gap-8">

            {!isFound ? (
              /* Waiting state */
              <div className="w-full max-w-xl glass-panel p-8 sm:p-12 rounded-2xl flex flex-col items-center gap-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary animate-pulse">sports_esports</span>
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                </div>
                <div>
                  <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase italic tracking-tighter">Finding Warriors…</h2>
                  <p className="text-outline mt-3 font-robotomono text-sm">
                    {joined.length < 4
                      ? `${joined.length} of 4 players joined`
                      : 'All players ready!'}
                  </p>
                </div>
                {/* Progress dots */}
                <div className="flex gap-3">
                  {MOCK_PLAYERS.map((p, i) => (
                    <div
                      key={p.id}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < joined.length ? 'bg-secondary scale-110' : 'bg-outline/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Match found + countdown */
              <div className="w-full max-w-xl glass-panel p-8 sm:p-12 rounded-2xl flex flex-col items-center gap-8 border border-secondary/30 shadow-[0_0_60px_rgba(125,255,162,0.1)]">
                <div className="flex flex-col items-center gap-2">
                  <span className="font-label text-secondary uppercase tracking-[0.3em] text-sm animate-pulse">Match Found</span>
                  <h2 className="font-headline font-black text-4xl sm:text-5xl uppercase italic tracking-tighter text-white">BATTLE READY!</h2>
                  <p className="text-outline font-robotomono text-sm mt-1">All 4 warriors have entered the arena</p>
                </div>

                {/* Countdown ring */}
                {isCountdown && (
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(99,138,255,0.15)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke="rgb(99,138,255)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={progress}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <span className="font-headline font-black text-5xl text-white relative z-10">{countdown}</span>
                  </div>
                )}

                <p className="font-robotomono text-outline text-sm">
                  {phase === 'launching' ? 'Entering the arena…' : `Entering arena in ${countdown}s`}
                </p>

                {/* Player chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {MOCK_PLAYERS.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-[8px] font-bold text-on-primary`}>
                        {p.initials}
                      </div>
                      <span className="font-bold text-xs">@{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 items-stretch gap-4 bg-surface-container-low/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-outline-variant/10 w-full max-w-xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary text-3xl">local_fire_department</span>
                <div className="text-left">
                  <p className="font-robotomono text-[9px] uppercase text-outline">Status</p>
                  <p className="font-bold text-sm">SYNC CONNECTED</p>
                </div>
              </div>
              <div className="hidden sm:block w-[1px] bg-outline-variant/20 self-stretch" />
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-3xl">stadium</span>
                <div className="text-left">
                  <p className="font-robotomono text-[9px] uppercase text-outline">Arena</p>
                  <p className="font-bold text-sm">THE NEON PIT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
