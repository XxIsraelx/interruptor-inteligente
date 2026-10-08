'use client';

import { Activity, CalendarDays, Gauge, Plug } from 'lucide-react';
import Link from 'next/link';
import { ConsumptionChart } from '@/components/ConsumptionChart';
import { DeviceCard } from '@/components/DeviceCard';
import { RequireAuth } from '@/components/RequireAuth';
import { Card, CardHeader, Empty, Stat } from '@/components/ui';
import { fmt } from '@/lib/format';
import { useDevices, useOverview } from '@/lib/hooks';

function Dashboard() {
  const { devices, error } = useDevices();
  const { data: ov } = useOverview();

  // Potência total calculada ao vivo a partir dos cards
  const powerNow = (devices ?? []).reduce((s, d) => s + (d.online && d.relayOn ? d.power ?? 0 : 0), 0);
  const online = (devices ?? []).filter((d) => d.online).length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Gauge className="mb-2 h-4 w-4 text-power" />
          <Stat label="Potência agora" value={fmt.watts(powerNow)} tone="power" />
        </Card>
        <Card className="p-4">
          <Activity className="mb-2 h-4 w-4 text-accent" />
          <Stat label="Hoje" value={fmt.kwh(ov?.kwhToday)} sub={fmt.brl(ov?.costToday)} />
        </Card>
        <Card className="p-4">
          <CalendarDays className="mb-2 h-4 w-4 text-accent" />
          <Stat label="Este mês" value={fmt.kwh(ov?.kwhMonth)} sub={fmt.brl(ov?.costMonth)} />
        </Card>
        <Card className="p-4">
          <Plug className="mb-2 h-4 w-4 text-muted" />
          <Stat label="Dispositivos" value={devices ? `${online}/${devices.length}` : '—'} sub="online" />
        </Card>
      </section>

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">Erro ao carregar: {error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Tomadas</h2>
        {devices && devices.length === 0 && (
          <Card>
            <Empty>
              Nenhum dispositivo ainda. Ligue o ESP32 (ou ative{' '}
              <code className="rounded bg-surface-2 px-1">DEMO_SIMULATOR=true</code> na API) e ele aparece aqui sozinho.
            </Empty>
          </Card>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {devices?.map((d) => <DeviceCard key={d.id} device={d} />)}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConsumptionChart title="Consumo da casa" />
        </div>
        <Card>
          <CardHeader title="Quem mais consome" sub="No mês" />
          {ov && ov.ranking.length === 0 && <Empty>Sem dados</Empty>}
          <ul className="space-y-3 px-5 pb-5">
            {ov?.ranking.map((r) => (
              <li key={r.id}>
                <Link href={`/device?id=${encodeURIComponent(r.id)}`} className="block hover:opacity-80">
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate">{r.name}</span>
                    <span className="tabular shrink-0 text-muted">
                      {fmt.kwh(r.kwhMonth)} · {fmt.brl(r.costMonth)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(r.share * 100, 1)}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
