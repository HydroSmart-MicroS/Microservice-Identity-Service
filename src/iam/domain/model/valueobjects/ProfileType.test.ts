import test from 'node:test';
import assert from 'node:assert/strict';
import {isProfileType,permissions} from './ProfileType.js';
test('only owners and tenants are valid; owners manage their assignments',()=>{
 assert.equal(isProfileType('propietario'),true);
 assert.equal(isProfileType('inquilino'),true);
 assert.equal(isProfileType('arrendador'),false);
 assert.ok(permissions.propietario.includes('tenancy:manage:own'));
 assert.ok(!permissions.inquilino.includes('tenancy:manage:own'));
});
