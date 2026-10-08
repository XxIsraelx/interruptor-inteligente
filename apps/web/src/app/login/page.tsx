'use client';

import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, setToken } from '@/lib/api';
import { closeSocket } from '@/lib/realtime';
import { Spinner } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>('/auth/login', { method: 'POST', json: { password } });
      setToken(token);
      closeSocket(); // reconecta o tempo real com o token novo
      router.replace('/');
    } catch (e) {
      setError((e as Error).message === 'Failed to fetch' ? 'Não foi possível falar com a API' : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white dark:text-black">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-semibold">Interruptor Inteligente</h1>
            <p className="text-xs text-muted">Entre para ver e controlar suas tomadas</p>
          </div>
        </div>
        <label className="block text-xs text-muted">
          Senha
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-accent font-semibold text-white disabled:opacity-50 dark:text-black"
        >
          {loading ? <Spinner /> : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
