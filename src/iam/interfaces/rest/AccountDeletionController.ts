import type {IncomingMessage,ServerResponse} from 'node:http';
import {auth} from '../../infrastructure/authentication/betterauth/services/BetterAuthService.js';
import type {AccountDeletion} from '../../domain/services/AccountDeletion.js';
import {DeletionBlocked} from '../../domain/model/valueobjects/DeletionBlocked.js';
export function accountDeletionController(service:AccountDeletion){
 const attempts=new Map<string,{count:number;until:number}>();
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const json=(status:number,body:unknown)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(body));};
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
  const session=await auth.api.getSession({headers});if(!session)return json(401,{message:'Inicia sesión para continuar.'});
  if(req.method==='GET'){try{return json(200,await service.check(session.user.id));}catch(e){if(e instanceof DeletionBlocked)return json(e.status,{message:e.message});throw e;}}
  if(req.method!=='POST')return json(405,{message:'Método no permitido.'});
  const origins=(process.env.TRUSTED_ORIGINS??process.env.BETTER_AUTH_URL??'').split(',');
  if(!origins.includes(req.headers.origin??''))return json(403,{message:'Confirma la eliminación desde HydroSmart.'});
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))return json(415,{message:'Envía una solicitud JSON.'});
  const now=Date.now();for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
  const limit=attempts.get(session.user.id)??{count:0,until:now+15*60*1000};
  if(limit.count>=5)return json(429,{message:'Espera 15 minutos antes de volver a intentar.'});
  limit.count++;attempts.set(session.user.id,limit);
  let size=0;const chunks:Buffer[]=[];
  for await(const chunk of req){const part=Buffer.from(chunk);size+=part.length;if(size>4096)return json(413,{message:'Solicitud demasiado grande.'});chunks.push(part);}
  let body:any;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(400,{message:'Solicitud inválida.'});}
  if(body?.confirmation!=='ELIMINAR'||typeof body.password!=='string'||body.password.length>128)return json(400,{message:'Ingresa tu contraseña actual y escribe ELIMINAR.'});
  try{return json(202,await service.request(session.user.id,body.password));}catch(e){if(e instanceof DeletionBlocked)return json(e.status,{message:e.message});throw e;}
 };
}
