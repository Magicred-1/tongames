import Image from 'next/image';
import Header from '@/components/Header';

export default function VictoryPage() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-white pb-32">
      <Header />

      {/* Main Content Area */}
      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto min-h-screen relative z-10">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Victory Header */}
          <div className="space-y-4">
            <h1 className="text-7xl md:text-9xl font-black font-headline uppercase tracking-tighter italic victory-glow text-secondary">
              Victory
            </h1>
            <div className="flex items-center justify-center gap-4">
              <span className="h-[2px] w-12 bg-outline-variant/30"></span>
              <span className="font-robotomono text-sm uppercase tracking-[0.4em] text-outline">Arena Match #502</span>
              <span className="h-[2px] w-12 bg-outline-variant/30"></span>
            </div>
          </div>

          {/* Rewards Card */}
          <div className="w-full max-w-4xl glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Reward Item 1 */}
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto bg-surface-container-highest rounded-2xl flex items-center justify-center border border-outline-variant/20 shadow-xl">
                  <span className="material-symbols-outlined text-5xl text-secondary">military_tech</span>
                </div>
                <div className="space-y-1">
                  <p className="text-outline text-[10px] uppercase tracking-widest">XP Gained</p>
                  <p className="text-3xl font-black font-headline text-white">+2,450</p>
                </div>
              </div>

              {/* Reward Item 2 (The Medal) */}
              <div className="space-y-4 relative">
                <div className="absolute inset-0 bg-secondary/5 blur-3xl rounded-full"></div>
                <div className="relative w-32 h-32 mx-auto">
                  <Image
                    src="/assets/victory_medal.webp"
                    alt="Victory Medal"
                    width={128}
                    height={128}
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(125,255,162,0.4)]"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-outline text-[10px] uppercase tracking-widest">Chest Unlocked</p>
                  <p className="text-3xl font-black font-headline text-secondary italic">LEGENDARY</p>
                </div>
              </div>

              {/* Reward Item 3 */}
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto bg-surface-container-highest rounded-2xl flex items-center justify-center border border-outline-variant/20 shadow-xl">
                  <Image
                    src="/assets/reward_token.webp"
                    alt="TON Token"
                    width={64}
                    height={64}
                    className="w-16 h-16"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-outline text-[10px] uppercase tracking-widest">TON Won</p>
                  <p className="text-3xl font-black font-headline text-white">42.50</p>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-16 pt-12 border-t border-outline-variant/10">
              <div className="flex justify-between items-end mb-4">
                <div className="text-left">
                  <p className="text-outline text-[10px] uppercase tracking-widest mb-1">Level 42 Progress</p>
                  <p className="text-xl font-bold font-headline text-white">Shadow Walker <span className="text-secondary">LVL 43</span></p>
                </div>
                <span className="font-robotomono text-sm text-outline">85% to Next Level</span>
              </div>
              <div className="flex gap-1">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-3 flex-1 rounded-sm ${i < 17 ? 'bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.4)]' : 'bg-surface-container-highest'}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg">
            <button className="flex-1 bg-primary-container text-on-primary-container py-5 rounded-xl font-headline font-black uppercase tracking-widest text-lg hover:shadow-[0_0_30px_rgba(99,138,255,0.4)] active:scale-95 transition-all">
              Claim All
            </button>
            <button className="flex-1 bg-surface-container-high border border-outline-variant/30 text-white py-5 rounded-xl font-headline font-black uppercase tracking-widest text-lg hover:bg-surface-container-highest active:scale-95 transition-all">
              Return to Lobby
            </button>
          </div>
        </div>
      </main>

      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-mesh opacity-40"></div>
    </div>
  );
}
