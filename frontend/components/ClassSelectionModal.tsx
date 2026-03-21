"use client";

import { useCallback, useMemo, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useGameSocket } from '@/lib/gameSocket';

// Map display names to GameEngine class IDs: KNIGHT=0, MAGE=1, ROGUE=2
const CLASSES = [
  {
    id: 0,
    name: 'TITAN',
    role: 'Front-Line Vanguard',
    icon: 'shield',
    iconColor: 'text-primary',
    durability: 3,
    offense: 1,
    abilities: ['Kinetic Barrier', 'Gravity Slam'],
  },
  {
    id: 2,
    name: 'SHADOW',
    role: 'Precision Infiltrator',
    icon: 'visibility_off',
    iconColor: 'text-secondary',
    durability: 1,
    offense: 3,
    abilities: ['Cloak Mode', 'Neural Spike'],
  },
  {
    id: 1,
    name: 'SPELLWEAVER',
    role: 'Arcane Tactician',
    icon: 'auto_fix_high',
    iconColor: 'text-tertiary',
    durability: 1,
    offense: 4,
    abilities: ['Mana Burst', 'Phase Blink'],
  },
] as const;

export default function ClassSelectionModal() {
  const { state, send } = useGameSocket();
  const { user } = useDynamicContext();
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const playerAddress = useMemo(() => {
    if (!user) return null;
    const telegramCred = user.verifiedCredentials.find(
      (c) => c.format === 'oauth' && c.oauthProvider === 'telegram'
    );
    const blockchainCred = user.verifiedCredentials.find(
      (c) => c.format === 'blockchain'
    );
    return (
      blockchainCred?.address
      ?? (telegramCred?.oauthAccountId ? String(telegramCred.oauthAccountId) : null)
      ?? (telegramCred?.oauthUsername   ? `tg_${telegramCred.oauthUsername}`  : null)
      ?? user.userId
      ?? null
    );
  }, [user]);

  const playersReady = state.players.filter((p) => p.classType != null).length;

  const handleConfirm = useCallback(() => {
    if (selectedClass === null || !playerAddress || !state.roomId) return;
    send('JOIN_ROOM', {
      roomId: state.roomId,
      playerAddress,
      classType: selectedClass,
    });
    setConfirmed(true);
  }, [selectedClass, playerAddress, state.roomId, send]);

  // Only render when a room is ready
  if (!state.roomId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl border border-outline-variant/20 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant/10 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-secondary">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-robotomono text-xs uppercase tracking-[0.2em]">Live Arena Pre-Match</span>
            </div>
            <h2 className="font-headline font-black text-2xl sm:text-3xl uppercase italic tracking-tighter">Choose Your Class</h2>
          </div>
          <div className="flex items-center gap-4 bg-surface-container-low px-5 py-3 rounded-xl border border-outline-variant/10">
            <div className="text-right">
              <p className="text-outline text-[10px] uppercase tracking-widest">Room</p>
              <p className="font-headline font-black text-lg text-white font-robotomono">{state.roomId}</p>
            </div>
            <div className="h-8 w-px bg-outline-variant/30" />
            <div className="text-right">
              <p className="text-outline text-[10px] uppercase tracking-widest">Ready</p>
              <p className="font-headline font-black text-lg text-secondary">{playersReady}/{state.players.length}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Class Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CLASSES.map((cls) => {
              const isSelected = selectedClass === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  disabled={confirmed}
                  onClick={() => setSelectedClass(cls.id)}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer text-left w-full
                    ${isSelected
                      ? 'bg-surface-container border-2 border-primary-container shadow-[0_0_30px_rgba(99,138,255,0.25)] sm:-translate-y-2'
                      : 'bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/50'}
                    disabled:pointer-events-none`}
                >
                  {isSelected && (
                    <div className="absolute -top-4 -right-4 bg-primary-container text-on-primary-container font-headline font-black italic px-6 py-1 rotate-12 z-10 text-xs">SELECTED</div>
                  )}
                  <div className={`absolute top-0 right-0 p-3 transition-opacity ${isSelected ? 'opacity-20' : 'opacity-10 group-hover:opacity-25'}`}>
                    <span className={`material-symbols-outlined text-7xl ${cls.iconColor}`}>{cls.icon}</span>
                  </div>
                  <div className="p-5 space-y-4 flex flex-col h-full">
                    <div>
                      <h3 className="text-2xl font-black font-headline italic tracking-tighter text-white mb-1">{cls.name}</h3>
                      <p className={`text-xs font-robotomono ${cls.iconColor} uppercase`}>{cls.role}</p>
                    </div>
                    <div className="space-y-2">
                      {(['durability', 'offense'] as const).map((stat) => (
                        <div key={stat} className="flex items-center justify-between text-sm">
                          <span className="text-outline capitalize">{stat}</span>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4].map((pip) => (
                              <div key={pip} className={`h-1.5 w-5 ${pip <= cls[stat] ? 'bg-secondary' : 'bg-surface-container-highest'}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ul className="text-sm text-on-surface/70 space-y-1.5 mt-auto">
                      {cls.abilities.map((a) => (
                        <li key={a} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-secondary">check_circle</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Panel */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Selected class preview */}
            <div className="bg-surface-container-highest/40 rounded-xl p-4 border border-outline-variant/10 min-h-[68px] flex items-center">
              {selectedClass === null ? (
                <p className="font-robotomono text-xs text-outline uppercase tracking-widest">No class selected</p>
              ) : (() => {
                const cls = CLASSES.find((c) => c.id === selectedClass);
                if (!cls) return null;
                return (
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-3xl ${cls.iconColor}`} style={{ fontVariationSettings: '"FILL" 1' }}>{cls.icon}</span>
                    <div>
                      <p className="font-headline font-black text-xl">{cls.name}</p>
                      <p className="font-robotomono text-[10px] text-outline uppercase">{cls.role}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-tertiary-container/10 p-4 rounded-xl border border-tertiary-container/20 space-y-2">
              <div className="flex items-center gap-2 text-tertiary-container">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span className="font-headline font-black uppercase tracking-widest text-sm italic">Winner Takes All!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-on-surface/60">Once committed, your class is locked. Play responsibly.</p>
            </div>

            {confirmed ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2 text-secondary font-headline font-bold text-base uppercase tracking-widest">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Waiting for others...</span>
                </div>
                <div className="w-full bg-outline-variant/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{
                      width: `${(playersReady / Math.max(state.players.length, 1)) * 100}%`,
                      boxShadow: '0 0 10px #638aff',
                    }}
                  />
                </div>
                <p className="font-robotomono text-xs text-outline">{playersReady} / {state.players.length} players ready</p>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={selectedClass === null}
                className="w-full bg-secondary text-[#00210b] py-4 rounded-xl font-headline font-black uppercase tracking-[0.15em] text-base glow-secondary active:scale-[0.98] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                Confirm Class
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
