import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safePath} from './RequestTrace.js';
test('password recovery links and query tokens never enter request paths in logs',()=>{
 assert.equal(safePath('/api/auth/reset-password/secret?callbackURL=/app/reset-password'),'/api/auth/reset-password/:token');
 assert.equal(safePath('/app/reset-password?token=secret'),'/app/reset-password');
 assert.equal(safePath('/api/auth/get-session'),'/api/auth/get-session');
});
