'use client';

/** Caixa de tooltip padrão dos gráficos: o valor em destaque, o nome em seguida. */
export function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { color?: string; label: string; value: string; strong?: boolean }[];
}) {
  return (
    <div className="min-w-[150px] rounded-xl border border-border-strong bg-[#0b1016]/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 text-muted">{title}</p>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />}
            <span className={`tabular ${r.strong ? 'font-semibold text-text' : 'font-medium text-text'}`}>{r.value}</span>
            <span className="truncate text-muted">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const AXIS_TICK = { fill: '#7b889a', fontSize: 11 };
export const GRID_STROKE = '#1d2530';
export const SURFACE = '#0f141b';
