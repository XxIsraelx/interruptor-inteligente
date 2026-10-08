'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Zap } from 'lucide-react';
import { setToken } from '@/lib/api';
import { closeSocket, useLiveStatus } from '@/lib/realtime';

export function AppHeader() {
  const live = useLiveStatus();
  const router = useRouter();

  function logout() {
    setToken(null);
    closeSocket();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white dark:text-black">
            <Zap className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Interruptor Inteligente</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted" title={live ? 'Recebendo dados em tempo real' : 'Reconectando...'}>
            <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-accent' : 'bg-danger'}`} />
            {live ? 'Ao vivo' : 'Offline'}
          </span>
          <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
