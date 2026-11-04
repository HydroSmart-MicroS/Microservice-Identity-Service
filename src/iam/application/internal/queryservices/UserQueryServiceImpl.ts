import { User } from '../../../domain/model/aggregates/User.js';
import type { UserQueryService } from '../../../domain/services/UserQueryService.js';
import type { GetAuthenticatedUserQuery } from '../../../domain/model/queries/GetAuthenticatedUserQuery.js';
import type { TokenVerifier } from '../outboundservices/tokens/TokenVerifier.js';
export class UserQueryServiceImpl implements UserQueryService {
  constructor(private readonly tokens: TokenVerifier) {}
  async handle(query: GetAuthenticatedUserQuery): Promise<User> {
    const identity = await this.tokens.verify(query.token);
    return new User(identity.userId, identity.profileType);
  }
}
