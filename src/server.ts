import {readiness} from './shared/infrastructure/health/ServiceHealth.js';
import {PgAccountDeletionRepository} from './iam/infrastructure/persistence/postgresql/repositories/PgAccountDeletionRepository.js';
import {RabbitDeletionGateway} from './iam/infrastructure/messaging/RabbitDeletionGateway.js';
import {BetterAuthPasswordVerifier} from './iam/infrastructure/authentication/betterauth/services/BetterAuthPasswordVerifier.js';
import {trace} from './shared/infrastructure/messaging/RequestTrace.js';
import {AccountDeletionService} from './iam/application/internal/commandservices/AccountDeletionService.js';
import {accountDeletionController} from './iam/interfaces/rest/AccountDeletionController.js';
import { startIdentityOutbox } from './shared/infrastructure/messaging/IdentityOutbox.js';
import { createServer } from 'node:http';
import { startRpcServer,brokerHealth } from './shared/infrastructure/messaging/RabbitRpc.js';
import { auth,pool } from './iam/infrastructure/authentication/betterauth/services/BetterAuthService.js';
import { JwtTokenService } from './iam/infrastructure/tokens/jwt/services/JwtTokenService.js';
import { PgUserRepository } from './iam/infrastructure/persistence/postgresql/repositories/PgUserRepository.js';
import { isInternalService } from './iam/infrastructure/authorization/configuration/InternalServiceAuthorization.js';
import { UserQueryServiceImpl } from './iam/application/internal/queryservices/UserQueryServiceImpl.js';
import {UserDirectoryQueryServiceImpl} from './iam/application/internal/queryservices/UserDirectoryQueryServiceImpl.js';
import { IamContextFacade } from './iam/interfaces/acl/IamContextFacade.js';
import { UsersController } from './iam/interfaces/rest/UsersController.js';
import {createAuthenticationHandler} from './iam/interfaces/rest/AuthenticationController.js';

// pg supports a per-query timeout; its QueryConfig declaration omits this option.
const databaseProbe={text:'SELECT 1',query_timeout:1500};
const users = new UsersController(new UserQueryServiceImpl(new JwtTokenService()));
const iam = new IamContextFacade(new UserDirectoryQueryServiceImpl(new PgUserRepository(pool)));
const authenticationHandler=createAuthenticationHandler(request=>auth.handler(request),process.env.BETTER_AUTH_URL!);
const deletion=new AccountDeletionService(new PgAccountDeletionRepository(pool),new RabbitDeletionGateway(),new BetterAuthPasswordVerifier());
const deletionController=accountDeletionController(deletion);
const server = createServer((req, res) => trace(req,res,async()=>{
  const path = (req.url ?? '/').split('?')[0];
  const json = (status: number, body: unknown) => {
    res.writeHead(status, {'content-type':'application/json'}).end(JSON.stringify(body));
  };
  try {
    if(req.method==='GET'&&path.startsWith('/health')){
      res.setHeader('Cache-Control','no-store');
      if(path==='/health/live')return json(200,{status:'UP',service:'identity',components:{application:{status:'UP'}}});
      if(path==='/health/ready'){
        const result=await readiness({database:async()=>{await pool.query(databaseProbe);return {ready:true,details:{type:'PostgreSQL',check:'SELECT 1',message:'La base de datos responde.'}};},rabbitmq:brokerHealth});
        return json(result.status==='UP'?200:503,result);
      }
    }
    if(path==='/api/v1/iam/deletion')return await deletionController(req,res);
    if (req.method === 'GET' && path === '/api/v1/iam/me') return await users.me(req,res);
    if (req.method === 'GET' && path.startsWith('/internal/v1/tenants/')) {
      if (!isInternalService(req.headers['x-service-token'])) return json(401,{error:'unauthorized'});
      const id = decodeURIComponent(path.slice('/internal/v1/tenants/'.length));
      return json(await iam.isTenant(id)?200:404,{});
    }
    if (req.method === 'GET' && path.startsWith('/internal/v1/users/')) {
      if (!isInternalService(req.headers['x-service-token'])) return json(401,{error:'unauthorized'});
      const id=decodeURIComponent(path.slice('/internal/v1/users/'.length));
      const result=await iam.findById(id);
      return json(result?200:404,result??{});
    }
    if (path.startsWith('/api/auth/')) return await authenticationHandler(req,res);
    return json(404,{error:'not_found'});
  } catch {
    if (!res.headersSent) json(503,{error:'service_unavailable'}); else res.end();
  }
}));
server.listen(Number(process.env.PORT ?? 8080),'0.0.0.0',()=>{void startRpcServer('identity');startIdentityOutbox(pool);deletion.start();});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{void pool.end();}));
