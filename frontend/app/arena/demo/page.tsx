"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dice } from '@/components/Dice';
import Header from '@/components/Header';

// ── Types ───────────────────────────────────────────────────────────────────────
type Phase = 'LOBBY' | 'COMMIT' | 'REVEAL' | 'RESOLVE' | 'DONE';

interface DemoPlayer {
  id: string;
  name: string;
  cls: 0 | 1 | 2;
  hp: number;
  alive: boolean;
  committed: boolean;
  revealed: boolean;
}

interface LogEntry { id: number; text: string; type: 'info' | 'crit' | 'hit' | 'elim' | 'win' }
interface DiceInfo  { rolling: boolean; value: number; diceMax: number }

// ── Static data ─────────────────────────────────────────────────────────────────
const CLS = {
  0: { name: 'TITAN',       icon: 'shield',         color: 'primary'   },
  1: { name: 'SPELLWEAVER', icon: 'auto_fix_high',  color: 'tertiary'  },
  2: { name: 'SHADOW',      icon: 'visibility_off', color: 'secondary' },
} as const;

const INIT: DemoPlayer[] = [
  { id: 'me', name: 'NexusNode',  cls: 0, hp: 100, alive: true, committed: false, revealed: false },
  { id: 'p1', name: 'CryptoWolf', cls: 1, hp: 100, alive: true, committed: false, revealed: false },
  { id: 'p2', name: 'ShadowByte', cls: 2, hp: 100, alive: true, committed: false, revealed: false },
  { id: 'p3', name: 'IronFist',   cls: 0, hp: 100, alive: true, committed: false, revealed: false },
];

