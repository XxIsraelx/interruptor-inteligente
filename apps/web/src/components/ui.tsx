'use client';

import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-surface ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  sub,
  right,
  icon,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 text-muted">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

/** Rótulo pequeno em caixa alta, usado acima de números grandes. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.08em] text-muted ${className}`}>{children}</p>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md font-medium transition ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
            value === o.value ? 'bg-surface-3 text-text shadow-sm' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Online/Offline: cor de status sempre com ponto + texto. */
export function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        online ? 'border-good/30 bg-good/10 text-green-300' : 'border-border bg-surface-2 text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-good' : 'bg-muted'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export function LiveDot({ live = true, className = '' }: { live?: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      {live && <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-accent" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-accent' : 'bg-critical'}`} />
    </span>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
  );
}

export function Empty({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-10 text-center text-sm text-muted ${className}`}>{children}</div>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

/** Número grande + unidade menor (ex.: 1,23 kW). */
export function BigNumber({
  value,
  unit,
  size = 'lg',
  dim = false,
}: {
  value: string;
  unit?: string;
  size?: 'md' | 'lg' | 'xl';
  dim?: boolean;
}) {
  const cls = size === 'xl' ? 'text-5xl sm:text-6xl' : size === 'lg' ? 'text-4xl' : 'text-[28px]';
  return (
    <p className={`font-semibold tracking-tight ${cls} ${dim ? 'text-muted' : 'text-text'}`}>
      {value}
      {unit && <span className="ml-1.5 text-[0.45em] font-medium tracking-normal text-muted">{unit}</span>}
    </p>
  );
}
