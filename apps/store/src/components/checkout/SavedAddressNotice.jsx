import React from 'react';
import {Link} from 'react-router-dom';
export default function SavedAddressNotice({state}){
 if(state.loading)return <p className="kd-checkout-address-note" role="status">Đang tải địa chỉ đã lưu…</p>;
 if(state.error)return <div className="kd-checkout-address-note" role="status"><p>{state.error}</p><button type="button" onClick={state.retry}>Thử lại</button></div>;
 return <div className="kd-checkout-address-note">
  <p>{state.saved?'Bạn có thể dùng địa chỉ mặc định hoặc sửa thông tin cho riêng đơn hàng này.':'Bạn có thể lưu một địa chỉ mặc định trong Tài khoản để đặt hàng nhanh hơn.'}</p>
  <div>{state.saved&&<button type="button" onClick={state.applySaved}>Dùng địa chỉ mặc định</button>}<Link to="/account?tab=address">Quản lý địa chỉ</Link></div>
 </div>;
}
