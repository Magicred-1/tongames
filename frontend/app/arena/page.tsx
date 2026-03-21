import Header from '@/components/Header';
import { ArenaClient } from './client';

export default function ArenaPage() {
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tongames.vercel.app';
  const lobbyConnectApiUrl = `${baseAppUrl}/api/connect-sync`;
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* TopAppBar */}
      <Header />
      
      {/* Client Component for Interactivity */}
      <ArenaClient lobbyConnectApiUrl={lobbyConnectApiUrl} />

      {/* BottomNavBar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 sm:px-4 pb-4 sm:pb-6 pt-2 bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant/15 shadow-[0_-8px_32px_rgba(1,9,52,0.5)] md:hidden">
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
