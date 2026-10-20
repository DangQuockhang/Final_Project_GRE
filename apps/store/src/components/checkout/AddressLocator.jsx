import React,{useState} from 'react';
import {LocateFixed,LoaderCircle,MapPin} from 'lucide-react';

// Location is used only after an explicit user action. The customer must
// confirm/edit the suggestion before checkout. Coordinates are never saved.
export default function AddressLocator({onSuggest}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function locate(){
  if(busy)return;
  if(!navigator.geolocation){setMessage('Geolocation is unavailable in this browser. Please enter your address manually.');return;}
  setBusy(true);setMessage('Requesting permission to find your approximate address…');
  navigator.geolocation.getCurrentPosition(async position=>{
   try{
    // Third-party lookup is deliberately triggered only by pressing this button.
    const lat=position.coords.latitude,lon=position.coords.longitude;
    const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=vi&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon);
    const res=await fetch(url,{headers:{Accept:'application/json'}});
    if(!res.ok)throw Error('Address lookup unavailable');
    const geo=await res.json();
    if(!geo.display_name)throw Error('No nearby address found');
    onSuggest(geo.display_name);
    setMessage('Address suggestion added. Please confirm your building, street and ward before placing the order.');
   }catch{setMessage('Could not turn your position into an address. Please enter the delivery address manually.');}
   finally{setBusy(false);}
  },error=>{
   setBusy(false);
   setMessage(error.code===1?'Location permission denied. You can enter your address manually.':'Could not determine your position. Please enter your address manually.');
  },{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 }
 return <div className="kd-address-locator">
  <button type="button" className="border-button" onClick={locate} disabled={busy}>
   {busy?<LoaderCircle size={18}/>:<LocateFixed size={18}/>}
   {busy?'FINDING LOCATION…':'USE MY CURRENT LOCATION'}
  </button>
  <p><MapPin size={15}/> Optional. With your permission, coordinates are sent to OpenStreetMap for address lookup.
   Results may be approximate; edit the address yourself before ordering.</p>
  {message&&<span role="status">{message}</span>}
 </div>;
}
