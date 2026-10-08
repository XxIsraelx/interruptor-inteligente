'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { useSocketEvent } from './realtime';
import type {
  Device,
  DeviceEvent,
  DeviceSummary,
  HouseConsumption,
  LiveData,
  LivePoint,
  Overview,
  Period,
  Reading,
} from './types';

/** Busca periódica simples, mantendo o último valor enquanto recarrega (sem "piscar"). */
function usePolling<T>(path: string | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    load();
    if (!intervalMs) return;
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);
  return { data, error, reload: load, setData };
}

/** Lista de dispositivos sempre atualizada via WebSocket. */
export function useDevices() {
  const { data: devices, error, reload, setData } = usePolling<Device[]>('/devices', 60_000);

  useSocketEvent<Device>('device:update', (d) => {
    setData((list) => {
      if (!list) return list;
      const idx = list.findIndex((x) => x.id === d.id);
      if (idx === -1) {
        reload(); // dispositivo novo apareceu
        return list;
      }
      const next = [...list];
      next[idx] = { ...list[idx], ...d };
      return next;
    });
  });

  return { devices, error, reload };
}

/** Um dispositivo, atualizado em tempo real. */
export function useDevice(id: string) {
  const { data: device, error, reload, setData } = usePolling<Device>(`/devices/${encodeURIComponent(id)}`, 0);
  useSocketEvent<Device>('device:update', (d) => {
    if (d.id === id) setData((cur) => ({ ...(cur ?? d), ...d }));
  });
  return { device, setDevice: setData, error, reload };
}

export function useOverview() {
  const { data } = usePolling<Overview>('/stats/overview', 30_000);
  return data;
}

export function useHouseConsumption(period: Period) {
  const { data } = usePolling<HouseConsumption>(`/stats/consumption?period=${period}`, 60_000);
  return data;
}

export function useDeviceSummary(id: string) {
  const { data } = usePolling<DeviceSummary>(`/devices/${encodeURIComponent(id)}/summary`, 30_000);
  return data;
}

/**
 * Potência dos últimos `minutes` minutos, por aparelho e total da casa, em janelas de 10 s.
 * Carrega o histórico curto da API e depois só acrescenta as leituras que chegam pelo WebSocket.
 */
export function useLive(minutes = 15) {
  const [state, setState] = useState<{ devices: Record<string, LivePoint[]>; total: LivePoint[] } | null>(null);
  const latest = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    api<LiveData>(`/stats/live?minutes=${minutes}`)
      .then((d) => {
        if (!alive) return;
        for (const [id, pts] of Object.entries(d.devices)) latest.current[id] = pts[pts.length - 1]?.p ?? 0;
        setState({ devices: d.devices, total: d.total });
      })
      .catch(() => alive && setState({ devices: {}, total: [] }));
    return () => {
      alive = false;
    };
  }, [minutes]);

  const push = useCallback(
    (deviceId: string, t: number, p: number) => {
      const cutoff = Date.now() - minutes * 60_000;
      latest.current[deviceId] = p;
      const bin = Math.floor(t / 10_000) * 10_000;
      const total = Object.values(latest.current).reduce((s, v) => s + v, 0);
      setState((cur) => {
        if (!cur) return cur;
        const series = (cur.devices[deviceId] ?? []).filter((x) => x.t >= cutoff);
        const last = series[series.length - 1];
        const nextSeries = last && last.t === bin ? [...series.slice(0, -1), { t: bin, p }] : [...series, { t: bin, p }];
        const tot = cur.total.filter((x) => x.t >= cutoff);
        const lastTot = tot[tot.length - 1];
        const nextTotal =
          lastTot && lastTot.t === bin ? [...tot.slice(0, -1), { t: bin, p: total }] : [...tot, { t: bin, p: total }];
        return { devices: { ...cur.devices, [deviceId]: nextSeries }, total: nextTotal };
      });
    },
    [minutes],
  );

  useSocketEvent<Reading>('reading', (r) => push(r.deviceId, new Date(r.ts).getTime(), r.power ?? 0));

  // Aparelho que caiu não pode continuar somando a última potência no total
  useSocketEvent<Device>('device:update', (d) => {
    if (!d.online || !d.relayOn) latest.current[d.id] = 0;
  });

  return state;
}

/** Linha do tempo (da casa toda ou de um aparelho), com eventos novos chegando ao vivo. */
export function useEvents(deviceId?: string, limit = 30) {
  const path = deviceId ? `/devices/${encodeURIComponent(deviceId)}/events?limit=${limit}` : `/events?limit=${limit}`;
  const [events, setEvents] = useState<(DeviceEvent & { fresh?: boolean })[] | null>(null);

  useEffect(() => {
    let alive = true;
    api<DeviceEvent[]>(path)
      .then((e) => alive && setEvents(e))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [path]);

  useSocketEvent<DeviceEvent>('event', (ev) => {
    if (deviceId && ev.deviceId !== deviceId) return;
    setEvents((cur) => [{ ...ev, fresh: true }, ...(cur ?? [])].slice(0, limit));
  });

  return events;
}

/** Força re-render periódico (para textos tipo "há 5 s"). */
export function useTick(ms = 5000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** Número que "anda" até o valor novo (leituras ao vivo sem pulos bruscos). */
export function useAnimatedNumber(value: number | null | undefined, duration = 500) {
  const [display, setDisplay] = useState<number | null>(value ?? null);
  const from = useRef<number | null>(value ?? null);

  useEffect(() => {
    if (value == null) {
      setDisplay(null);
      from.current = null;
      return;
    }
    const start = from.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (start == null || reduce || start === value) {
      setDisplay(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = start + (value - start) * eased;
      setDisplay(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}
