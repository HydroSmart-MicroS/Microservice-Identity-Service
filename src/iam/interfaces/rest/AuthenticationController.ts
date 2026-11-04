// Better Auth owns registration, password hashing, sessions, sign-in and sign-out.
import type {IncomingMessage,ServerResponse} from 'node:http';
import {InputError,validateAuthInput} from './AuthInputValidation.js';
export function createAuthenticationHandler(handle:(request:Request)=>Promise<Response>,baseURL:string){
return async function authenticationHandler(req:IncomingMessage,res:ServerResponse):Promise<void>{
  try{
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
    let body:string|undefined;
    if(req.method!=='GET'&&req.method!=='HEAD'){
      const limit=512*1024;
      if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))throw new InputError('Envía la solicitud como application/json.',415);
      if(Number(req.headers['content-length'])>limit){req.resume();throw new InputError('La solicitud supera el límite de 512 KB.',413);}
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){const data=Buffer.from(chunk);size+=data.length;if(size>limit)throw new InputError('La solicitud supera el límite de 512 KB.',413);chunks.push(data);}
      let parsed:unknown;try{parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new InputError('Envía un objeto JSON válido.');}
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new InputError('Envía un objeto JSON válido.');
      validateAuthInput((req.url??'').split('?')[0].replace(/^\/api\/auth/,''),parsed as Record<string,unknown>);
      body=JSON.stringify(parsed);headers.delete('content-length');headers.set('content-type','application/json');
    }
    const response=await handle(new Request(new URL(req.url??'/',baseURL),{method:req.method,headers,body}));
    res.statusCode=response.status;
    response.headers.forEach((value,key)=>{if(key!=='set-cookie')res.setHeader(key,value);});
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){if(!(error instanceof InputError))throw error;res.writeHead(error.status,{'content-type':'application/json'}).end(JSON.stringify({message:error.message}));}
}
}
