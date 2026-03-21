"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export default function Header() {
  const pathname = usePathname();
  const { setShowAuthFlow, handleLogOut, user } = useDynamicContext();

  const handleConnect = () => {
    if (user) {
      handleLogOut();
    } else {
      setShowAuthFlow(true);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const primaryWallet = user?.verifiedCredentials.find(
    (credential) => credential.format === 'blockchain'
  );

  const userProfile = user as {
    username?: string;
    alias?: string;
    email?: string;
    profilePictureUrl?: string;
    avatar?: string;
    picture?: string;
  } | null;

  const avatarUrl =
    userProfile?.profilePictureUrl ||
    userProfile?.avatar ||
    userProfile?.picture ||
    null;

  const displayName =
    userProfile?.username ||
    userProfile?.alias ||
    (userProfile?.email ? userProfile.email.split('@')[0] : null) ||
    (primaryWallet?.address ? truncateAddress(primaryWallet.address) : null) ||
    'Connected';

  const initial = displayName.charAt(0).toUpperCase();

  const navLinks = [
    { name: 'Lobby', href: '/lobby' },
    { name: 'Arena', href: '/arena' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-surface shadow-[0_0_24px_rgba(65,117,255,0.08)] backdrop-blur-md border-b border-outline-variant/10">
      <Link href="/" className="text-2xl font-black text-white italic tracking-tighter uppercase font-headline hover:scale-105 transition-transform">
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

      <div className="flex items-center gap-6">
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">settings</span>
          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">help</span>
        </div>
        <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-headline font-bold tracking-wider shadow-[0_0_20px_rgba(99,138,255,0.4)] hover:shadow-[0_0_30px_rgba(99,138,255,0.6)] active:scale-95 transition-all"
          onClick={handleConnect}
          title={user ? 'Log out' : 'Connect wallet'}
        >
          {user ? (
            <span className="flex items-center gap-2 max-w-[220px]">
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
              <span className="truncate max-w-[180px]">{displayName}</span>
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </header>
  );
}
