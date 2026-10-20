import {onRequestGet} from './functions/api/status/[id].js';
const u='https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const j=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const enabled=e=>e.ENABLE_VIDEO_GENERATION==='true'&&e.FAL_KEY&&e.APP_ACCESS_CODE&&e.APP_ACCESS_CODE.length>=12;
async function create(r,e){
if(r.method!=='POST')return j({error:'Method not allowed'},405);
if(!enabled(e))return j({error:'Video API not yet enabled by owner'},503);
if(r.headers.get('X-Access-Code')!==e.APP_ACCESS_CODE)return j({error:'Access code rejected'},401);
let d;try{const t=await r.text();if(t.length>10000)return j({error:'Too large'},413);d=JSON.parse(t);}catch{return j({error:'Invalid JSON'},400);}
const p=typeof d.prompt==='string'?d.prompt.trim():'',n=String(d.duration||'5'),a=String(d.aspect_ratio||'16:9');
if(!/^.{10,1800}$/s.test(p)||!['5','10'].includes(n)||!['16:9','9:16','1:1'].includes(a))return j({error:'Invalid prompt or format'},400);
try{const x=await fetch(u,{method:'POST',headers:{Authorization:'Key '+e.FAL_KEY,'Content-Type':'application/json'},body:JSON.stringify({prompt:p,duration:n,aspect_ratio:a})});if(!x.ok)return j({error:'Provider HTTP '+x.status},502);const z=await x.json();if(!/^[\w-]{8,128}$/.test(z.request_id||''))return j({error:'Invalid job ID'},502);return j({request_id:z.request_id,status:'IN_QUEUE'},202);}catch{return j({error:'Video provider unavailable'},502);}
}
export default{fetch(r,e){
const p=new URL(r.url).pathname;
if(p==='/api/create')return create(r,e);
if(p.startsWith('/api/status/')){if(r.method!=='GET')return j({error:'Method not allowed'},405);if(!enabled(e))return j({error:'Video API not yet enabled by owner'},503);return onRequestGet({request:r,env:e,params:{id:p.slice(12)}});}
if(p.startsWith('/api/'))return j({error:'API route not found'},404);
return e.ASSETS.fetch(r);
}};
