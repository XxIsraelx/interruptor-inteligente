'use client';

import { Activity, Gauge, Sigma, Waves, Zap, type LucideIcon } from 'lucide-react';
import { fmt } from '@/lib/format';
import { useAnimatedNumber } from '@/lib/hooks';
import type { Device, LivePoint } from '@/lib/types';
import { Sparkline } from '../charts/Sparkline';

function Tile({
  label,
  value,
  icon: Icon,
  hint,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4" title={hint}>
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs">{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-auto pt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Grandezas do PZEM: potência em destaque (com mini-gráfico) + tensão, corrente, FP, frequência e energia. */
export function MetricTiles({ device, color, series }: { device: Device; color: string; series: LivePoint[] }) {
  const on = device.online && device.relayOn;
  const val = <T,>(v: T) => (device.online ? v : null);
  const watts = useAnimatedNumber(device.online ? (device.relayOn ? (device.power ?? 0) : 0) : null);
  const [num, unit] = fmt.wattsParts(watts);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      <div className="col-span-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface md:col-span-4 xl:col-span-2">
        <div className="flex items-start justify-between px-4 pt-4">
          <div>
            <span className="text-xs text-muted">Potência agora</span>
            <p className={`mt-1 text-4xl font-semibold tracking-tight ${on ? 'text-text' : 'text-muted'}`}>
              {num}
              {unit && <span className="ml-1 text-base font-medium text-muted">{unit}</span>}
            </p>
          </div>
          <Zap className="h-4 w-4 text-muted" />
        </div>
        <div className="mt-auto pt-2">
          <Sparkline data={series} color={color} height={60} />
        </div>
      </div>
      <Tile
        label="Tensão"
        value={fmt.volts(val(device.voltage))}
        icon={Waves}
        sub={device.online && device.frequency != null ? `${fmt.hz(device.frequency)} na rede` : undefined}
      />
      <Tile
        label="Corrente"
        value={fmt.amps(val(device.relayOn ? device.current : 0))}
        icon={Activity}
        sub={device.online ? (device.relayOn ? 'passando pela tomada' : 'relé desligado') : 'sem leitura'}
      />
      <Tile
        label="Fator de potência"
        value={fmt.pf(val(device.relayOn ? device.powerFactor : null))}
        icon={Gauge}
        hint="Quanto da corrente vira trabalho útil (1,00 = ideal)"
        sub="ideal: 1,00"
      />
      <Tile
        label="Energia do sensor"
        value={fmt.kwh(device.energy)}
        icon={Sigma}
        hint="Contador acumulado do PZEM-004T"
        sub="contador do PZEM"
      />
    </div>
  );
}
