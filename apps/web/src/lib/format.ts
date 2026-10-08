const nf = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });

export const fmt = {
  watts: (w: number | null | undefined) => (w == null ? '—' : w >= 1000 ? `${nf(2, 2).format(w / 1000)} kW` : `${nf(0, 0).format(w)} W`),
  volts: (v: number | null | undefined) => (v == null ? '—' : `${nf(1, 1).format(v)} V`),
  amps: (a: number | null | undefined) => (a == null ? '—' : `${nf(2, 2).format(a)} A`),
  kwh: (k: number | null | undefined) => (k == null ? '—' : `${nf(k < 10 ? 2 : 1, k < 10 ? 3 : 1).format(k)} kWh`),
  hz: (f: number | null | undefined) => (f == null ? '—' : `${nf(1, 1).format(f)} Hz`),
  pf: (p: number | null | undefined) => (p == null ? '—' : nf(2, 2).format(p)),
  brl: (v: number | null | undefined) =>
    v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  pct: (v: number) => `${nf(0, 0).format(v * 100)}%`,
  time: (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  dateTime: (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
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
