import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserQueryService } from '../../domain/services/UserQueryService.js';
import { toResource } from './transform/AuthenticatedUserResourceFromEntityAssembler.js';
export class UsersController {
  constructor(private readonly users: UserQueryService) {}
  async me(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { res.writeHead(401).end(); return; }
    try {
      const user = await this.users.handle({ token: header.slice(7) });
      res.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify(toResource(user)));
    } catch { res.writeHead(401).end(); }
  }
}
