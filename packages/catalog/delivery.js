// Shared by checkout, address forms and the API. Do not coerce objects into text.
export function validateDelivery(input={}){
 const text=value=>typeof value==='string'?value.trim():'';
 const recipient=text(input?.recipient),phone=text(input?.phone).replace(/[\s().-]/g,''),address=text(input?.address).replace(/\r\n?/g,'\n');
 const errors={};
 if(recipient.length<2||recipient.length>120||/[\x00-\x1f\x7f]/.test(recipient))errors.recipient='Recipient name must contain 2–120 characters.';
 if(!/^\+?[0-9]{8,15}$/.test(phone))errors.phone='Phone number must contain 8–15 digits and may start with +.';
 if(address.length<10||address.length>750||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(address))errors.address='Address must contain 10–750 characters, including street and area.';
 return {values:{recipient,phone,address},errors,valid:Object.keys(errors).length===0};
}
