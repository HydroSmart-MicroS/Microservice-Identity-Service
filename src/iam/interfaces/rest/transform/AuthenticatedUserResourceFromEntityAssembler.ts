import type { User } from '../../../domain/model/aggregates/User.js';
import type { AuthenticatedUserResource } from '../resources/AuthenticatedUserResource.js';
export function toResource(user: User): AuthenticatedUserResource {
  return { userId: user.userId, profileType: user.profileType, permissions: user.permissions };
}
