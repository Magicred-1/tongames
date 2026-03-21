import React from 'react';
import Image from 'next/image';
import Header from '@/components/Header';

export default function SelectionPage() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-white pb-32">
      <Header />
      <div className="bg-surface-container-low h-[2px] w-full fixed top-20 z-50"></div>

      {/* Main Content Canvas */}
      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto min-h-screen relative z-10">
        {/* Header Section */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-secondary">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-robotomono text-xs uppercase tracking-[0.2em]">Live Arena Pre-Match</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-headline uppercase tracking-tighter italic">Finalize Entry</h1>
            <p className="text-outline text-lg max-w-xl font-light">Select your combatant class and commit your stakes to the smart contract. Once the duel begins, there is no turning back.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-outline-variant/20 flex items-center space-x-6">
            <div className="text-right">
              <p className="text-outline text-[10px] uppercase tracking-widest mb-1">Current Pot</p>
              <p className="text-3xl font-black font-headline text-white">2,500 TON</p>
            </div>
            <div className="h-12 w-[1px] bg-outline-variant/30"></div>
            <div className="text-right">
              <p className="text-outline text-[10px] uppercase tracking-widest mb-1">Players Ready</p>
              <p className="text-3xl font-black font-headline text-secondary">7/8</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Character Selection */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold uppercase tracking-widest border-l-4 border-primary-container pl-4">Choose Your Class</h2>
              <span className="text-outline font-robotomono text-xs">ENCOUNTER_ID: 0x82...f92</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Titan Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/50 transition-all duration-500 cursor-pointer">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                  <span className="material-symbols-outlined text-8xl">shield</span>
                </div>
                <div className="p-8 space-y-6 flex flex-col h-full">
                  <div>
                    <h3 className="text-3xl font-black font-headline italic tracking-tighter text-white mb-2">TITAN</h3>
                    <p className="text-xs font-robotomono text-primary uppercase">Front-Line Vanguard</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Durability</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Offense</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                      </div>
                    </div>
                  </div>
                  <ul className="text-sm text-on-surface/70 space-y-2 mt-auto">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Kinetic Barrier</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Gravity Slam</li>
                  </ul>
                </div>
              </div>

              {/* Shadow Card (Selected) */}
              <div className="group relative overflow-hidden rounded-2xl bg-surface-container border-2 border-primary-container shadow-[0_0_30px_rgba(99,138,255,0.2)] transition-all duration-500 cursor-pointer transform md:-translate-y-4">
                <div className="absolute -top-4 -right-4 bg-primary-container text-on-primary-container font-headline font-black italic px-6 py-1 rotate-12 z-10 text-xs">SELECTED</div>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <span className="material-symbols-outlined text-8xl text-primary">visibility_off</span>
                </div>
                <div className="p-8 space-y-6 flex flex-col h-full">
                  <div>
                    <h3 className="text-3xl font-black font-headline italic tracking-tighter text-white mb-2">SHADOW</h3>
                    <p className="text-xs font-robotomono text-secondary uppercase">Precision Infiltrator</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Durability</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Offense</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                      </div>
                    </div>
                  </div>
                  <ul className="text-sm text-on-surface/70 space-y-2 mt-auto">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Cloak Mode</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Neural Spike</li>
                  </ul>
                </div>
              </div>

              {/* Spellweaver Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/50 transition-all duration-500 cursor-pointer">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                  <span className="material-symbols-outlined text-8xl">auto_fix_high</span>
                </div>
                <div className="p-8 space-y-6 flex flex-col h-full">
                  <div>
                    <h3 className="text-3xl font-black font-headline italic tracking-tighter text-white mb-2">SPELLWEAVER</h3>
                    <p className="text-xs font-robotomono text-primary uppercase">Arcane Tactician</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Durability</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                        <div className="h-1.5 w-6 bg-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-outline">Offense</span>
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                        <div className="h-1.5 w-6 bg-secondary"></div>
                      </div>
                    </div>
                  </div>
                  <ul className="text-sm text-on-surface/70 space-y-2 mt-auto">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Mana Burst</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs text-secondary">check_circle</span> Phase Blink</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Betting Interface */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-panel p-8 rounded-2xl border border-outline-variant/20 space-y-8">
              <h2 className="font-headline text-2xl font-bold uppercase tracking-widest text-white">The Stake</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-robotomono text-[10px] uppercase tracking-widest text-outline">Select Asset</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-surface-container-highest border-2 border-primary-container text-white py-3 rounded-lg font-headline font-bold flex items-center justify-center gap-2">
                      <Image src="/assets/avatar_warrior.webp" alt="TON" width={20} height={20} className="w-5 h-5 rounded-full" />
                      TON
                    </button>
                    <button className="bg-surface-container-low border border-outline-variant/30 text-outline py-3 rounded-lg font-headline font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors">
                      <Image src="/assets/avatar_mage.webp" alt="USDC" width={20} height={20} className="w-5 h-5 rounded-full" />
                      USDC
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-robotomono text-[10px] uppercase tracking-widest text-outline">Bet Amount</label>
                    <span className="text-[10px] font-robotomono text-primary">Balance: 420.69 TON</span>
                  </div>
                  <div className="relative group">
                    <input className="w-full bg-surface-container-lowest border-none focus:ring-2 ring-primary-container text-white text-3xl font-black font-headline p-5 rounded-xl transition-all outline-none" placeholder="0.00" type="number" />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                      <button className="px-2 py-1 bg-surface-container-highest rounded text-[10px] font-bold text-outline hover:text-white">MAX</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-tertiary-container/10 p-5 rounded-xl border border-tertiary-container/20 space-y-3">
                <div className="flex items-center gap-3 text-tertiary-container">
                  <span className="material-symbols-outlined">warning</span>
                  <span className="font-headline font-black uppercase tracking-widest text-sm italic">The Winner Takes All!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-on-surface/60 font-body">Once committed, funds are locked in the smart contract. Loss in battle results in total forfeit of stakes. Play responsibly.</p>
              </div>
              <button className="w-full bg-secondary text-[#00210b] py-5 rounded-xl font-headline font-black uppercase tracking-[0.2em] text-lg glow-secondary active:scale-[0.98] transition-all transform hover:-translate-y-1">
                Commit Bet
              </button>
              <div className="pt-4 flex flex-col items-center space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-surface bg-surface-container-highest" title="User 1"></div>
                    <div className="w-6 h-6 rounded-full border-2 border-surface bg-primary" title="User 2"></div>
                    <div className="w-6 h-6 rounded-full border-2 border-surface bg-secondary" title="User 3"></div>
                  </div>
                  <span className="text-[10px] font-robotomono text-outline italic">Transaction hashing...</span>
                </div>
                <div className="w-full bg-outline-variant/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[65%]" style={{ boxShadow: '0 0 10px #638aff' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
}
