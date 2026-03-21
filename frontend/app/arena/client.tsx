"use client";

import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import { Dice } from '@/components/Dice';
import { useGameSocket } from '@/lib/gameSocket';
import type { Player, GamePhase, RoundResult } from '@/lib/gameSocket';

// Player type augmented with hp (hp is in the runtime object; IDE may have stale cache)
type LivePlayer = Player & { hp?: number };

// ── Class metadata ─────────────────────────────────────────────────────────────
const CLASS_INFO: Record<string, { name: string; icon: string; color: string }> = {
  '0': { name: 'TITAN',       icon: 'shield',         color: 'primary'   },
  '1': { name: 'SPELLWEAVER', icon: 'auto_fix_high',  color: 'tertiary'  },
  '2': { name: 'SHADOW',      icon: 'visibility_off', color: 'secondary' },
};

function getClassInfo(classType: string | number | undefined) {
  return CLASS_INFO[String(classType ?? '')] ?? { name: '???', icon: 'help_outline', color: 'outline' };
}

function getPlayerStatus(player: LivePlayer, phase: GamePhase): string {
  if (!player.alive) return 'ELIMINATED';
  switch (phase) {
    case 'COMMIT':  return player.committed ? 'COMMITTED ✓'  : 'COMMITTING...';
    case 'REVEAL':  return player.revealed  ? 'REVEALED ✓'   : 'REVEALING...';
    case 'RESOLVE': return 'RESOLVING...';
    default:        return 'READY';
  }
}

interface ArenaClientProps {
  lobbyConnectApiUrl: string;
  baseAppUrl?: string;
}

