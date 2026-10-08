'use client';

import { Activity, CalendarClock, Eye, EyeOff, Lock, Power, Receipt, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { closeSocket } from '@/lib/realtime';

const FEATURES = [
  { icon: Activity, title: 'Consumo ao vivo', text: 'Tensão, corrente e potência de cada tomada a cada 5 segundos.' },
  { icon: Power, title: 'Controle remoto', text: 'Liga e desliga de qualquer lugar, com confirmação do dispositivo.' },
  { icon: Receipt, title: 'Custo em reais', text: 'Quanto cada aparelho gasta e a previsão da conta do mês.' },
  { icon: CalendarClock, title: 'Automações', text: 'Agendamentos por horário e desligamento por excesso de potência.' },
];

/** Linhas de "onda" decorativas do painel da esquerda. */
function Waves() {
  return (
    <svg className="absolute inset-x-0 bottom-0 h-56 w-full opacity-60" viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="wv" x1="0" x2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
          <stop offset="40%" stopColor="#34d399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${120 + i * 18} C 120 ${60 + i * 20}, 220 ${180 - i * 10}, 340 ${110 + i * 12} S 560 ${50 + i * 25}, 680 ${120 + i * 8} S 780 ${150 - i * 10}, 800 ${110 + i * 14}`}
          fill="none"
          stroke="url(#wv)"
          strokeWidth={1.5 - i * 0.3}
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
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
      setError((e as Error).message === 'Failed to fetch' ? 'Não foi possível falar com o servidor' : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de apresentação (desktop) */}
      <section className="relative hidden overflow-hidden border-r border-border bg-sidebar p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />
        <Waves />

        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Interruptor Inteligente</span>
        </div>

        <div className="relative my-auto max-w-lg py-16">
          <h1 className="text-[44px] leading-[1.05] font-semibold tracking-tight">
            Sua energia,
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">em tempo real.</span>
          </h1>
          <p className="mt-4 text-base text-text-2">
            Monitore e controle as tomadas da casa pela internet — cada aparelho com seu consumo, seu custo e seu histórico.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted">ESP32 · PZEM-004T · Relé · MQTT</p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950">
              <Zap className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Interruptor Inteligente</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
          <p className="mt-1.5 text-sm text-muted">Digite a senha de acesso ao painel.</p>

          <label className="mt-8 block text-xs font-medium text-muted" htmlFor="password">
            Senha
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-3 pr-11 pl-10 text-sm text-text outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_rgba(52,211,153,0.08)]"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-text"
              aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-accent font-semibold text-slate-950 shadow-[0_8px_30px_rgba(52,211,153,0.2)] transition hover:bg-emerald-300 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <Spinner /> : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
