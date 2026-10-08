'use client';

import Link from 'next/link';
import { withAlpha } from '@/lib/colors';
import { fmt } from '@/lib/format';
import { useAnimatedNumber } from '@/lib/hooks';
import type { Device, LivePoint } from '@/lib/types';
import { Sparkline } from '../charts/Sparkline';
import { DeviceIcon } from '../DeviceIcon';
import { RelaySwitch } from '../RelaySwitch';
import { StatusPill } from '../ui';

/** Card de uma tomada: potência ao vivo, mini-gráfico dos últimos minutos, consumo do dia e chave. */
export function DeviceTile({
  device,
  color,
  series,
  share,
}: {
  device: Device;
  color: string;
  series: LivePoint[];
  share?: number;
}) {
  const active = device.online && device.relayOn;
  const watts = useAnimatedNumber(device.online ? (device.relayOn ? (device.power ?? 0) : 0) : null);
  const [num, unit] = fmt.wattsParts(watts);
  const href = `/device?id=${encodeURIComponent(device.id)}`;

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-surface transition hover:border-border-strong hover:bg-[#111821]">
      {/* área clicável inteira (a chave fica por cima) */}
      <Link href={href} className="absolute inset-0 rounded-2xl" aria-label={`Abrir ${device.name}`} />

      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: withAlpha(color, active ? 0.16 : 0.08), color: active ? color : '#7b889a' }}
          >
            <DeviceIcon name={device.icon} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-tight">{device.name}</h3>
            <p className="truncate text-xs text-muted">{device.location || device.id}</p>
          </div>
        </div>
        <StatusPill online={device.online} />
      </div>

      <div className="flex items-end justify-between gap-3 px-5 pt-4">
        <div>
          <p className={`text-[32px] leading-none font-semibold tracking-tight ${active ? 'text-text' : 'text-muted'}`}>
            {num}
            {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
          </p>
          <p className="tabular mt-1.5 text-xs text-muted">
            {device.online ? (
              <>
                {fmt.volts(device.voltage)} · {fmt.amps(device.relayOn ? device.current : 0)}
                {device.relayOn && device.powerFactor ? <> · FP {fmt.pf(device.powerFactor)}</> : null}
              </>
            ) : (
              <>última leitura {fmt.ago(device.lastSeenAt)}</>
            )}
          </p>
        </div>
      </div>

      {/* acima do link para o tooltip do mini-gráfico funcionar no hover */}
      <div className="relative z-[5] mt-3 px-1">
        <Sparkline data={series} color={color} height={64} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
        <div className="min-w-0 text-xs">
          <p className="text-muted">Hoje</p>
          <p className="tabular truncate font-semibold text-text-2">
            {fmt.kwh(device.kwhToday ?? 0)}
            <span className="font-normal text-muted"> · {fmt.brl(device.costToday ?? 0)}</span>
            {share != null && share > 0 && <span className="font-normal text-muted"> · {fmt.pct(share)} da casa</span>}
          </p>
        </div>
        <RelaySwitch device={device} />
      </div>
    </article>
  );
}
