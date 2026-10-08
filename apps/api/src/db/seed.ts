/**
 * Gera 7 dias de histórico falso para os dispositivos de demonstração,
 * para os gráficos já aparecerem cheios. Uso: pnpm db:seed (depois de pnpm db:migrate)
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seedDemoHistory } from '../demo/demo-data';
import { createPool } from './db.module';

async function main() {
  const pool = createPool();
  try {
    await seedDemoHistory(drizzle(pool), 7);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
