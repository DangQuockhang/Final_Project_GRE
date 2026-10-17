import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

export const imageDir=fileURLToPath(new URL('../uploads/products/',import.meta.url));
export const MAX_IMAGE_BYTES=3*1024*1024;
const validPath=/^\/media\/products\/[a-f0-9-]{36}\.(png|jpg|webp)$/i;
/**
 * Determine the real stored extension from image bytes.
 * Browser MIME/type is metadata inferred from the filename and is not a
 * trustworthy way to recognize the file. We never use a client filename as
 * the final stored extension. SVG/HTML/AVIF/HEIC are not supported here.
 */
export function detectImage(buffer,_mime){
 if(!Buffer.isBuffer(buffer)||buffer.length<20)return null;
 if(
  buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
  buffer.toString('ascii',12,16)==='IHDR'
 )return 'png';
 if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';
 if(
  buffer.toString('ascii',0,4)==='RIFF' &&
  buffer.toString('ascii',8,12)==='WEBP' &&
  ['VP8 ','VP8L','VP8X'].includes(buffer.toString('ascii',12,16))
 )return 'webp';
 return null;
}
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_IMAGE_BYTES,files:1,fields:0,parts:1}}).single('image');
export function imageUpload(req,res,next){
 upload(req,res,error=>{
  if(!error)return next();
  res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({error:error.code==='LIMIT_FILE_SIZE'?'Image must be under 3 MB.':'Invalid upload.'});
 });
}
export async function saveImage(buffer,ext){
 await mkdir(imageDir,{recursive:true});
 const name=randomUUID()+'.'+ext;
 await writeFile(join(imageDir,name),buffer,{flag:'wx'});
 return '/media/products/'+name;
}
export async function removeImage(path){
 if(!validPath.test(String(path||'')))return;
 try{await unlink(join(imageDir,String(path).split('/').pop()));}
 catch(e){if(e.code!=='ENOENT')throw e;}
}

const galleryMulter=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_IMAGE_BYTES,files:6,parts:6}}).array('images',6);
export function galleryUpload(req,res,next){
 galleryMulter(req,res,error=>{
  if(!error)return next();
  res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({error:error.code==='LIMIT_FILE_SIZE'?'Each image must be under 3 MB.':'Invalid image gallery request (max 6 images per upload).'});
 });
}
