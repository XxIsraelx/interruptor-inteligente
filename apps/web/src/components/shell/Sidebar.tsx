'use client';

import { LayoutGrid, LogOut, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { setToken } from '@/lib/api';
import { fmt } from '@/lib/format';
import { closeSocket, useLiveStatus } from '@/lib/realtime';
import { LiveDot } from '../ui';
import { useDevicesContext } from './DevicesContext';

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.25)]">
        <Zap className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Interruptor</span>
        <span className="block text-xs text-muted">Inteligente</span>
      </span>
    </Link>
  );
}

// Usa useSearchParams: no build estático precisa ficar dentro de <Suspense> (ver SidebarContent).
function DeviceLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { devices, colors } = useDevicesContext();
  const pathname = usePathname();
  const idParam = useSearchParams().get('id');
  const activeId = pathname === '/device' ? idParam : null;
  if (!devices) return <div className="space-y-2 px-3">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-surface-2" />)}</div>;
  if (devices.length === 0) return <p className="px-3 text-xs text-muted">Nenhuma tomada ainda</p>;
  return (
    <ul className="space-y-0.5">
      {devices.map((d) => {
        const active = activeId === d.id;
        const status = !d.online ? 'offline' : !d.relayOn ? 'desligado' : fmt.watts(d.power ?? 0);
        return (
          <li key={d.id}>
            <Link
              href={`/device?id=${encodeURIComponent(d.id)}`}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? 'bg-surface-3 text-text' : 'text-text-2 hover:bg-surface-2 hover:text-text'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[d.id] }} />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className={`tabular shrink-0 text-xs ${d.online && d.relayOn ? 'text-text-2' : 'text-muted'}`}>{status}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const live = useLiveStatus();
  const { devices } = useDevicesContext();
  const online = (devices ?? []).filter((d) => d.online).length;

  function logout() {
    setToken(null);
    closeSocket();
    router.replace('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-6">
        <Brand />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        <Link
          href="/"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            pathname === '/' ? 'bg-surface-3 text-text' : 'text-text-2 hover:bg-surface-2 hover:text-text'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Visão geral
        </Link>

        <div>
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Tomadas</p>
            {devices && (
              <span className="tabular text-[11px] text-muted">
                {online}/{devices.length} online
              </span>
            )}
          </div>
          <Suspense fallback={null}>
            <DeviceLinks onNavigate={onNavigate} />
          </Suspense>
        </div>
      </nav>

      <div className="space-y-1 border-t border-border px-3 py-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-muted" title={live ? 'Recebendo dados em tempo real' : 'Reconectando...'}>
          <LiveDot live={live} />
          {live ? 'Conectado ao vivo' : 'Reconectando…'}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-2 transition hover:bg-surface-2 hover:text-text"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
