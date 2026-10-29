import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {detectImage} from './productImages.js';
export const avatarDir=fileURLToPath(new URL('../uploads/avatars/',import.meta.url));
export const AVATAR_MAX_BYTES=2*1024*1024;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:AVATAR_MAX_BYTES,files:1,fields:3,parts:4,fieldSize:500}}).single('avatar');
export function avatarUpload(req,res,next){
 upload(req,res,error=>{if(!error)return next();
 res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({code:'AVATAR_UPLOAD_INVALID',error:error.code==='LIMIT_FILE_SIZE'?'Ảnh đại diện tối đa 2 MB.':'Dữ liệu tải ảnh không hợp lệ.'});});
}
export async function saveAvatar(file){
 const ext=detectImage(file.buffer);
 if(!ext){const e=new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.');e.status=400;e.code='AVATAR_INVALID';throw e;}
 await mkdir(avatarDir,{recursive:true});
 const filename=randomUUID()+'.'+ext;
 await writeFile(join(avatarDir,filename),file.buffer,{flag:'wx'});
 return '/media/avatars/'+filename;
}
export async function removeAvatar(url){
 if(!/^\/media\/avatars\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(url||''))return;
 try{await unlink(join(avatarDir,url.split('/').pop()));}catch(e){if(e.code!=='ENOENT')throw e;}
}
