import React from 'react';
export default function DeliveryFields({value,onChange,errors={},disabled=false,prefix='delivery'}){
 const field=(name,label,type,autoComplete,maxLength)=>(
  <div className="kd-account-field">
   <label htmlFor={prefix+'-'+name}>{label}</label>
   <input id={prefix+'-'+name} type={type} inputMode={type==='tel'?'tel':undefined} autoComplete={autoComplete}
    maxLength={maxLength} required disabled={disabled} value={value[name]||''} onChange={e=>onChange(name,e.target.value)}
    aria-invalid={Boolean(errors[name])} aria-describedby={errors[name]?prefix+'-'+name+'-error':undefined}/>
   {errors[name]&&<small className="kd-account-field-error" id={prefix+'-'+name+'-error'} role="alert">{errors[name]}</small>}
  </div>
 );
 return <div className="kd-delivery-fields">
  {field('recipient','Tên người nhận','text','shipping name',120)}
  {field('phone','Số điện thoại nhận hàng','tel','shipping tel',25)}
  <div className="kd-account-field kd-delivery-address">
   <label htmlFor={prefix+'-address'}>Địa chỉ giao hàng</label>
   <textarea id={prefix+'-address'} autoComplete="shipping street-address" required rows={4} maxLength={750}
    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" disabled={disabled}
    value={value.address||''} onChange={e=>onChange('address',e.target.value)}
    aria-invalid={Boolean(errors.address)} aria-describedby={errors.address?prefix+'-address-error':prefix+'-address-hint'}/>
   {errors.address?<small className="kd-account-field-error" id={prefix+'-address-error'} role="alert">{errors.address}</small>:
    <small id={prefix+'-address-hint'}>Ghi đầy đủ địa chỉ để cửa hàng giao đúng nơi.</small>}
  </div>
 </div>;
}
