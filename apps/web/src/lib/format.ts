const nf = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });

export const TZ = 'America/Sao_Paulo';

function kwhNumber(k: number) {
  const a = Math.abs(k);
  const d = a === 0 ? 0 : a < 1 ? 3 : a < 10 ? 2 : 1;
  return nf(d, d).format(k);
}

export const fmt = {
  /** 649 W · 1,23 kW */
  watts: (w: number | null | undefined) =>
    w == null ? '—' : Math.abs(w) >= 1000 ? `${nf(2, 2).format(w / 1000)} kW` : `${nf(0, 0).format(w)} W`,
  /** Separa número e unidade (para o número grande com unidade menor) */
  wattsParts: (w: number | null | undefined): [string, string] =>
    w == null ? ['—', ''] : Math.abs(w) >= 1000 ? [nf(2, 2).format(w / 1000), 'kW'] : [nf(0, 0).format(w), 'W'],
  volts: (v: number | null | undefined) => (v == null ? '—' : `${nf(1, 1).format(v)} V`),
  amps: (a: number | null | undefined) => (a == null ? '—' : `${nf(2, 2).format(a)} A`),
  /** 0,072 kWh · 4,86 kWh · 36,6 kWh */
  kwh: (k: number | null | undefined) => (k == null ? '—' : `${kwhNumber(k)} kWh`),
  kwhNum: (k: number | null | undefined) => (k == null ? '—' : kwhNumber(k)),
  hz: (f: number | null | undefined) => (f == null ? '—' : `${nf(1, 1).format(f)} Hz`),
  pf: (p: number | null | undefined) => (p == null ? '—' : nf(2, 2).format(p)),
  brl: (v: number | null | undefined) =>
    v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  pct: (v: number) => `${nf(0, 0).format(v * 100)}%`,
  time: (d: string | number | Date) =>
    new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }),
  dateTime: (d: string | number | Date) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: TZ }),
  /** Quinta-feira, 8 de outubro */
  longDate: (d: Date = new Date()) => {
    const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  monthName: (d: Date = new Date()) => d.toLocaleDateString('pt-BR', { month: 'long', timeZone: TZ }),
  /** 3h 12min · 45min · 30 s */
  duration: (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)} s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
  },
  ago: (iso: string | null) => {
    if (!iso) return 'nunca';
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 10) return 'agora';
    if (s < 60) return `há ${s} s`;
    if (s < 3600) return `há ${Math.round(s / 60)} min`;
    if (s < 86400) return `há ${Math.round(s / 3600)} h`;
    return `há ${Math.round(s / 86400)} d`;
  },
};
