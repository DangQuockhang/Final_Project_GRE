export function resetMailConfig(){
 const {RESEND_API_KEY,MAIL_FROM,APP_URL}=process.env;
 if(!RESEND_API_KEY||!MAIL_FROM||!APP_URL)return null;
 try{
  const url=new URL(APP_URL);
  const local=['localhost','127.0.0.1'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&local))||url.username||url.password)return null;
  return {key:RESEND_API_KEY,from:MAIL_FROM,origin:url.origin};
 }catch{return null;}
}
export async function sendResetEmail(email,token,config){
 const link=config.origin+'/reset-password#token='+token;
 // A local capture transport is available only to isolated integration tests.
 const endpoint=process.env.NODE_ENV==='test'&&process.env.TEST_MAIL_URL?process.env.TEST_MAIL_URL:'https://api.resend.com/emails';
 const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(10000),
  headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},
  body:JSON.stringify({from:config.from,to:[email],subject:'KD — Đặt lại mật khẩu',
   text:'Bạn vừa yêu cầu đặt lại mật khẩu KD. Mở liên kết sau trong vòng 30 phút:\n'+link+'\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.'})});
 if(!response.ok)throw new Error('MAIL_DELIVERY_FAILED');
}
