"use client";

import { useGameSocket } from "@/lib/gameSocket";

const CIRCUMFERENCE = 2 * Math.PI * 54; // r = 54

export function DebugCountdownOverlay() {
  const { state } = useGameSocket();

  if (state.debugCountdown === null) return null;

  const total = state.debugCountdownTotal ?? state.debugCountdown;
  // dashOffset = 0 → full ring (countdown at max); circumference → empty ring (done)
  const dashOffset = total > 0
    ? CIRCUMFERENCE * (1 - state.debugCountdown / total)
    : CIRCUMFERENCE;

  const isDone = state.debugCountdown === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" />

      {/* Modal card */}
      <div className="relative z-10 flex flex-col items-center gap-8 glass-panel p-12 rounded-3xl border border-tertiary/30 shadow-[0_0_120px_rgba(255,181,158,0.12)] max-w-sm w-full mx-4 animate-countdown-enter">

        {/* Debug badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary/10 border border-tertiary/30">
          <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
          <span className="font-robotomono text-xs text-tertiary uppercase tracking-widest">
            Debug Mode
          </span>
        </div>

        {/* Ring + number */}
        <div className="relative flex items-center justify-center w-48 h-48">
          {/* Ambient glow */}
          <div className="absolute inset-4 rounded-full bg-tertiary/5 animate-pulse blur-xl" />

          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Track */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-outline-variant/20"
            />
            {/* Progress */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-tertiary"
              strokeLinecap="round"
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: dashOffset,
                transition: "stroke-dashoffset 1s linear",
                filter: "drop-shadow(0 0 6px rgba(255,181,158,0.6))",
              }}
            />
          </svg>

          {/* Countdown number */}
          <span
            className="relative font-headline font-black text-7xl text-tertiary select-none"
            style={{ textShadow: "0 0 40px rgba(255,181,158,0.5)" }}
          >
            {isDone ? "!" : state.debugCountdown}
          </span>
        </div>

        {/* Labels */}
        <div className="text-center space-y-2">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tight">
            {isDone ? "Launching..." : "Game Starting"}
          </h2>
          <p className="font-robotomono text-xs text-outline uppercase tracking-widest">
            {state.players.length} player{state.players.length !== 1 ? "s" : ""} ready
            {!isDone && " — select your class"}
          </p>
        </div>

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none opacity-[0.04]"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,181,158,1) 3px, rgba(255,181,158,1) 4px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
