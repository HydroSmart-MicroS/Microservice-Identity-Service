import {rpc} from '../../../shared/infrastructure/messaging/RabbitRpc.js';
import type {DeletionGateway} from '../../application/internal/outboundservices/AccountDeletionPorts.js';
import {DeletionBlocked} from '../../domain/model/valueobjects/DeletionBlocked.js';
export class RabbitDeletionGateway implements DeletionGateway {
 async call(service:string,user:string,action='',body?:unknown){
  const response=await rpc(service,'/internal/v1/privacy/'+encodeURIComponent(user)+action,{'X-Service-Token':process.env.INTERNAL_SERVICE_TOKEN!,'Content-Type':'application/json'},action?'POST':'GET',body);
  const value=response.body?JSON.parse(Buffer.from(response.body,'base64').toString()):{};
  if(response.status!==200)throw new DeletionBlocked(response.status===409?409:503,typeof value.detail==='string'?value.detail:typeof value.message==='string'?value.message:'Revisa las asignaciones activas y los pagos pendientes antes de eliminar tu cuenta.');
  return value;
 }
}
