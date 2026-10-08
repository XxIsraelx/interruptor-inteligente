'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ConsumptionChart } from '@/components/ConsumptionChart';
import { DeviceIcon } from '@/components/DeviceIcon';
import { DeviceSettings } from '@/components/DeviceSettings';
import { EventsList } from '@/components/EventsList';
import { PowerChart } from '@/components/PowerChart';
import { RelayButton } from '@/components/RelayButton';
import { RequireAuth } from '@/components/RequireAuth';
import { SchedulesPanel } from '@/components/SchedulesPanel';
import { Card, Stat, StatusPill } from '@/components/ui';
import { fmt } from '@/lib/format';
import { useDevice, useTick } from '@/lib/hooks';

function DeviceView({ id }: { id: string }) {
  const { device, setDevice, error } = useDevice(id);
  useTick(5000);

  if (error) return <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  if (!device) return null;

  const on = device.online && device.relayOn;
  const val = <T,>(v: T) => (device.online ? v : null);

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}>
              <DeviceIcon name={device.icon} className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{device.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusPill online={device.online} />
                {device.location && <span>{device.location}</span>}
                <span>· última leitura {fmt.ago(device.lastSeenAt)}</span>
                {device.rssi != null && device.online && <span>· Wi-Fi {device.rssi} dBm</span>}
              </div>
            </div>
          </div>
          <RelayButton device={device} size="lg" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Potência" value={fmt.watts(val(device.relayOn ? device.power : 0))} tone="power" />
          <Stat label="Tensão" value={fmt.volts(val(device.voltage))} />
          <Stat label="Corrente" value={fmt.amps(val(device.relayOn ? device.current : 0))} />
          <Stat label="Energia (sensor)" value={fmt.kwh(device.energy)} tone="accent" />
          <Stat label="Frequência" value={fmt.hz(val(device.frequency))} />
          <Stat label="Fator de potência" value={fmt.pf(val(device.powerFactor))} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PowerChart deviceId={id} />
        <ConsumptionChart deviceId={id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <EventsList deviceId={id} />
        <SchedulesPanel deviceId={id} />
        <DeviceSettings device={device} onSaved={(d) => setDevice((cur) => ({ ...(cur ?? d), ...d }))} />
      </div>
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
