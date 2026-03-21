"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTelegramLogin } from '@dynamic-labs/sdk-react-core';

type TelegramWebAppData = {
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
  };
};

type TelegramAwareWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebAppData;
  };
};

function getTelegramAuthToken(): string | undefined {
  if (globalThis.window === undefined) {
    return undefined;
  }

  const w = globalThis.window as TelegramAwareWindow;

  const fromQuery = new URLSearchParams(w.location.search).get('telegramAuthToken');
  if (fromQuery) return fromQuery;

  const fromSession = w.sessionStorage.getItem('telegramAuthToken');
  if (fromSession) return fromSession;

  const fromLocal = w.localStorage.getItem('telegramAuthToken');
  if (fromLocal) return fromLocal;

  const fromStartParam = w.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromStartParam) return fromStartParam;

  const fromInitData = w.Telegram?.WebApp?.initData;
  if (fromInitData) return fromInitData;

  return undefined;
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthWithTelegram, telegramSignIn } = useTelegramLogin();
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
      const telegramAuthToken = getTelegramAuthToken();

      if (!telegramAuthToken) {
        throw new Error('Missing telegramAuthToken. Open this app from your Telegram bot deep-link and pass telegramAuthToken from bot.ts.');
      }

      const isValidTelegramContext = await isAuthWithTelegram(telegramAuthToken);
      if (!isValidTelegramContext) {
        throw new Error('Invalid Telegram auth context. Relaunch from the Telegram bot mini app link.');
      }

      // Headless Telegram auth via Dynamic hook.
      await telegramSignIn({ authToken: telegramAuthToken });
      globalThis.window.sessionStorage.setItem('dynamicTelegramAuth', '1');
      router.push('/lobby');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram connection failed';
      setTelegramError(message);
    } finally {
      setIsConnectingTelegram(false);
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
        <p className="text-on-surface-variant text-base sm:text-lg xl:text-xl max-w-xl font-light leading-relaxed">
          Enter the void. Forge your legacy on the TON network. A high-stakes decentralized arena where strategy meets the speed of light.
        </p>
        <div className="flex items-center gap-6 pt-2">
          <div className="flex -space-x-3">
            <Image
              src="/assets/avatar_blue.webp"
              alt="Cyberpunk character portrait blue theme"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full border-2 border-surface shadow-2xl object-cover"
            />
            <Image
              src="/assets/avatar_green.webp"
              alt="Cyberpunk character portrait green theme"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full border-2 border-surface shadow-2xl object-cover"
            />
            <Image
              src="/assets/avatar_neon.webp"
              alt="Cyberpunk character portrait neon theme"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full border-2 border-surface shadow-2xl object-cover"
            />
          </div>
          <div className="text-sm font-robotomono text-outline">
            <span className="text-secondary font-bold text-base block">12,402</span>
            <span className="opacity-60 text-[10px] tracking-widest uppercase">PLAYERS ONLINE</span>
          </div>
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
            <header className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-white tracking-tight">INITIALIZE ACCESS</h2>
                <span className="font-robotomono text-[10px] text-primary/60">SYS_V.04.1</span>
              </div>
              <div className="h-1 w-16 bg-primary-container rounded-full"></div>
            </header>
            
            {/* Input Section */}
            <div className="space-y-8">
              <div className="group">
                <label htmlFor="identityHash" className="block font-label text-xs uppercase tracking-[0.2em] text-outline mb-3 group-focus-within:text-primary transition-colors">
                  Identity Hash / Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary-container">fingerprint</span>
                  <input
                    id="identityHash"
                    className="w-full bg-surface-container-highest/30 border border-outline-variant/20 rounded-xl py-5 pl-14 pr-5 text-white font-robotomono focus:ring-2 focus:ring-primary-container/30 focus:bg-surface-container-highest/50 outline-none placeholder:text-outline/30 transition-all font-mono"
                    placeholder="OPERATOR_X"
                    type="text"
                  />
                </div>
              </div>
              
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
                  <span className="tracking-wider text-base sm:text-lg">{telegramButtonText}</span>
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

            {/* Footnote / Help */}
            <footer className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
              <button type="button" className="text-xs font-label text-outline hover:text-white transition-colors flex items-center gap-2 group">
                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">help</span>
                <span>SUPPORT TERMINAL</span>
              </button>
              <div className="flex items-center gap-3 bg-secondary/5 px-3 py-1.5 rounded-lg border border-secondary/10">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#7dffa2]"></div>
                <span className="text-[10px] font-robotomono text-secondary uppercase tracking-tighter">Nodes Healthy</span>
              </div>
            </footer>
          </div>
        </div>

        {/* Transactional Status Display */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 px-0 sm:px-2">
          <div className="bg-surface-container-low/40 p-5 rounded-xl border border-outline-variant/10 backdrop-blur-sm">
            <div className="text-[10px] text-outline/60 font-robotomono uppercase mb-2 tracking-widest">Network Load</div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-primary-container shadow-[0_0_10px_rgba(99,138,255,0.5)]"></div>
            </div>
          </div>
          <div className="bg-surface-container-low/40 p-5 rounded-xl border border-outline-variant/10 backdrop-blur-sm flex flex-col justify-center">
            <div className="text-[10px] text-outline/60 font-robotomono uppercase mb-2 tracking-widest">Vault Status</div>
            <div className="flex items-center gap-2 text-secondary font-robotomono text-xs font-bold">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>lock_open</span>
              <span>SECURED</span>
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
