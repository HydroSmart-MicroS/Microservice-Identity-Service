export type Check=()=>Promise<{ready:boolean;details?:Record<string,unknown>}>;
export async function readiness(checks:Record<string,Check>){
 const components=Object.fromEntries(await Promise.all(Object.entries(checks).map(async([name,check])=>{
  const start=performance.now();
  try{const result=await check();return [name,{status:result.ready?'UP':'DOWN',details:{...result.details,durationMs:Math.round((performance.now()-start)*100)/100}}] as const;}
  catch{return [name,{status:'DOWN',details:{message:name==='database'?'No se pudo consultar PostgreSQL; revisa su disponibilidad y acceso.':'No se pudo comprobar RabbitMQ; revisa la conexión, permisos y el receptor RPC.',durationMs:Math.round((performance.now()-start)*100)/100}}] as const;}
 })));
 return {status:Object.values(components).every(component=>component.status==='UP')?'UP':'DOWN',service:'identity',checkedAt:new Date().toISOString(),components};
}
