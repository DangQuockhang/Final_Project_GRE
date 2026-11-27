import React from 'react';
import {Link} from 'react-router-dom';
export default function SavedAddressNotice({state}){
 if(state.loading)return <p className="kd-checkout-address-note" role="status">Loading saved address…</p>;
 if(state.error)return <div className="kd-checkout-address-note" role="status"><p>{state.error}</p><button type="button" onClick={state.retry}>Try again</button></div>;
 return <div className="kd-checkout-address-note">
  <p>{state.saved?'Use your default address or edit it for this order.':'Save a default address in your account for faster checkout.'}</p>
  <div>{state.saved&&<button type="button" onClick={state.applySaved}>Use default address</button>}<Link to="/account?tab=address">Manage addresses</Link></div>
 </div>;
}
