import amqp from 'amqplib';
import type {Pool} from 'pg';
export function startIdentityOutbox(pool:Pool){
 let running=false;
 const timer=setInterval(()=>{
  if(running)return;running=true;
  void(async()=>{
   const client=await pool.connect();
   let connection:Awaited<ReturnType<typeof amqp.connect>>|undefined;
   try{
    await client.query('BEGIN');
    const {rows}=await client.query("SELECT event_id,event_type,payload FROM outbox_events WHERE published_at IS NULL ORDER BY occurred_at FOR UPDATE SKIP LOCKED LIMIT 20");
    if(rows.length){
     connection=await amqp.connect(process.env.RABBITMQ_URL!,{timeout:4000});
     const channel=await connection.createConfirmChannel();
     let returned=false;channel.on('return',()=>{returned=true;});
     for(const row of rows){
      await new Promise<void>((resolve,reject)=>channel.publish('hydrosmart.events',row.event_type,Buffer.from(JSON.stringify(row.payload)),{mandatory:true,deliveryMode:2,messageId:row.event_id,contentType:'application/json'},err=>err?reject(err):resolve()));
      if(returned)throw new Error('No event route');
      console.log(JSON.stringify({event:'message_published',service:'identity',eventId:row.event_id,eventType:row.event_type}));
      await client.query('UPDATE outbox_events SET published_at=now(),attempts=attempts+1 WHERE event_id=$1',[row.event_id]);
     }
    }
    await client.query('COMMIT');
   }catch{await client.query('ROLLBACK').catch(()=>{});}
   finally{client.release();await connection?.close().catch(()=>{});running=false;}
  })().catch(()=>{running=false;});
 },1000);
 timer.unref();
}

