'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { colorMap } from '@/lib/colors';
import { useDevices } from '@/lib/hooks';
import type { Device } from '@/lib/types';

interface DevicesCtx {
  devices: Device[] | null;
  error: string | null;
  colors: Record<string, string>;
  reload: () => void;
}

const Ctx = createContext<DevicesCtx | null>(null);

/** Uma única lista de dispositivos (com tempo real) compartilhada por menu lateral e páginas. */
export function DevicesProvider({ children }: { children: ReactNode }) {
  const { devices, error, reload } = useDevices();
  const ids = (devices ?? []).map((d) => d.id).join('|');
  // A cor depende só da ordem de cadastro (a API devolve por createdAt)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => colorMap(ids ? ids.split('|') : []), [ids]);
  const reloadCb = useCallback(() => void reload(), [reload]);
  return <Ctx.Provider value={{ devices, error, colors, reload: reloadCb }}>{children}</Ctx.Provider>;
}

export function useDevicesContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDevicesContext fora do DevicesProvider');
  return ctx;
}
