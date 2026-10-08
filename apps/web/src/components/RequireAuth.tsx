'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/api';
import { AppShell } from './shell/AppShell';

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setOk(true);
  }, [router]);

  if (!ok) return null;
  return <AppShell>{children}</AppShell>;
}
