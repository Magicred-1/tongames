import Image from 'next/image';

export default function ArenaPage() {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-surface shadow-[0_0_24px_rgba(65,117,255,0.08)]">
        <div className="text-2xl font-black text-white italic tracking-tighter uppercase font-headline">TON Games</div>
        <nav className="hidden md:flex items-center gap-10">
          <a className="font-headline font-bold uppercase tracking-widest text-outline hover:text-white transition-colors" href="#">Lobby</a>
          <a className="font-headline font-bold uppercase tracking-widest text-secondary border-b-2 border-secondary pb-1" href="#">Arena</a>
          <a className="font-headline font-bold uppercase tracking-widest text-outline hover:text-white transition-colors" href="#">Vault</a>
          <a className="font-headline font-bold uppercase tracking-widest text-outline hover:text-white transition-colors" href="#">History</a>
        </nav>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">settings</span>
            <span className="material-symbols-outlined text-outline cursor-pointer hover:text-white transition-all active:scale-95">help</span>
          </div>
          <button className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-headline font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(99,138,255,0.4)] active:scale-95 transition-all">
            Connect Wallet
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="pt-24 pb-32 px-6 min-h-screen flex flex-col gap-8 max-w-[1600px] mx-auto relative z-10">
        {/* Arena Header: Prize Pool & Global Stats */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="font-label text-secondary uppercase tracking-[0.3em] text-sm">Active Arena Session</span>
            <h1 className="font-headline font-black text-5xl italic text-white uppercase tracking-tighter">FATAL FOUR-WAY #502</h1>
          </div>
          {/* Prize Pool Display */}
          <div className="glass-panel p-6 rounded-xl flex flex-col items-center min-w-[320px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
            <span className="font-label text-outline uppercase text-xs tracking-widest mb-1 relative z-10">Total Prize Pool</span>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="font-headline font-black text-4xl text-secondary">88,400</span>
              <span className="font-robotomono text-primary font-bold">TON</span>
            </div>
          </div>
        </div>

        {/* Combat Grid: 4 Player Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[650px]">
          {/* Left Wing: Combat Log */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h3 className="font-headline font-bold uppercase text-outline text-sm tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              Live Combat Log
            </h3>
            <div className="glass-panel rounded-xl flex-1 p-4 overflow-y-auto font-robotomono text-xs space-y-3 border-l-4 border-secondary/30">
              <div className="opacity-60 text-outline">[14:02:11] Game started.</div>
              <div className="text-on-surface"><span className="text-secondary">@CyberViper</span> joined seat 3.</div>
              <div className="text-on-surface"><span className="text-tertiary">@VoidWalker</span> rolled a <span className="text-white font-bold">18</span>!</div>
              <div className="bg-error-container/20 p-2 rounded border border-error/10">
                <span className="text-secondary font-bold">SPLASH DMG!</span> @VoidWalker dealt 20 DMG to all.
              </div>
              <div className="text-on-surface"><span className="text-secondary">@NexusNode</span> used <span className="text-primary-container">Energy Shield</span>.</div>
              <div className="text-on-surface"><span className="text-primary">@ShadowPulse</span> is charging...</div>
              <div className="text-on-surface"><span className="text-secondary">@CyberViper</span> rolled a <span className="text-white font-bold">12</span>.</div>
              <div className="text-outline italic">Calculating round winner...</div>
            </div>
          </div>

          {/* Central Arena Area: 2x2 Grid of Players */}
          <div className="lg:col-span-6 relative glass-panel rounded-3xl overflow-hidden border-2 border-primary-container/10 p-8">
            {/* Background Environment */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] opacity-20"></div>
            </div>
            {/* 4 Player Grid */}
            <div className="grid grid-cols-2 grid-rows-2 gap-8 h-full relative z-20">
              {/* Player 1: Top Left */}
              <div className="flex flex-col items-center justify-center gap-4 group p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                <div className="flex gap-1 mb-1">
                  <div className="hp-segment bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]"></div>
                  <div className="hp-segment bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]"></div>
                  <div className="hp-segment bg-surface-container-highest"></div>
                </div>
                <div className="relative">
                  <Image src="/assets/arena_particle.webp" alt="NexusNode" width={128} height={128} className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(99,138,255,0.4)]" />
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-surface-container-highest border-2 border-secondary rounded-lg flex items-center justify-center font-headline font-black text-secondary">12</div>
                </div>
                <div className="text-center">
                  <div className="font-headline font-bold text-white text-sm uppercase tracking-tight">@NexusNode</div>
                  <div className="font-robotomono text-[10px] text-secondary">DEFENDING</div>
                </div>
              </div>
              {/* Player 2: Top Right */}
              <div className="flex flex-col items-center justify-center gap-4 group p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                <div className="flex gap-1 mb-1">
                  <div className="hp-segment bg-tertiary-container shadow-[0_0_8px_rgba(255,87,26,0.6)]"></div>
                  <div className="hp-segment bg-surface-container-highest"></div>
                  <div className="hp-segment bg-surface-container-highest"></div>
                </div>
                <div className="relative">
                  <Image src="/assets/arena_overlay.webp" alt="VoidWalker" width={128} height={128} className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(255,87,26,0.4)]" />
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-surface-container-highest border-2 border-primary-container rounded-lg flex items-center justify-center font-headline font-black text-primary-container">08</div>
                </div>
                <div className="text-center">
                  <div className="font-headline font-bold text-white text-sm uppercase tracking-tight">@VoidWalker</div>
                  <div className="font-robotomono text-[10px] text-tertiary-container">WAITING</div>
                </div>
              </div>
              {/* Player 3: Bottom Left */}
              <div className="flex flex-col items-center justify-center gap-4 group p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                <div className="flex gap-1 mb-1">
                  <div className="hp-segment bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]"></div>
                  <div className="hp-segment bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]"></div>
                  <div className="hp-segment bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]"></div>
                </div>
                <div className="relative">
                  <Image src="/assets/arena_bg.webp" alt="CyberViper" width={128} height={128} className="w-32 h-32 object-contain grayscale group-hover:grayscale-0 transition-all drop-shadow-[0_0_15px_rgba(125,255,162,0.3)]" />
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-surface-container-highest border-2 border-secondary rounded-lg flex items-center justify-center font-headline font-black text-secondary">20</div>
                </div>
                <div className="text-center">
                  <div className="font-headline font-bold text-white text-sm uppercase tracking-tight">@CyberViper</div>
                  <div className="font-robotomono text-[10px] text-secondary">READY</div>
                </div>
              </div>
              {/* Player 4: Bottom Right */}
              <div className="flex flex-col items-center justify-center gap-4 group p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                <div className="flex gap-1 mb-1">
                  <div className="hp-segment bg-tertiary-container shadow-[0_0_8px_rgba(255,87,26,0.6)]"></div>
                  <div className="hp-segment bg-surface-container-highest"></div>
                  <div className="hp-segment bg-surface-container-highest"></div>
                </div>
                <div className="relative">
                  <div className="w-32 h-32 bg-surface-container-high rounded-full flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-4xl text-outline/30">person</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-surface-container-highest border-2 border-outline rounded-lg flex items-center justify-center font-headline font-black text-outline">--</div>
                </div>
                <div className="text-center">
                  <div className="font-headline font-bold text-white text-sm uppercase tracking-tight">@ShadowPulse</div>
                  <div className="font-robotomono text-[10px] text-outline">ROLLING...</div>
                </div>
              </div>
            </div>
            {/* Center Banner */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="px-8 py-3 bg-secondary text-on-secondary rounded-full font-headline font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_40px_rgba(125,255,162,0.4)] whitespace-nowrap">
                NexusNode Wins Turn!
              </div>
            </div>
          </div>

          {/* Right Wing: Live Betting & Stats */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Betting Stats Card */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h4 className="font-headline font-bold uppercase text-xs tracking-[0.2em] text-outline">Win Probability</h4>
                <span className="material-symbols-outlined text-primary text-lg">monitoring</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'NexusNode', prob: 42, color: 'secondary' },
                  { name: 'CyberViper', prob: 38, color: 'secondary' },
                  { name: 'VoidWalker', prob: 12, color: 'tertiary-container' },
                  { name: 'ShadowPulse', prob: 8, color: 'outline' },
                ].map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between font-label text-[10px] mb-1">
                      <span className="text-white">{p.name}</span>
                      <span className={`text-${p.color}`}>{p.prob}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className={`h-full bg-${p.color} w-[${p.prob}%]`} style={{ width: `${p.prob}%` }}></div>
                    </div>
                  </div>
                ))}
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

        {/* Featured Players Section (Bento Style) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 glass-panel p-6 rounded-3xl flex items-center gap-6 group cursor-pointer hover:bg-primary/5 transition-all">
            <div className="w-24 h-24 rounded-2xl bg-surface-container-highest overflow-hidden p-2 relative">
               <Image src="/assets/arena_bg.webp" alt="Top Player" width={96} height={96} className="w-full h-full group-hover:scale-110 transition-transform object-cover" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label text-secondary text-[10px] uppercase tracking-[0.2em]">Highest Win Streak</span>
              <h3 className="font-headline font-black text-2xl text-white italic tracking-tighter uppercase">CYBERVIPER</h3>
              <div className="flex gap-4 items-center mt-1">
                <span className="font-robotomono text-sm text-outline">Level 88</span>
                <span className="font-robotomono text-sm text-primary">12-0 Today</span>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
            <span className="font-label text-outline text-[10px] uppercase tracking-widest">Global Vault Size</span>
            <div className="flex flex-col">
              <span className="font-headline font-black text-3xl text-white">1.8M</span>
              <span className="font-robotomono text-xs text-primary-container uppercase">Toncoin Staked</span>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between bg-gradient-to-br from-tertiary-container/20 to-transparent">
            <span className="font-label text-outline text-[10px] uppercase tracking-widest">Active Battles</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline font-black text-4xl text-white">124</span>
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse mb-1"></span>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant/15 shadow-[0_-8px_32px_rgba(1,9,52,0.5)] md:hidden">
        <a className="flex flex-col items-center justify-center text-outline px-6 py-2 hover:text-white hover:bg-surface-variant/30 transition-transform active:scale-90" href="#">
          <span className="material-symbols-outlined mb-1">swords</span>
          <span className="font-robotomono text-[10px] uppercase tracking-tighter">Battle</span>
        </a>
        <a className="flex flex-col items-center justify-center text-outline px-6 py-2 hover:text-white hover:bg-surface-variant/30 transition-transform active:scale-90" href="#">
          <span className="material-symbols-outlined mb-1">shield</span>
          <span className="font-robotomono text-[10px] uppercase tracking-tighter">Inventory</span>
        </a>
        <a className="flex flex-col items-center justify-center text-outline px-6 py-2 hover:text-white hover:bg-surface-variant/30 transition-transform active:scale-90" href="#">
          <span className="material-symbols-outlined mb-1">casino</span>
          <span className="font-robotomono text-[10px] uppercase tracking-tighter">Betting</span>
        </a>
        <a className="flex flex-col items-center justify-center text-outline px-6 py-2 hover:text-white hover:bg-surface-variant/30 transition-transform active:scale-90" href="#">
          <span className="material-symbols-outlined mb-1">person</span>
          <span className="font-robotomono text-[10px] uppercase tracking-tighter">Profile</span>
        </a>
      </footer>
    </div>
  );
}