export function ArenaClient({ lobbyConnectApiUrl }: ArenaClientProps) {
  const { state, send } = useGameSocket();

  const handleTargetSelect = useCallback((targetAddress: string) => {
    send('SELECT_TARGET', { target: targetAddress });
  }, [send]);

  // Always show at least 4 slots; null = empty waiting slot
  const playerSlots = useMemo(
    () => Array.from({ length: Math.max(4, state.players.length) }, (_, i) => (state.players[i] as LivePlayer | undefined) ?? null),
    [state.players]
  );

  // Dice state keyed by address
  const diceRollsByAddress = useMemo(() => {
    const map: Record<string, { roll: number; diceMax: number; isRolling: boolean }> = {};
    state.players.forEach((player) => {
      const roll = state.diceRolls.get(player.address);
      map[player.address] = {
        roll:      roll?.roll    ?? 0,
        diceMax:   roll?.diceMax ?? 10,
        isRolling: state.rollingPlayers.has(player.address),
      };
    });
    return map;
  }, [state.diceRolls, state.rollingPlayers, state.players]);

  // Center banner from live game state
  const centerBanner = useMemo(() => {
    if (state.winner) {
      const wp = state.players.find(p => p.address === state.winner);
      const name = wp?.displayName ?? state.winner.slice(0, 8);
      return { text: `${name} WINS!`, style: 'bg-secondary text-on-secondary shadow-[0_0_40px_rgba(125,255,162,0.6)]' };
    }
    if (state.phase === 'COMMIT') {
      if (state.myAddress && !state.myTarget)
        return { text: `Round ${state.round} — SELECT TARGET`, style: 'bg-error/90 text-white shadow-[0_0_40px_rgba(255,60,60,0.5)]' };
      return { text: `Round ${state.round} — COMMIT HASH`, style: 'bg-primary-container text-on-primary-container shadow-[0_0_40px_rgba(99,138,255,0.4)]' };
    }
    if (state.phase === 'REVEAL')  return { text: `Round ${state.round} — REVEAL`,  style: 'bg-primary-container text-on-primary-container shadow-[0_0_40px_rgba(99,138,255,0.4)]' };
    if (state.phase === 'RESOLVE') return { text: 'COMBAT RESOLVING!',              style: 'bg-tertiary text-on-tertiary shadow-[0_0_40px_rgba(255,200,100,0.4)]' };
    if (state.round > 0)           return { text: `Round ${state.round} complete`,  style: 'bg-surface-container-highest text-outline' };
    return null;
  }, [state.winner, state.phase, state.round, state.players, state.myAddress, state.myTarget]);

  return (
    <main className="pt-20 sm:pt-24 pb-24 sm:pb-32 px-4 sm:px-6 min-h-screen flex flex-col gap-6 sm:gap-8 max-w-[1600px] mx-auto relative z-10">
      {/* Arena Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 lg:gap-6">
        <div className="flex flex-col">
          <span className="font-label text-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm">Active Arena Session</span>
          <h1 className="font-headline font-black text-3xl sm:text-4xl lg:text-5xl italic text-white uppercase tracking-tighter">
            {state.roomId ? `ROOM ${state.roomId}` : 'AWAITING GAME'}
          </h1>
        </div>
        {/* Prize Pool Display */}
        <div className="glass-panel p-4 sm:p-6 rounded-xl flex flex-col items-center w-full lg:w-auto lg:min-w-[320px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
          <span className="font-label text-outline uppercase text-xs tracking-widest mb-1 relative z-10">Total Prize Pool</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="font-headline font-black text-3xl sm:text-4xl text-secondary">88,400</span>
            <span className="font-robotomono text-primary font-bold">TON</span>
          </div>
        </div>
      </div>

      {/* Combat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 h-auto lg:h-[650px]">
        {/* Left Wing: Combat Log */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h3 className="font-headline font-bold uppercase text-outline text-sm tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Live Combat Log
          </h3>
          <div className="glass-panel rounded-xl flex-1 p-4 overflow-y-auto font-robotomono text-xs space-y-3 border-l-4 border-secondary/30">
            {state.round === 0 && <div className="opacity-60 text-outline">Waiting for game to start...</div>}
            {state.phase === 'COMMIT'  && <div className="text-primary">[Round {state.round}] Commit phase.</div>}
            {state.phase === 'REVEAL'  && <div className="text-primary">[Round {state.round}] Reveal phase.</div>}
            {state.phase === 'RESOLVE' && <div className="text-tertiary">[Round {state.round}] Resolving combat...</div>}
            {state.winner && (
              <div className="text-secondary font-bold">
                GAME OVER — {state.players.find(p => p.address === state.winner)?.displayName ?? state.winner.slice(0, 8)} wins!
              </div>
            )}
            {Array.isArray(state.results) && (state.results as RoundResult[]).map((r, i) => {
              const aName = state.players.find(p => p.address === r.attacker)?.displayName ?? r.attacker.slice(0, 6);
              const tName = state.players.find(p => p.address === r.target)?.displayName   ?? r.target.slice(0, 6);
              return (
                <div key={i} className={r.eliminated ? 'bg-error-container/20 p-2 rounded border border-error/10' : ''}>
                  <span className="text-secondary">@{aName}</span>
                  {r.isCrit ? <span className="text-tertiary font-bold"> CRIT! </span> : <span className="text-outline"> → </span>}
                  <span className="text-on-surface">@{tName}</span>
                  {' '}<span className="text-white font-bold">{r.damage} DMG</span>
                  {' '}(<span className={r.targetHpAfter > 0 ? 'text-secondary' : 'text-error'}>{r.targetHpAfter} HP</span>)
                  {r.eliminated && <span className="text-error font-bold"> ELIM!</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Central Arena Area: 2x2 Grid of Players */}
        <div className="lg:col-span-6 relative glass-panel rounded-3xl overflow-hidden border-2 border-primary-container/10 p-4 sm:p-6 lg:p-8">
          {/* Background Environment */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] opacity-20"></div>
          </div>
          {/* Player Grid */}
          <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-6 lg:gap-8 h-full relative z-20">
            {playerSlots.map((player, idx) => {
              const diceData   = player ? (diceRollsByAddress[player.address] ?? { roll: 0, diceMax: 10, isRolling: false }) : null;
              const cls        = getClassInfo(player?.classType);
              const hp         = player?.hp ?? 100;
              const status     = player ? getPlayerStatus(player, state.phase) : 'WAITING';
              const name       = player ? (player.displayName ?? `${player.address.slice(0, 4)}…${player.address.slice(-3)}`) : '---';
              const eliminated = player ? !player.alive : false;
              const isMe       = !!player && player.address === state.myAddress;
              const isMyTarget = !!player && player.address === state.myTarget;
              const canTarget  = !isMe && !!player && !eliminated &&
                                 (state.phase === 'COMMIT' || state.phase === 'REVEAL') &&
                                 !!state.myAddress;
              return (
                <div
                  key={player?.address ?? idx}
                  role={canTarget ? 'button' : undefined}
                  onClick={canTarget ? () => handleTargetSelect(player!.address) : undefined}
                  className={`group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl transition-all border ${
                    eliminated   ? 'border-error/20 opacity-50 grayscale'
                    : isMyTarget ? 'border-error/80 ring-2 ring-error/50 shadow-[0_0_20px_rgba(255,60,60,0.3)] cursor-pointer'
                    : canTarget  ? 'border-white/10 hover:border-error/60 hover:shadow-[0_0_15px_rgba(255,60,60,0.15)] cursor-pointer'
                    : player     ? 'border-white/10 hover:bg-white/5 hover:border-white/20'
                    :              'border-dashed border-outline-variant/20'
                  }`}
                >
                  {/* YOU badge */}
                  {isMe && player && !eliminated && (
                    <span className="absolute top-1.5 left-1.5 bg-primary/20 text-primary font-robotomono text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded z-10">YOU</span>
                  )}
                  {/* TARGETED badge */}
                  {isMyTarget && player && !eliminated && (
                    <div className="absolute top-1.5 right-1.5 bg-error/20 text-error font-robotomono text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10">
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: '"FILL" 1' }}>gps_fixed</span>
                      TARGET
                    </div>
                  )}
                  {/* Crosshair hover overlay for targetable opponents */}
                  {canTarget && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                      <span className="material-symbols-outlined text-error/70 text-5xl drop-shadow-[0_0_10px_rgba(255,60,60,0.6)]">gps_fixed</span>
                    </div>
                  )}
                  {/* HP bar */}
                  <div className="w-full px-1">
                    <div className="flex justify-between font-robotomono text-[9px] text-outline mb-0.5">
                      <span>HP</span><span>{player ? hp : '—'}</span>
                    </div>
                    <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          !player ? 'bg-outline/20' : hp > 50 ? 'bg-secondary' : hp > 25 ? 'bg-tertiary' : 'bg-error'
                        }`}
                        style={{ width: player ? `${hp}%` : '0%' }}
                      />
                    </div>
                  </div>
                  {/* Avatar + dice */}
                  <div className="relative">
                    {player ? (
                      player.avatarUrl ? (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-2 border-white/20 drop-shadow-[0_0_15px_rgba(99,138,255,0.4)] flex-shrink-0">
                          <Image
                            src={player.avatarUrl}
                            alt={name}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full bg-surface-container-highest border-2 border-white/10 drop-shadow-[0_0_15px_rgba(99,138,255,0.4)] flex items-center justify-center">
                          <span className={`font-headline font-black text-2xl sm:text-3xl text-${cls.color}`}>
                            {name.replace('@', '').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )
                    ) : (
                      <Image
                        src="/assets/arena_particle.webp"
                        alt="Waiting for player"
                        width={128}
                        height={128}
                        className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 object-contain opacity-20"
                      />
                    )}
                    {diceData && (diceData.isRolling || diceData.roll > 0) && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <Dice isRolling={diceData.isRolling} value={diceData.roll} diceMax={diceData.diceMax} className="!w-10 !h-10 sm:!w-12 sm:!h-12" />
                      </div>
                    )}
                  </div>
                  {/* Name + class + status */}
                  <div className="text-center">
                    <div className={`font-headline font-bold text-sm uppercase tracking-tight flex items-center gap-1 justify-center ${player ? 'text-white' : 'text-outline'}`}>
                      {player && <span className={`material-symbols-outlined text-${cls.color} text-sm`}>{cls.icon}</span>}
                      @{name}
                    </div>
                    <div className={`font-robotomono text-[10px] ${eliminated ? 'text-error' : `text-${cls.color}`}`}>
                      {player ? `${cls.name} · ${status}` : 'WAITING'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Center Banner */}
          {centerBanner && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full font-headline font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-sm whitespace-nowrap ${centerBanner.style}`}>
                {centerBanner.text}
              </div>
            </div>
          )}
        </div>

        {/* Right Wing: Live Betting & Stats */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-4">
            <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline text-center">Scan to Join Sync Server</h4>
            <Image
              src="/api/connect-lobby/qr"
              alt="QR code to connect to TON Games lobby"
              width={220}
              height={220}
              className="rounded-xl border border-outline-variant/20 bg-white p-2"
              unoptimized
            />
            <p className="text-[10px] font-robotomono text-outline text-center break-all">
              {lobbyConnectApiUrl}
            </p>
          </div>

          {/* Your Target (shown during COMMIT/REVEAL) */}
          {(state.phase === 'COMMIT' || state.phase === 'REVEAL') && state.myAddress && (
            <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-sm">gps_fixed</span>
                Your Target
              </h4>
              {state.myTarget ? (() => {
                const tp = state.players.find(p => p.address === state.myTarget);
                const tCls = getClassInfo(tp?.classType);
                const tName = tp?.displayName ?? state.myTarget?.slice(0, 8) ?? '???';
                return (
                  <div className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-3 py-2">
                    <span className={`material-symbols-outlined text-${tCls.color} text-base`} style={{ fontVariationSettings: '"FILL" 1' }}>{tCls.icon}</span>
                    <span className="font-bold text-sm text-white">@{tName}</span>
                    <span className={`ml-auto font-robotomono text-[9px] text-${tCls.color} uppercase`}>{tCls.name}</span>
                  </div>
                );
              })() : (
                <p className="font-robotomono text-[10px] text-error animate-pulse">Tap a player card to select target</p>
              )}
            </div>
          )}

          {/* Live Player HP */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline">Player HP</h4>
              <span className="material-symbols-outlined text-primary text-lg">monitoring</span>
            </div>
            <div className="space-y-3">
              {state.players.length === 0 && (
                <p className="font-robotomono text-[10px] text-outline">No active players</p>
              )}
              {(state.players as LivePlayer[]).map((p) => {
                const pCls  = getClassInfo(p.classType);
                const pHp   = p.hp ?? 100;
                const pName = p.displayName ?? p.address.slice(0, 8);
                return (
                  <div key={p.address} className={!p.alive ? 'opacity-40' : ''}>
                    <div className="flex justify-between font-label text-[10px] mb-1">
                      <span className={`text-${pCls.color}`}>{pName}</span>
                      <span className="text-outline">{pHp} HP</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${pHp > 50 ? `bg-${pCls.color}` : pHp > 25 ? 'bg-tertiary' : 'bg-error'}`}
                        style={{ width: `${pHp}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Active Bets List */}
          <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant/20 bg-white/5">
              <h4 className="font-headline font-bold uppercase text-[10px] tracking-widest text-outline">Top Spectator Bets</h4>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[250px]">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">JD</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">JamesDoge</span>
                    <span className="text-[9px] text-outline">on NexusNode</span>
                  </div>
                </div>
                <span className="font-robotomono text-xs text-secondary font-bold">1.2k TON</span>
              </div>
            </div>
            <button className="m-4 bg-surface-container-highest hover:bg-primary-container text-on-surface hover:text-on-primary-container py-3 rounded-xl font-headline font-bold uppercase text-xs tracking-widest transition-all">
              Place Your Bet
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
