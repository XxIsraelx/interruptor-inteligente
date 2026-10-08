/** Aplica as migrations da pasta drizzle/ (também roda no start da API). */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';
import { createPool } from './db.module';

export async function runMigrations() {
  const pool = createPool();
  try {
    await migrate(drizzle(pool), { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  require('dotenv/config');
  runMigrations()
    .then(() => console.log('Migrations aplicadas'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
