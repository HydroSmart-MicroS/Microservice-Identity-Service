import type {AccountDeletion} from '../../../domain/services/AccountDeletion.js';
import {DeletionBlocked} from '../../../domain/model/valueobjects/DeletionBlocked.js';
import type {DeletionRepository,DeletionGateway,PasswordVerifier} from '../outboundservices/AccountDeletionPorts.js';
const contexts=['properties','telemetry','analytics','reports','notifications','billing'];
export class AccountDeletionService implements AccountDeletion {
 constructor(private readonly repository:DeletionRepository,private readonly gateway:DeletionGateway,private readonly passwords:PasswordVerifier){}
 async check(user:string){await this.gateway.call('properties',user);await this.gateway.call('billing',user);return {allowed:true,retentionDays:365};}
 async request(user:string,password:string){
  const hash=await this.repository.passwordHash(user);
  if(!hash||!await this.passwords.verify(hash,password))throw new DeletionBlocked(400,'La contraseña actual no es correcta.');
  const prepared:string[]=[];
  try{
   const properties=await this.gateway.call('properties',user,'/prepare',{});prepared.push('properties');
   await this.gateway.call('billing',user,'/prepare',{});prepared.push('billing');
   const ticket=await this.repository.create(user,properties.unitIds);
   return {ticket,state:'processing',retentionDays:365};
  }catch(e){await Promise.allSettled(prepared.map(service=>this.gateway.call(service,user,'/release',{})));throw e;}
 }
 private running=false;
 async resume(){
  if(this.running)return;this.running=true;
  try{
   for(const job of await this.repository.due()){
    try{
     for(let phase=job.phase;phase<contexts.length;phase++){
      await this.gateway.call(contexts[phase],job.user_id,'/erase',{unitIds:job.unit_ids});
      await this.repository.advance(job.id,phase+1);
     }
     await this.repository.complete(job);
     console.log(JSON.stringify({event:'account_deletion_completed',ticket:job.id}));
    }catch{await this.repository.retry(job.id);console.warn(JSON.stringify({event:'account_deletion_retry',ticket:job.id,phase:job.phase}));}
   }
   await this.repository.purge();
  }finally{this.running=false;}
 }
 start(){const timer=setInterval(()=>{void this.resume().catch(()=>console.warn('Account deletion worker unavailable'));},5000);timer.unref();}
}
