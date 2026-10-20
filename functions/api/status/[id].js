const U='https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const out=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function onRequestGet({request,env,params}){
if(!env.FAL_KEY||!env.APP_ACCESS_CODE)return out({error:'Video service not configured'},503);if(request.headers.get('X-Access-Code')!==env.APP_ACCESS_CODE)return out({error:'Access denied'},401);
const id=String(params.id||'');if(!/^[a-zA-Z0-9_-]{8,128}$/.test(id))return out({error:'Invalid job ID'},400);const h={Authorization:'Key '+env.FAL_KEY};
try{const a=await fetch(U+'/requests/'+encodeURIComponent(id)+'/status',{headers:h});if(!a.ok)return out({error:'Provider status error'},502);const s=await a.json();if(s.status!=='COMPLETED')return out({status:s.status||'IN_QUEUE',queue_position:s.queue_position??null});const b=await fetch(U+'/requests/'+encodeURIComponent(id),{headers:h});if(!b.ok)return out({error:'Provider result error'},502);const d=await b.json();const v=d?.video?.url;if(typeof v!=='string'||!v.startsWith('https://'))return out({error:'No video URL'},502);return out({status:'COMPLETED',video_url:v});}catch{return out({error:'Provider unavailable'},502);}
}
