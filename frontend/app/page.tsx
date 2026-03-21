"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTelegramLogin } from '@dynamic-labs/sdk-react-core';

export default function LoginPage() {
  const router = useRouter();
  const { telegramSignIn } = useTelegramLogin();
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  const telegramButtonText = useMemo(() => {
    if (isConnectingTelegram) {
      return 'CONNECTING TELEGRAM...';
    }

    return 'CONNECT WITH TELEGRAM';
  }, [isConnectingTelegram]);

  const handleConnectTelegram = async () => {
    if (isConnectingTelegram) return;

    setTelegramError(null);
    setIsConnectingTelegram(true);

    try {
      // Headless Telegram auth via Dynamic hook.
      await telegramSignIn();
      router.push('/lobby');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram connection failed';
      setTelegramError(message);
    } finally {
      setIsConnectingTelegram(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center justify-center gap-12 xl:gap-24 min-h-screen py-12">
      {/* Hero Backdrop Logic */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary-container/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-secondary/5 blur-[150px] rounded-full"></div>
      </div>

      {/* Left Side: Branding & World Building */}
      <div className="flex-1 text-left space-y-10 lg:pr-12 max-w-xl relative z-10">
        <div className="space-y-4">
          <h1 className="font-headline font-black text-6xl md:text-7xl xl:text-8xl text-white italic tracking-tighter leading-[0.9]">
            <span className="text-white">TON</span>
            <div className="text-primary-container">GAMES</div>
          </h1>
        </div>
      </div>

      {/* Right Side: Login Terminal */}
      <div className="w-full max-w-lg relative z-10">
        <div className="glass-panel p-8 md:p-12 rounded-2xl relative overflow-hidden shadow-2xl">
          {/* Decorative Hud Elements */}
          <div className="absolute top-0 right-0 p-6 opacity-30">
            <div className="w-16 h-16 border-t-2 border-r-2 border-primary-container/40"></div>
          </div>
          <div className="absolute bottom-0 left-0 p-6 opacity-30">
            <div className="w-16 h-16 border-b-2 border-l-2 border-secondary/40"></div>
          </div>
          <div className="relative z-10 space-y-10">
            <header className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-3xl font-bold text-white tracking-tight">INITIALIZE ACCESS</h2>
                <span className="font-robotomono text-[10px] text-primary/60">SYS_V.04.1</span>
              </div>
              <div className="h-1 w-16 bg-primary-container rounded-full"></div>
            </header>
            
            {/* Input Section */}
            <div className="space-y-8">
              
              {/* Telegram Integration */}
              <div className="space-y-4">
                <button className="w-full group relative flex items-center justify-center gap-4 bg-telegram-blue hover:bg-[#208aba] text-white font-headline font-bold py-5 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_40px_rgba(36,161,222,0.25)] overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleConnectTelegram}
                  disabled={isConnectingTelegram}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0C5.346 0 0 5.346 0 11.944c0 6.598 5.346 11.944 11.944 11.944 6.598 0 11.944-5.346 11.944-11.944C23.888 5.346 18.542 0 11.944 0zm5.206 8.358l-1.84 8.672c-.14.62-.507.774-1.026.484l-2.804-2.068-1.352 1.3c-.15.15-.274.274-.563.274l.2-2.844 5.176-4.675c.225-.2-.049-.311-.349-.111l-6.398 4.027-2.757-.862c-.6-.188-.612-.6.126-.887l10.774-4.15c.5-.188.937.112.713.842z"></path>
                  </svg>
                  <span className="tracking-wider text-lg">{telegramButtonText}</span>
                  <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none"></div>
                </button>
                {telegramError ? (
                  <p className="text-xs text-red-300 font-robotomono px-1" role="alert">
                    {telegramError}
                  </p>
                ) : null}
                <div className="flex items-center justify-between px-2">
                  <span className="h-[1px] flex-1 bg-outline-variant/20"></span>
                  <span className="px-6 font-robotomono text-[10px] text-outline/50 uppercase tracking-widest">Secured Gateway</span>
                  <span className="h-[1px] flex-1 bg-outline-variant/20"></span>
                </div>
              </div>
            </div>
        </div>
        </div>

        {/* Transactional Status Display */}
        <div className="mt-8 grid grid-cols-2 gap-4 px-2">
          <div className="bg-surface-container-low/40 p-5 rounded-xl border border-outline-variant/10 backdrop-blur-sm">
            <div className="text-[10px] text-outline/60 font-robotomono uppercase mb-2 tracking-widest">Network Load</div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-primary-container shadow-[0_0_10px_rgba(99,138,255,0.5)]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-12 right-12 flex gap-10 items-center hidden lg:flex">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-tertiary-container rounded-sm shadow-[0_0_12px_#ff571a] animate-pulse"></span>
          <span className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface/80">High Volatility</span>
        </div>
        <div className="h-10 w-[1px] bg-outline-variant/20"></div>
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-outline hover:text-white cursor-pointer transition-colors text-xl">language</span>
          <span className="material-symbols-outlined text-outline hover:text-white cursor-pointer transition-colors text-xl">settings_input_component</span>
        </div>
      </div>
    </main>
  );
}