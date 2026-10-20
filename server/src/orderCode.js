import {randomBytes} from 'node:crypto';

// Customer-facing IDs reveal neither database sequence nor customer information.
export function makeOrderCode(date=new Date(),random=randomBytes){
 const digits=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replace(/\D/g,'');
 return 'KD-'+digits+'-'+random(6).toString('hex').toUpperCase();
}

export function publicOrderCode(order){
 return order?.order_code||'KD-'+String(order?.id||'').padStart(8,'0');
}
