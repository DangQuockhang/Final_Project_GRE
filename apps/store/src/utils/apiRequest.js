export function createApiRequest(base, {fetchImpl = fetch, timeoutMs = 15000, onSessionExpired = () => {}} = {}) {
 return async (path, {method='GET', body, token, signal, keepalive=false}={}) => {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, {once:true});
  let timedOut = false;
  const timer = setTimeout(() => {timedOut=true;controller.abort();}, timeoutMs);
  try {
   const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
   const res = await fetchImpl(`${base}${path}`, {method, signal:controller.signal, keepalive,
    headers:{...(body&&!multipart?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
    body:multipart?body:body?JSON.stringify(body):undefined});
   const data = await res.json().catch(() => ({}));
   if (!res.ok) {
    const schemaMissing = ['42P01','42703','DATABASE_SCHEMA_NOT_READY'].includes(data.code);
    const message = schemaMissing ? 'Store data is temporarily unavailable. Please contact the shop administrator.'
     : data.error || 'Unable to complete this request. Please try again.';
    const error = Object.assign(new Error(message), {status:res.status,code:data.code,errors:data.errors||{}});
    if (token && (res.status===401 || data.code==='ACCOUNT_BLOCKED')) onSessionExpired({token,message});
    throw error;
   }
   return data;
  } catch (error) {
   if (timedOut) throw Object.assign(new Error('The server took too long to respond. Please try again.'), {code:'API_TIMEOUT'});
   if (!signal?.aborted && error instanceof TypeError) throw Object.assign(new Error('Unable to reach the store server. Please check your connection and try again.'), {code:'API_UNAVAILABLE'});
   throw error;
  } finally {
   clearTimeout(timer);
   signal?.removeEventListener('abort', abort);
  }
 };
}
