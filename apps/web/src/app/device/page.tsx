'use client';

import { ChevronRight, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ConsumptionChart } from '@/components/device/ConsumptionChart';
import { InfoCard } from '@/components/device/InfoCard';
import { MetricTiles } from '@/components/device/MetricTiles';
import { PowerChart } from '@/components/device/PowerChart';
import { SchedulesCard } from '@/components/device/SchedulesCard';
import { SettingsDrawer } from '@/components/device/SettingsDrawer';
import { SummaryCard } from '@/components/device/SummaryCard';
import { Timeline } from '@/components/device/Timeline';
import { DeviceIcon } from '@/components/DeviceIcon';
import { RelaySwitch } from '@/components/RelaySwitch';
import { RequireAuth } from '@/components/RequireAuth';
import { useDevicesContext } from '@/components/shell/DevicesContext';
import { Card, Empty, Skeleton, StatusPill } from '@/components/ui';
import { withAlpha } from '@/lib/colors';
import { fmt } from '@/lib/format';
import { useLive, useTick } from '@/lib/hooks';

function DeviceView({ id }: { id: string }) {
  const { devices, colors, reload } = useDevicesContext();
  const live = useLive(15);
  const [settings, setSettings] = useState(false);
  useTick(5000);

  const device = devices?.find((d) => d.id === id);
  if (!devices)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-36" />
        <Skeleton className="h-80" />
      </div>
    );
  if (!device)
    return (
      <Card>
        <Empty>
          Dispositivo não encontrado.{' '}
          <Link href="/" className="text-accent hover:underline">
            Voltar para a visão geral
          </Link>
        </Empty>
      </Card>
    );

  const color = colors[device.id];
  const active = device.online && device.relayOn;

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted" aria-label="Navegação">
        <Link href="/" className="hover:text-text">
          Visão geral
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-text-2">{device.name}</span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: withAlpha(color, active ? 0.16 : 0.08), color: active ? color : '#7b889a' }}
          >
            <DeviceIcon name={device.icon} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{device.name}</h1>
              <StatusPill online={device.online} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {device.location && <>{device.location} · </>}
              última leitura {fmt.ago(device.lastSeenAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RelaySwitch device={device} size="lg" showLabel />
          <button
            onClick={() => setSettings(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-text-2 transition hover:border-border-strong hover:text-text"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
        </div>
      </header>

      <MetricTiles device={device} color={color} series={live?.devices[device.id] ?? []} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <PowerChart deviceId={device.id} color={color} />
        </div>
        <div className="xl:col-span-4">
          <SummaryCard device={device} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ConsumptionChart deviceId={device.id} color={color} />
        </div>
        {/* a linha do tempo acompanha a altura do gráfico ao lado e rola por dentro */}
        <div className="relative xl:col-span-4">
          <Timeline deviceId={device.id} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SchedulesCard deviceId={device.id} />
        <InfoCard device={device} />
      </div>

      <SettingsDrawer device={device} open={settings} onClose={() => setSettings(false)} onSaved={() => reload()} />
    </div>
  );
}

// /device?id=<id> (query string em vez de /devices/[id] porque o build é estático)
function DevicePage() {
  const id = useSearchParams().get('id');
  if (!id) return <p className="text-sm text-muted">Dispositivo não informado.</p>;
  return <DeviceView key={id} id={id} />;
}

export default function Page() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <DevicePage />
      </Suspense>
    </RequireAuth>
  );
}
