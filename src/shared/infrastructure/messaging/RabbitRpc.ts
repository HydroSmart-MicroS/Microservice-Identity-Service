import {requestId} from './RequestTrace.js';
import amqp from 'amqplib';
import {randomUUID} from 'node:crypto';
type Frame={status:number;headers:Record<string,string>;body:string};
const destinations=new Set(['identity','properties','telemetry','analytics','reports','notifications','billing','config-service']);
export async function rpc(service:string,path:string,headers:Record<string,string>={},method='GET',body?:unknown):Promise<Frame>{
 if(!destinations.has(service)||!path.startsWith('/')||path.startsWith('//'))throw new Error('Invalid broker destination');
 const connection=await amqp.connect(process.env.RABBITMQ_URL!,{timeout:4000});
 try{
  const channel=await connection.createConfirmChannel();
  const {queue}=await channel.assertQueue('',{exclusive:true,autoDelete:true});
  const correlationId=randomUUID();
  let timer:NodeJS.Timeout;
  const answer=new Promise<Frame>((resolve,reject)=>{
   timer=setTimeout(()=>reject(new Error('Broker timeout')),12000);
   channel.on('return',()=>reject(new Error('Broker route unavailable')));
   channel.on('error',()=>reject(new Error('Broker unavailable')));
   void channel.consume(queue,message=>{
    if(message?.properties.correlationId===correlationId){
     try{resolve(JSON.parse(message.content.toString()) as Frame);}catch{reject(new Error('Invalid broker reply'));}
    }
   },{noAck:true}).then(()=>{
    const request={traceId:requestId(),method,path,headers,body:body===undefined?'':Buffer.from(JSON.stringify(body)).toString('base64'),deadline:Date.now()+12000};
    channel.publish('hydrosmart.rpc',service,Buffer.from(JSON.stringify(request)),{mandatory:true,deliveryMode:2,expiration:'15000',correlationId,replyTo:queue,contentType:'application/json'},error=>{if(error)reject(error);});
   }).catch(reject);
  });
  try{return await answer;}finally{clearTimeout(timer!);}
 }finally{await connection.close().catch(()=>{});}
}
export async function rpcJson(service:string,path:string){
 const response=await rpc(service,path);
 if(response.status!==200)throw new Error('Broker service unavailable');
 return JSON.parse(Buffer.from(response.body,'base64').toString());
}
let rpcConnected=false;
export async function brokerHealth(){
 const connection=await amqp.connect(process.env.RABBITMQ_URL!,{timeout:1500});connection.on('error',()=>{});
 try{
  const channel=await connection.createConfirmChannel();channel.on('error',()=>{});
  await channel.checkExchange('hydrosmart.rpc');await channel.checkExchange('hydrosmart.events');
  const queue=await channel.checkQueue('rpc.identity');const receiver=rpcConnected&&queue.consumerCount>0;
  return {ready:receiver,details:{connection:'UP',rpcReceiver:receiver?'UP':'DOWN',publisherChannel:'READY',message:receiver?'Conexión, canal y receptor RPC disponibles.':'El broker responde, pero falta el receptor RPC.'}};
 }finally{await connection.close().catch(()=>{});}
}
export async function startRpcServer(service:string){
 async function serve(){
  while(true){
   let connection:Awaited<ReturnType<typeof amqp.connect>>|undefined;
   try{
    connection=await amqp.connect(process.env.RABBITMQ_URL!,{timeout:4000});
    const channel=await connection.createChannel();
    await channel.assertExchange('hydrosmart.rpc','direct',{durable:true});
    await channel.assertQueue('rpc.'+service,{durable:true});
    await channel.bindQueue('rpc.'+service,'hydrosmart.rpc',service);
    await channel.prefetch(8);
    await channel.consume('rpc.'+service,message=>{
     if(!message){rpcConnected=false;return;}
     void(async()=>{
      try{
       const request=JSON.parse(message.content.toString());
       if(message.content.length>16*1024*1024||!message.properties.replyTo||!message.properties.correlationId||
         typeof request.path!=='string'||!request.path.startsWith('/')||request.path.startsWith('//')||/[\r\n]/.test(request.path))throw new Error('Invalid frame');
       let result:Frame;
       if(request.deadline<Date.now())result={status:504,headers:{},body:''};
       else{
        const headers:Record<string,string>={};
        for(const [key,value]of Object.entries(request.headers??{}))if(['Authorization','Content-Type','X-Service-Token','X-Request-ID'].includes(key))headers[key]=String(value);
        if(typeof request.traceId==='string'&&/^[0-9a-f-]{36}$/i.test(request.traceId))headers['X-Request-ID']=request.traceId;
        const response=await fetch('http://127.0.0.1:8080'+request.path,{method:request.method,headers,
          ...(request.method==='GET'||request.method==='HEAD'?{}:{body:Buffer.from(request.body??'','base64')}),signal:AbortSignal.timeout(20000)});
        result={status:response.status,headers:{'Content-Type':response.headers.get('content-type')??'application/json'},body:Buffer.from(await response.arrayBuffer()).toString('base64')};
       }
       channel.sendToQueue(message.properties.replyTo,Buffer.from(JSON.stringify(result)),{correlationId:message.properties.correlationId,contentType:'application/json'});channel.ack(message);
      }catch{channel.nack(message,false,false);}
     })();
    });
    rpcConnected=true;
    await new Promise<void>((resolve,reject)=>{connection!.once('close',()=>{rpcConnected=false;resolve();});connection!.once('error',()=>{rpcConnected=false;reject(new Error('RPC disconnected'));});});
   }catch{console.warn('Identity broker receiver reconnecting');}
   finally{rpcConnected=false;await connection?.close().catch(()=>{});}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
 }
 void serve();
}

