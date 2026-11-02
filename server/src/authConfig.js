export function requireJwtSecret(value){
 if(typeof value!=='string'||value.trim().length<32)throw new Error('JWT_SECRET phải có ít nhất 32 ký tự. API không khởi động khi cấu hình xác thực chưa hợp lệ.');
 return value;
}
