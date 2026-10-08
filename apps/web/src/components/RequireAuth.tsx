'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/api';
import { AppHeader } from './AppHeader';

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setOk(true);
  }, [router]);

  if (!ok) return null;
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
