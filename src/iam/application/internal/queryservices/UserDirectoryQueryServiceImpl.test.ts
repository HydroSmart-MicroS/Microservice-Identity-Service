import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UserDirectoryQueryServiceImpl} from './UserDirectoryQueryServiceImpl.js';
test('directory delegates to its repository and rejects oversized identifiers without a query',async()=>{
 let queries=0;const user={id:'tenant',name:'Test',email:'test@example.com',profileType:'inquilino' as const};
 const service=new UserDirectoryQueryServiceImpl({isTenant:async()=>{queries++;return true;},findById:async()=>{queries++;return user;}});
 assert.equal(await service.findById('tenant'),user);assert.equal(await service.isTenant('tenant'),true);
 assert.equal(await service.findById('x'.repeat(256)),null);assert.equal(await service.isTenant(''),false);assert.equal(queries,2);
});
