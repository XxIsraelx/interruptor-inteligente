'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useLiveStatus } from '@/lib/realtime';
import { LiveDot } from '../ui';
import { DevicesProvider } from './DevicesContext';
import { Brand, SidebarContent } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const live = useLiveStatus();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <DevicesProvider>
      <div className="flex min-h-dvh">
        {/* Menu lateral fixo (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra superior (celular/tablet) */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur lg:hidden">
            <button
              onClick={() => setOpen(true)}
              className="-ml-2 rounded-lg p-2 text-text-2 hover:bg-surface-2"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Brand />
            <span className="flex w-9 justify-end" title={live ? 'Ao vivo' : 'Reconectando'}>
              <LiveDot live={live} />
            </span>
          </header>

          <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      {/* Menu em gaveta (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="slide-in-left absolute inset-y-0 left-0 w-72 border-r border-border bg-sidebar shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-5 right-3 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </DevicesProvider>
  );
}

/** Título da página + subtítulo + ações à direita. */
export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}
