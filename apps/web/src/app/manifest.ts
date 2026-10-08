import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Interruptor Inteligente',
    short_name: 'Interruptor',
    description: 'Consumo de energia e controle das suas tomadas',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0f14',
    theme_color: '#0d9488',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
