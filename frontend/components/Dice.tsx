"use client";

import { useState, useEffect } from 'react';

export interface DiceProps {
  isRolling: boolean;
  value?: number;
  className?: string;
  diceMax?: number;
}

export function Dice({ isRolling, value = 0, className = '', diceMax = 10 }: DiceProps) {
  const [rollingValue, setRollingValue] = useState(value);
  const displayValue = isRolling ? rollingValue : value;

  useEffect(() => {
    if (!isRolling) return;

    // Rapid cycling through values while rolling
    const interval = setInterval(() => {
      setRollingValue(Math.ceil(Math.random() * diceMax));
    }, 50);

    return () => clearInterval(interval);
  }, [isRolling, diceMax]);

  return (
    <div
      className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 flex items-center justify-center ${className} ${
        isRolling ? 'animate-dice-roll' : ''
      }`}
    >
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-container to-primary rounded-lg font-headline font-black text-2xl sm:text-3xl lg:text-5xl text-on-primary-container shadow-[0_0_20px_rgba(99,138,255,0.5)] transition-all ${
          isRolling ? 'scale-110' : 'scale-100'
        }`}
      >
        {displayValue}
      </div>

      {/* Glow effect when rolling */}
      {isRolling && (
        <div className="absolute inset-0 rounded-lg bg-primary/30 animate-pulse blur-lg"></div>
      )}
    </div>
  );
}
