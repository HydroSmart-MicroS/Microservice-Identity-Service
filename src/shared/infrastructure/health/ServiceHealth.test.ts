import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness} from './ServiceHealth.js';
test('every dependency is checked and errors never reveal connection secrets',async()=>{
 let checked=0;const result=await readiness({database:async()=>{throw Error('postgres://private:password@host');},rabbitmq:async()=>{checked++;return {ready:true,details:{connection:'UP'}};}});
 assert.equal(result.status,'DOWN');assert.equal(result.components.database.status,'DOWN');assert.equal(result.components.rabbitmq.status,'UP');assert.equal(checked,1);assert.ok(!JSON.stringify(result).includes('postgres://'));
});
test('missing receiver fails readiness even if broker connection succeeds',async()=>{
 assert.equal((await readiness({database:async()=>({ready:true}),rabbitmq:async()=>({ready:false,details:{connection:'UP',rpcReceiver:'DOWN'}})})).status,'DOWN');
 assert.equal((await readiness({database:async()=>({ready:true}),rabbitmq:async()=>({ready:true})})).status,'UP');
});
