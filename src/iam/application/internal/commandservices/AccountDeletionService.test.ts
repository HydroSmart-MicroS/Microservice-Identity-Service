import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountDeletionService} from './AccountDeletionService.js';
import type {DeletionJob,DeletionRepository,DeletionGateway} from '../outboundservices/AccountDeletionPorts.js';
function setup(){
 const calls:string[]=[];let failed='';let job:DeletionJob|null=null;let completed=0,retries=0;
 const repository:DeletionRepository={passwordHash:async()=>'hash',create:async(user,units)=>{job={id:'ticket',user_id:user,unit_ids:units,phase:0};return 'ticket';},due:async()=>job?[{...job}]:[],advance:async(_id,phase)=>{job!.phase=phase;},complete:async()=>{completed++;job=null;},retry:async()=>{retries++;},purge:async()=>{}};
 const gateway:DeletionGateway={call:async(service,_user,action='')=>{calls.push(service+action);if(failed===service+action)throw Error('offline');return {unitIds:['unit']};}};
 const service=new AccountDeletionService(repository,gateway,{verify:async(_hash,password)=>password==='correct'});
 return {service,calls,fail:(value:string)=>{failed=value;},counts:()=>({completed,retries})};
}
test('wrong password cannot reserve or delete context data',async()=>{
 const t=setup();await assert.rejects(t.service.request('user','wrong'),{status:400});assert.deepEqual(t.calls,[]);
});
test('failed preparation releases the reservations already made',async()=>{
 const t=setup();t.fail('billing/prepare');await assert.rejects(t.service.request('user','correct'));
 assert.deepEqual(t.calls,['properties/prepare','billing/prepare','properties/release']);
});
test('interrupted erasure resumes from the persisted phase and completes once',async()=>{
 const t=setup();const result=await t.service.request('user','correct');assert.equal(result.retentionDays,365);
 t.fail('reports/erase');await t.service.resume();assert.deepEqual(t.counts(),{completed:0,retries:1});
 t.fail('');await t.service.resume();await t.service.resume();assert.deepEqual(t.counts(),{completed:1,retries:1});
 assert.equal(t.calls.filter(x=>x==='properties/erase').length,1);assert.equal(t.calls.filter(x=>x==='reports/erase').length,2);
 assert.deepEqual(t.calls.slice(-3),['reports/erase','notifications/erase','billing/erase']);
});
