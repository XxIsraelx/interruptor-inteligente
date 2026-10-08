'use client';

import { Plug } from 'lucide-react';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { BillCard } from '@/components/dashboard/BillCard';
import { ConsumptionByDevice } from '@/components/dashboard/ConsumptionByDevice';
import { DeviceTile } from '@/components/dashboard/DeviceTile';
import { LiveHero } from '@/components/dashboard/LiveHero';
import { TodayCard } from '@/components/dashboard/TodayCard';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader } from '@/components/shell/AppShell';
import { useDevicesContext } from '@/components/shell/DevicesContext';
import { Card, Empty } from '@/components/ui';
import { fmt } from '@/lib/format';
import { useHouseConsumption, useLive, useOverview } from '@/lib/hooks';

const LIVE_MINUTES = 15;

function Dashboard() {
  const { devices, error, colors } = useDevicesContext();
  const overview = useOverview();
  const today = useHouseConsumption('day');
  const live = useLive(LIVE_MINUTES);
  const totalToday = (devices ?? []).reduce((s, d) => s + (d.kwhToday ?? 0), 0);

  return (
    <>
      <PageHeader title="Visão geral" sub={fmt.longDate()} />

      {error && <p className="mb-4 rounded-xl border border-critical/30 bg-critical-soft px-4 py-3 text-sm text-red-300">Erro ao carregar: {error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="md:col-span-2 xl:col-span-6">
          <LiveHero devices={devices} total={live?.total ?? null} minutes={LIVE_MINUTES} />
        </div>
        <div className="xl:col-span-3">
          <TodayCard overview={overview} hours={today?.buckets ?? null} />
        </div>
        <div className="xl:col-span-3">
          <BillCard overview={overview} />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Tomadas</h2>
          {devices && (
            <span className="text-xs text-muted">
              {devices.filter((d) => d.online).length} de {devices.length} online
            </span>
          )}
        </div>
        {devices && devices.length === 0 ? (
          <Card>
            <Empty>
              <Plug className="mx-auto mb-2 h-5 w-5" />
              Nenhuma tomada ainda. Ligue o ESP32 e ela aparece aqui sozinha.
            </Empty>
          </Card>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {(devices ?? []).map((d) => (
              <DeviceTile
                key={d.id}
                device={d}
                color={colors[d.id]}
                series={live?.devices[d.id] ?? []}
                share={totalToday ? (d.kwhToday ?? 0) / totalToday : undefined}
              />
            ))}
            {!devices && [0, 1, 2].map((i) => <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-surface" />)}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ConsumptionByDevice devices={devices} colors={colors} />
        </div>
        <div className="xl:col-span-4">
          <ActivityFeed devices={devices} colors={colors} />
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
