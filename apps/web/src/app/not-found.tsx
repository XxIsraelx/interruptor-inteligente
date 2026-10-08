import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">O endereço não existe ou foi movido.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Ir para a visão geral
        </Link>
      </div>
    </main>
  );
}