// [attacker, target, roll, diceMax, damage, isCrit]
type Attack = [string, string, number, number, number, boolean];
const SCRIPT: Attack[][] = [
  [
    ['me', 'p1',  9, 10, 18, false],
    ['p1', 'p2', 11, 14, 28, true ],
    ['p2', 'p3',  8, 10, 16, false],
    ['p3', 'me', 10, 10, 22, false],
  ],
  [
    ['me', 'p2', 10, 10, 25, false],
    ['p1', 'p3', 13, 14, 35, true ],
    ['p2', 'me',  6, 10, 12, false],
    ['p3', 'p1',  9, 10, 18, false],
  ],
  [
    ['me', 'p1', 10, 10, 55, true ],
    ['p2', 'p3',  8, 10, 45, false],
  ],
];

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ───────────────────────────────────────────────────────────────────
export default function ArenaDemoPage() {
  const [round,    setRound]    = useState(0);
  const [phase,    setPhase]    = useState<Phase>('LOBBY');
  const [players,  setPlayers]  = useState<DemoPlayer[]>(INIT.map(p => ({ ...p })));
  const [myTarget, setMyTarget] = useState<string | null>(null);
  const [diceMap,  setDiceMap]  = useState<Record<string, DiceInfo>>({});
  const [log,      setLog]      = useState<LogEntry[]>([]);
  const [winner,   setWinner]   = useState<string | null>(null);
  const [key,      setKey]      = useState(0);       // bump to restart
  const logId   = useRef(0);
  const running = useRef(false);
  const logEnd  = useRef<HTMLDivElement>(null);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLog(prev => [...prev, { id: logId.current++, text, type }]);
  }, []);

  // const patchDice = useCallback((id: string, patch: Partial<DiceInfo>) => {
  //   setDiceMap(prev => ({ rolling: false, value: 0, diceMax: 10, ...prev[id], ...patch, } as unknown as Record<string, DiceInfo> & DiceInfo,
  //     { ...prev, [id]: { rolling: false, value: 0, diceMax: 10, ...prev[id], ...patch } })[1]);
  // }, []);

  // scroll log to bottom
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  const runDemo = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    let st = INIT.map(p => ({ ...p }));
    logId.current = 0;
    setPlayers(st.map(p => ({ ...p })));
    setLog([]);
    setDiceMap({});
    setMyTarget(null);
    setWinner(null);
    setRound(0);

    // ── LOBBY ─────────────────────────────────────────────────────────────────
    setPhase('LOBBY');
    addLog('Room created. Waiting for players…');
    for (const p of st) {
      await wait(400);
      addLog(`${p.name} joined the arena`);
    }
    await wait(700);
    addLog('All players ready — starting round 1!');
    await wait(500);

    for (let r = 0; r < SCRIPT.length; r++) {
      const rNum = r + 1;
      setRound(rNum);

      // ── COMMIT ───────────────────────────────────────────────────────────────
      setPhase('COMMIT');
      setMyTarget('p1');
      addLog(`[Round ${rNum}] Commit phase`);
      st = st.map(p => ({ ...p, committed: false, revealed: false }));
      setPlayers(st.map(p => ({ ...p })));
      await wait(400);
      for (const p of st.filter(x => x.alive)) {
        await wait(350);
        st = st.map(x => x.id === p.id ? { ...x, committed: true } : x);
        setPlayers(st.map(x => ({ ...x })));
      }
      await wait(600);

      // ── REVEAL ───────────────────────────────────────────────────────────────
      setPhase('REVEAL');
      addLog(`[Round ${rNum}] Reveal phase`);
      for (const p of st.filter(x => x.alive)) {
        await wait(280);
        st = st.map(x => x.id === p.id ? { ...x, revealed: true } : x);
        setPlayers(st.map(x => ({ ...x })));
      }
      await wait(500);

      // ── RESOLVE ──────────────────────────────────────────────────────────────
      setPhase('RESOLVE');
      addLog(`[Round ${rNum}] Resolving combat…`, 'info');

      for (const [aId, tId, roll, dMax, dmg, crit] of SCRIPT[r]) {
        const atk = st.find(p => p.id === aId);
        const tgt = st.find(p => p.id === tId);
        if (!atk?.alive || !tgt?.alive) continue;

        setDiceMap(prev => ({ ...prev, [aId]: { rolling: true, value: 0, diceMax: dMax } }));
        await wait(700);
        setDiceMap(prev => ({ ...prev, [aId]: { rolling: false, value: roll, diceMax: dMax } }));
        await wait(400);

        st = st.map(p => {
          if (p.id !== tId) return p;
          const newHp = Math.max(0, p.hp - dmg);
          return { ...p, hp: newHp, alive: newHp > 0 };
        });
        setPlayers(st.map(p => ({ ...p })));

        const updated = st.find(p => p.id === tId)!;
        if (crit) addLog(`${atk.name} CRITS ${updated.name} for ${dmg}! (${updated.hp} HP left)`, 'crit');
        else      addLog(`${atk.name} → ${updated.name}: ${dmg} DMG (${updated.hp} HP left)`, 'hit');
        if (!updated.alive) addLog(`${updated.name} has been ELIMINATED!`, 'elim');

        await wait(300);
      }

      setDiceMap({});
      await wait(800);

      const alive = st.filter(p => p.alive);
      if (alive.length <= 1) {
        const w = alive[0] ?? st[0];
        setWinner(w.id);
        setPhase('DONE');
        addLog(`🏆 ${w.name} WINS THE ARENA!`, 'win');
        running.current = false;
        return;
      }

      await wait(800);
    }

    // fallback winner
    const alive = st.filter(p => p.alive);
    const w = alive[0] ?? st[0];
    setWinner(w.id);
    setPhase('DONE');
    addLog(`${w.name} WINS THE ARENA!`, 'win');
    running.current = false;
  }, [addLog]);

  useEffect(() => {
    running.current = false;
    runDemo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const slots = Array.from({ length: 4 }, (_, i) => players[i] ?? null);

  const banner = (() => {
    if (winner) {
      const w = players.find(p => p.id === winner);
      return { text: `${w?.name ?? '???'} WINS!`, style: 'bg-secondary text-on-secondary shadow-[0_0_40px_rgba(125,255,162,0.6)]' };
    }
    if (phase === 'COMMIT') {
      if (!myTarget) return { text: `Round ${round} — SELECT TARGET`, style: 'bg-error/90 text-white shadow-[0_0_40px_rgba(255,60,60,0.5)]' };
      return { text: `Round ${round} — COMMIT HASH`, style: 'bg-primary-container text-on-primary-container shadow-[0_0_40px_rgba(99,138,255,0.4)]' };
    }
    if (phase === 'REVEAL')  return { text: `Round ${round} — REVEAL`,   style: 'bg-primary-container text-on-primary-container shadow-[0_0_40px_rgba(99,138,255,0.4)]' };
    if (phase === 'RESOLVE') return { text: 'COMBAT RESOLVING!',          style: 'bg-tertiary text-on-tertiary shadow-[0_0_40px_rgba(255,200,100,0.4)]' };
    if (phase === 'LOBBY')   return { text: 'WAITING FOR PLAYERS…',       style: 'bg-surface-container-highest text-outline' };
    return null;
  })();

  const logColor: Record<LogEntry['type'], string> = {
    info: 'text-outline',
    hit:  'text-on-surface',
    crit: 'text-tertiary font-bold',
    elim: 'text-error font-bold',
    win:  'text-secondary font-bold',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      <Header />

      <main className="pt-20 sm:pt-24 pb-24 sm:pb-32 px-4 sm:px-6 min-h-screen flex flex-col gap-6 sm:gap-8 max-w-[1600px] mx-auto relative z-10">

        {/* Demo banner */}
        <div className="flex items-center gap-3 bg-tertiary/10 border border-tertiary/30 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-tertiary text-lg">play_circle</span>
          <div className="flex-1">
            <span className="font-headline font-bold text-sm text-tertiary uppercase tracking-widest">Demo Mode</span>
            <span className="text-outline text-xs font-robotomono ml-3">Simulated battle — no wallet required</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { running.current = false; setKey(k => k + 1); }}
              className="bg-surface-container hover:bg-surface-container-high text-outline hover:text-white px-3 py-1.5 rounded-lg font-headline font-bold uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">replay</span>
              Replay
            </button>
            <Link
              href="/lobby"
              className="bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg font-headline font-bold uppercase text-[10px] tracking-widest transition-all hover:shadow-[0_0_20px_rgba(99,138,255,0.4)] active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">swords</span>
              Play Real
            </Link>
          </div>
        </div>

        {/* Arena Header */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 lg:gap-6">
          <div className="flex flex-col">
            <span className="font-label text-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm">Demo Arena Session</span>
            <h1 className="font-headline font-black text-3xl sm:text-4xl lg:text-5xl italic text-white uppercase tracking-tighter">
              ROOM DEMO-01
            </h1>
          </div>
          <div className="glass-panel p-4 sm:p-6 rounded-xl flex flex-col items-center w-full lg:w-auto lg:min-w-[320px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <span className="font-label text-outline uppercase text-xs tracking-widest mb-1 relative z-10">Total Prize Pool</span>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="font-headline font-black text-3xl sm:text-4xl text-secondary">0.04</span>
              <span className="font-robotomono text-primary font-bold">TON</span>
            </div>
          </div>
        </div>

        {/* Combat Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 h-auto lg:h-[650px]">

          {/* Left: Combat Log */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h3 className="font-headline font-bold uppercase text-outline text-sm tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Live Combat Log
            </h3>
            <div className="glass-panel rounded-xl flex-1 p-4 overflow-y-auto font-robotomono text-xs space-y-2 border-l-4 border-secondary/30 max-h-[400px] lg:max-h-none">
              {log.map(entry => (
                <div key={entry.id} className={logColor[entry.type]}>
                  {entry.text}
                </div>
              ))}
              <div ref={logEnd} />
            </div>
          </div>

          {/* Center: 2×2 Player Grid */}
          <div className="lg:col-span-6 relative glass-panel rounded-3xl overflow-hidden border-2 border-primary-container/10 p-4 sm:p-6 lg:p-8">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-6 lg:gap-8 h-full relative z-20">
              {slots.map((player, idx) => {
                if (!player) return (
                  <div key={idx} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-outline-variant/20">
                    <Image src="/assets/arena_particle.webp" alt="Waiting" width={96} height={96} className="w-20 h-20 object-contain opacity-20" />
                    <span className="font-robotomono text-[9px] text-outline">WAITING</span>
                  </div>
                );

                const cls       = CLS[player.cls];
                const dice      = diceMap[player.id];
                const isMe      = player.id === 'me';
                const isTarget  = player.id === myTarget;
                const showDice  = dice && (dice.rolling || dice.value > 0);

                return (
                  <div
                    key={player.id}
                    className={`relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl transition-all border ${
                      !player.alive ? 'border-error/20 opacity-50 grayscale'
                      : isTarget    ? 'border-error/80 ring-2 ring-error/50 shadow-[0_0_20px_rgba(255,60,60,0.3)]'
                      : isMe        ? 'border-primary/40'
                      :               'border-white/10'
                    }`}
                  >
                    {isMe && player.alive && (
                      <span className="absolute top-1.5 left-1.5 bg-primary/20 text-primary font-robotomono text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded z-10">YOU</span>
                    )}
                    {isTarget && player.alive && (
                      <div className="absolute top-1.5 right-1.5 bg-error/20 text-error font-robotomono text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10">
                        <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: '"FILL" 1' }}>gps_fixed</span>
                        TARGET
                      </div>
                    )}

                    {/* HP bar */}
                    <div className="w-full px-1">
                      <div className="flex justify-between font-robotomono text-[9px] text-outline mb-0.5">
                        <span>HP</span><span>{player.hp}</span>
                      </div>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${player.hp > 50 ? 'bg-secondary' : player.hp > 25 ? 'bg-tertiary' : 'bg-error'}`}
                          style={{ width: `${player.hp}%` }}
                        />
                      </div>
                    </div>

                    {/* Avatar / dice */}
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full bg-surface-container-highest border-2 border-white/10 drop-shadow-[0_0_15px_rgba(99,138,255,0.4)] flex items-center justify-center">
                        <span className={`font-headline font-black text-2xl sm:text-3xl text-${cls.color}`}>
                          {player.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {showDice && (
                        <div className="absolute -top-3 -right-3 z-10">
                          <Dice isRolling={dice.rolling} value={dice.value} diceMax={dice.diceMax} className="!w-10 !h-10 sm:!w-12 sm:!h-12" />
                        </div>
                      )}
                    </div>

                    {/* Name + status */}
                    <div className="text-center">
                      <div className={`font-headline font-bold text-sm uppercase tracking-tight flex items-center gap-1 justify-center ${player.alive ? 'text-white' : 'text-error'}`}>
                        <span className={`material-symbols-outlined text-${cls.color} text-sm`}>{cls.icon}</span>
                        @{player.name}
                      </div>
                      <div className={`font-robotomono text-[10px] text-${cls.color}`}>
                        {cls.name} · {
                          !player.alive ? 'ELIMINATED' :
                          phase === 'COMMIT'  ? (player.committed ? 'COMMITTED ✓' : 'COMMITTING…') :
                          phase === 'REVEAL'  ? (player.revealed  ? 'REVEALED ✓'  : 'REVEALING…')  :
                          phase === 'RESOLVE' ? 'RESOLVING…' : 'READY'
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center banner */}
            {banner && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                <div className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full font-headline font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-sm whitespace-nowrap ${banner.style}`}>
                  {banner.text}
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* Your target widget */}
            {(phase === 'COMMIT' || phase === 'REVEAL') && (
              <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
                <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-sm">gps_fixed</span>
                  Your Target
                </h4>
                {myTarget ? (() => {
                  const tp = players.find(p => p.id === myTarget);
                  const tCls = tp ? CLS[tp.cls] : CLS[0];
                  return (
                    <div className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-3 py-2">
                      <span className={`material-symbols-outlined text-${tCls.color} text-base`} style={{ fontVariationSettings: '"FILL" 1' }}>{tCls.icon}</span>
                      <span className="font-bold text-sm text-white">@{tp?.name}</span>
                      <span className={`ml-auto font-robotomono text-[9px] text-${tCls.color} uppercase`}>{tCls.name}</span>
                    </div>
                  );
                })() : (
                  <p className="font-robotomono text-[10px] text-error animate-pulse">Tap a player card to select target</p>
                )}
              </div>
            )}

            {/* Player HP */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline">Player HP</h4>
                <span className="material-symbols-outlined text-primary text-lg">monitoring</span>
              </div>
              <div className="space-y-3">
                {players.map(p => {
                  const pCls = CLS[p.cls];
                  return (
                    <div key={p.id} className={!p.alive ? 'opacity-40' : ''}>
                      <div className="flex justify-between font-label text-[10px] mb-1">
                        <span className={`text-${pCls.color}`}>{p.name}</span>
                        <span className="text-outline">{p.hp} HP</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${p.hp > 50 ? `bg-${pCls.color}` : p.hp > 25 ? 'bg-tertiary' : 'bg-error'}`}
                          style={{ width: `${p.hp}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spectator bets (mocked) */}
            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant/20 bg-white/5">
                <h4 className="font-headline font-bold uppercase text-[10px] tracking-widest text-outline">Top Spectator Bets</h4>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[200px]">
                {[
                  { init: 'JD', name: 'JamesDoge',   on: 'NexusNode',  amount: '1.2k' },
                  { init: 'SK', name: 'SatoshiKing',  on: 'CryptoWolf', amount: '800'  },
                  { init: 'AL', name: 'AlphaLion',    on: 'ShadowByte', amount: '500'  },
                ].map(b => (
                  <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{b.init}</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{b.name}</span>
                        <span className="text-[9px] text-outline">on {b.on}</span>
                      </div>
                    </div>
                    <span className="font-robotomono text-xs text-secondary font-bold">{b.amount} TON</span>
                  </div>
                ))}
              </div>
              <button className="m-4 bg-surface-container-highest hover:bg-primary-container text-on-surface hover:text-on-primary-container py-3 rounded-xl font-headline font-bold uppercase text-xs tracking-widest transition-all">
                Place Your Bet
              </button>
            </div>

            {/* Winner card */}
            {winner && (
              <div className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-4 border border-secondary/40 shadow-[0_0_30px_rgba(125,255,162,0.15)]">
                <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>emoji_events</span>
                <div className="text-center">
                  <p className="font-label text-outline uppercase text-xs tracking-widest mb-1">Winner</p>
                  <p className="font-headline font-black text-xl text-secondary uppercase">
                    @{players.find(p => p.id === winner)?.name}
                  </p>
                  <p className="font-robotomono text-xs text-outline mt-1">+0.039 TON prize</p>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { running.current = false; setKey(k => k + 1); }}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high text-outline hover:text-white py-2 rounded-xl font-headline font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">replay</span>
                    Again
                  </button>
                  <Link
                    href="/lobby"
                    className="flex-1 bg-primary-container text-on-primary-container py-2 rounded-xl font-headline font-bold uppercase text-[10px] tracking-widest transition-all hover:shadow-[0_0_20px_rgba(99,138,255,0.4)] flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">swords</span>
                    Play Real
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
