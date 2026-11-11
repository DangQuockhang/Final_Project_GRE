import {createDecartClient} from '@decartai/sdk';

export const TRY_ON_TIMING = Object.freeze({sessionMode:'manual-stop',tokenTtlSeconds:300,cooldownSeconds:30});

export function registerTryOnRoutes(route,{authorize,env=process.env,createClient=createDecartClient}) {
 const recent=new Map();
 const model='lucy-vton-3.6';
 const cooldownMs=TRY_ON_TIMING.cooldownSeconds*1000;
 const enabled=()=>env.TRY_ON_ENABLED==='true';
 const configured=()=>enabled()&&Boolean(env.DECART_API_KEY?.trim());
 route.get('/try-on',authorize,(req,res)=>{
  res.set('Cache-Control','no-store').json({configured:configured(),model,...TRY_ON_TIMING});
 });
 route.post('/try-on',authorize,async(req,res)=>{
  res.set('Cache-Control','no-store');
  if(!configured())return res.status(503).json({error:'Live try-on is disabled. Set TRY_ON_ENABLED=true and DECART_API_KEY on the server.'});
  const origin=req.get('origin');
  const origins=(env.ALLOWED_ORIGINS||'http://localhost:5173,http://localhost:5174').split(',').map(s=>s.trim());
  if(!origin||!origins.includes(origin))return res.status(403).json({error:'Start the session from the configured storefront.'});
  const id=String(req.user.id),now=Date.now();
  if(now-(recent.get(id)||0)<cooldownMs){
   const retryAfterSeconds=Math.ceil((cooldownMs-(now-recent.get(id)))/1000);
   return res.set('Retry-After',String(retryAfterSeconds)).status(429).json({error:`Please wait ${retryAfterSeconds} seconds before starting another trial.`,retryAfterSeconds});
  }
  for(const [key,time] of recent)if(now-time>cooldownMs)recent.delete(key);
  recent.set(id,now);
  try{
   const client=createClient({apiKey:env.DECART_API_KEY.trim()});
   const token=await client.tokens.create({expiresIn:TRY_ON_TIMING.tokenTtlSeconds,allowedModels:[model],allowedOrigins:[origin]});
   return res.json({apiKey:token.apiKey,expiresAt:token.expiresAt,...TRY_ON_TIMING});
  }catch(error){
   // Never forward provider bodies: they can contain credentials or request details.
   const status=Number(error?.data?.status);
   const messages={401:'Decart rejected the server API key.',402:'Decart reports insufficient credits.',403:'Decart denied access. Check the API key permissions and model access.',429:'Decart is rate limiting requests. Please try again later.'};
   return res.status(502).json({error:messages[status]||'Decart could not authorize this session. Please try again later.',code:'DECART_TOKEN_FAILED',providerStatus:Number.isInteger(status)?status:null});
  }
 });
}
