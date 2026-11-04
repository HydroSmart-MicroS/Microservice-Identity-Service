import type { IdentityMigrations } from '../outboundservices/persistence/IdentityMigrations.js';
export async function migrateIdentity(migrations: IdentityMigrations): Promise<void> {
  await migrations.run();
}

