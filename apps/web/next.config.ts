import type { NextConfig } from 'next';

// Build estático (HTML/JS/CSS em ./out): em produção quem serve é a própria API,
// então front, API e WebSocket ficam na mesma origem.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
