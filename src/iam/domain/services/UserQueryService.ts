import type { User } from '../model/aggregates/User.js';
import type { GetAuthenticatedUserQuery } from '../model/queries/GetAuthenticatedUserQuery.js';
export interface UserQueryService { handle(query: GetAuthenticatedUserQuery): Promise<User>; }
