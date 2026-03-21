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
    </div>
  );
}
