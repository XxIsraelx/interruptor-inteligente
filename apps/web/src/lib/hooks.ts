'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useSocketEvent } from './realtime';
import type { Device, Overview } from './types';

/** Lista de dispositivos sempre atualizada via WebSocket. */
export function useDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await api<Device[]>('/devices'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // atualiza kWh/R$ do dia
    return () => clearInterval(t);
  }, [load]);

  useSocketEvent<Device>('device:update', (d) => {
    setDevices((list) => {
      if (!list) return list;
      const idx = list.findIndex((x) => x.id === d.id);
      if (idx === -1) {
        load(); // dispositivo novo apareceu
        return list;
      }
      const next = [...list];
      next[idx] = { ...list[idx], ...d };
      return next;
    });
  });

  return { devices, error, reload: load };
}

/** Um dispositivo, atualizado em tempo real. */
export function useDevice(id: string) {
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevice(await api<Device>(`/devices/${encodeURIComponent(id)}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent<Device>('device:update', (d) => {
    if (d.id === id) setDevice((cur) => ({ ...(cur ?? d), ...d }));
  });

  return { device, setDevice, error, reload: load };
}

export function useOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await api<Overview>('/stats/overview'));
    } catch {
      /* mostrado pelo useDevices */
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);
  return { data, reload: load };
}

/** Força re-render periódico (para textos tipo "há 5 s"). */
export function useTick(ms = 5000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
