"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useDynamicContext, useTelegramLogin } from '@dynamic-labs/sdk-react-core';
import { useCallback } from 'react';

type TelegramWebApp = { initData?: string };
type TelegramAwareWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

function isTelegramMiniApp(): boolean {
  if (globalThis.window === undefined) return false;
  return Boolean((globalThis.window as TelegramAwareWindow).Telegram?.WebApp?.initData);
}

export default function Header() {
  const pathname = usePathname();
  const { setShowAuthFlow, user, handleLogOut } = useDynamicContext();
  const { telegramSignIn } = useTelegramLogin();

  const handleConnect = useCallback(async () => {
    if (user) {
      await handleLogOut();
    } else if (isTelegramMiniApp()) {
      await telegramSignIn({ forceCreateUser: true });
    } else {
      setShowAuthFlow(true);
    }
  }, [user, handleLogOut, telegramSignIn, setShowAuthFlow]);

  const telegramCred = user?.verifiedCredentials.find(
    (c) => c.format === 'oauth' && c.oauthProvider === 'telegram'
  );

  const blockchainCred = user?.verifiedCredentials.find(
    (c) => c.format === 'blockchain'
  );

  const avatarUrl = telegramCred?.oauthAccountPhotos?.[0] ?? null;

  const displayName =
    telegramCred?.oauthUsername ||
    (blockchainCred?.address
      ? `${blockchainCred.address.slice(0, 6)}...${blockchainCred.address.slice(-4)}`
      : null) ||
    'Connected';

  const initial = displayName.charAt(0).toUpperCase();

  const navLinks = [
    { name: 'Lobby', href: '/lobby' },
    { name: 'Arena', href: '/arena' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-3 sm:px-5 lg:px-8 h-16 sm:h-20 bg-surface shadow-[0_0_24px_rgba(65,117,255,0.08)] backdrop-blur-md border-b border-outline-variant/10">
      <Link href="/" className="text-lg sm:text-xl lg:text-2xl font-black text-white italic tracking-tighter uppercase font-headline hover:scale-105 transition-transform">
        TON Games
      </Link>

      <nav className="hidden md:flex items-center gap-10">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`font-headline font-bold uppercase tracking-widest transition-all duration-300 pb-1 border-b-2 ${isActive
                ? 'text-secondary border-secondary'
                : 'text-outline border-transparent hover:text-white hover:border-white/30'
                }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="hidden sm:flex gap-3 lg:gap-4">
          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">settings</span>
          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">help</span>
        </div>
        <button className="bg-primary-container text-on-primary-container px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-headline font-bold tracking-wider shadow-[0_0_20px_rgba(99,138,255,0.4)] hover:shadow-[0_0_30px_rgba(99,138,255,0.6)] active:scale-95 transition-all"
          onClick={handleConnect}
          title={user ? 'Log out' : 'Connect wallet'}
        >
          {user ? (
            <span className="flex items-center gap-2 max-w-[140px] sm:max-w-[220px]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="User avatar"
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px] rounded-full object-cover border border-white/40"
                />
              ) : (
                <span className="w-[22px] h-[22px] rounded-full border border-white/40 bg-white/20 text-[10px] flex items-center justify-center">
                  {initial}
                </span>
              )}
              <span className="truncate max-w-[110px] sm:max-w-[180px]">{displayName}</span>
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </header>
  );
}
