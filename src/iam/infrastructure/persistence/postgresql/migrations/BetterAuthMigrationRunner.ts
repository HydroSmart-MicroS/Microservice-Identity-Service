import { readFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { auth, pool } from '../../../authentication/betterauth/services/BetterAuthService.js';
import type { IdentityMigrations } from '../../../../application/internal/outboundservices/persistence/IdentityMigrations.js';
export class BetterAuthMigrationRunner implements IdentityMigrations {
  async run(): Promise<void> {
    try {
      const migration = await getMigrations(auth.options);
      await migration.runMigrations();
      await pool.query(await readFile(new URL('./broker.sql',import.meta.url),'utf8'));
      console.log('Identity schema and owner/tenant profiles migrated.');
    } finally { await pool.end(); }
  }
}

