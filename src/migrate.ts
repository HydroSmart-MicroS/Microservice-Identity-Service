import { migrateIdentity } from './iam/application/internal/eventhandlers/ApplicationReadyEventHandler.js';
import { BetterAuthMigrationRunner } from './iam/infrastructure/persistence/postgresql/migrations/BetterAuthMigrationRunner.js';
await migrateIdentity(new BetterAuthMigrationRunner());

