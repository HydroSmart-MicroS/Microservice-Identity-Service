import { migrateIdentity } from './iam/application/internal/eventhandlers/ApplicationReadyEventHandler.js';
import { BetterAuthMigrationRunner } from './iam/infrastructure/persistence/postgresql/migrations/BetterAuthMigrationRunner.js';
import {closeRpcClient} from './shared/infrastructure/messaging/RabbitRpc.js';
try{await migrateIdentity(new BetterAuthMigrationRunner());}
finally{await closeRpcClient();}

