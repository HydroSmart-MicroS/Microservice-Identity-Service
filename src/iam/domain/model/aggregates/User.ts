import { permissions, type ProfileType } from '../valueobjects/ProfileType.js';
export class User {
  constructor(readonly userId: string, readonly profileType: ProfileType) {}
  get permissions(): readonly string[] { return permissions[this.profileType]; }
}
