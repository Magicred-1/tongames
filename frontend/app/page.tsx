"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicContext, useTelegramLogin } from '@dynamic-labs/sdk-react-core';

type TelegramWebApp = { initData?: string };
type TelegramAwareWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

function isTelegramMiniApp(): boolean {
  if (globalThis.window === undefined) return false;
  return Boolean((globalThis.window as TelegramAwareWindow).Telegram?.WebApp?.initData);
}

export default function LoginPage() {
  const router = useRouter();
  const { setShowAuthFlow, user } = useDynamicContext();
  const { telegramSignIn } = useTelegramLogin();
  const [isConnecting, setIsConnecting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.push('/lobby');
  }, [user, router]);

  const handleConnectTelegram = async () => {
    if (isConnecting) return;

    setTelegramError(null);
    setIsConnecting(true);

    try {
      if (isTelegramMiniApp()) {
        await telegramSignIn({ forceCreateUser: true });
        router.push('/lobby');
      } else {
        setShowAuthFlow(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram connection failed';
      setTelegramError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-12 xl:gap-24 min-h-screen py-8 sm:py-12">
      {/* Hero Backdrop Logic */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary-container/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-secondary/5 blur-[150px] rounded-full"></div>
      </div>

      {/* Left Side: Branding & World Building */}
      <div className="flex-1 text-center lg:text-left space-y-8 sm:space-y-10 lg:pr-12 max-w-xl relative z-10">
        <div className="space-y-4">
          <h1 className="font-headline font-black text-4xl sm:text-6xl md:text-7xl xl:text-8xl text-white italic tracking-tighter leading-[0.9]">
            <span className="text-white">TON</span>
            <div className="text-primary-container">GAMES</div>
          </h1>
        </div>
      </div>

      {/* Right Side: Login Terminal */}
      <div className="w-full max-w-lg relative z-10">
        <div className="glass-panel p-5 sm:p-8 md:p-12 rounded-2xl relative overflow-hidden shadow-2xl">
          {/* Decorative Hud Elements */}
          <div className="absolute top-0 right-0 p-6 opacity-30">
            <div className="w-16 h-16 border-t-2 border-r-2 border-primary-container/40"></div>
          </div>
          <div className="absolute bottom-0 left-0 p-6 opacity-30">
            <div className="w-16 h-16 border-b-2 border-l-2 border-secondary/40"></div>
          </div>
          <div className="relative z-10 space-y-10">
            
            {/* Input Section */}
            <div className="space-y-8">
              
              {/* Telegram Integration */}
              <div className="space-y-4">
                <button className="w-full group relative flex items-center justify-center gap-4 bg-telegram-blue hover:bg-[#208aba] text-white font-headline font-bold py-5 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_40px_rgba(36,161,222,0.25)] overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleConnectTelegram}
                  disabled={isConnecting}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0C5.346 0 0 5.346 0 11.944c0 6.598 5.346 11.944 11.944 11.944 6.598 0 11.944-5.346 11.944-11.944C23.888 5.346 18.542 0 11.944 0zm5.206 8.358l-1.84 8.672c-.14.62-.507.774-1.026.484l-2.804-2.068-1.352 1.3c-.15.15-.274.274-.563.274l.2-2.844 5.176-4.675c.225-.2-.049-.311-.349-.111l-6.398 4.027-2.757-.862c-.6-.188-.612-.6.126-.887l10.774-4.15c.5-.188.937.112.713.842z"></path>
                  </svg>
                  <span className="tracking-wider text-base sm:text-lg">{isConnecting ? 'CONNECTING...' : 'CONNECT WITH TELEGRAM'}</span>
                  <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none"></div>
                </button>
                {telegramError ? (
                  <p className="text-xs text-red-300 font-robotomono px-1" role="alert">
                    {telegramError}
                  </p>
                ) : null}
              </div>
            </div>
        </div>
        </div>

        {/* Transactional Status Display */}
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