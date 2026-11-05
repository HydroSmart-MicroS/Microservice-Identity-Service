import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
const context=new AsyncLocalStorage<string>();
export const requestId=()=>context.getStore()??randomUUID();
export const safePath=(url:string)=>url.split('?')[0].replace(/\/api\/auth\/reset-password\/[^/]+/g,'/api/auth/reset-password/:token').replace(/\/[A-Za-z0-9_-]{20,}/g,'/:id');
export function trace(req:IncomingMessage,res:ServerResponse,handle:()=>Promise<void>){
 const supplied=req.headers['x-request-id'];
 const id=typeof supplied==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(supplied)?supplied:randomUUID();
 res.setHeader('X-Request-ID',id);const start=performance.now();
 res.once('finish',()=>console.log(JSON.stringify({event:'http_request',service:'identity',requestId:id,method:req.method,path:safePath(req.url??'/'),status:res.statusCode,durationMs:performance.now()-start})));
 return context.run(id,handle);
}
