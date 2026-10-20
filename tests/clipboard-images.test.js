import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLOWED_IMAGE_TYPES,MAX_UPLOAD_IMAGE_BYTES,imageFilesFromClipboard,validateImageFiles,appendImages} from '../apps/store/src/utils/clipboardImages.js';

const file=(type='image/png',size=1200)=>({type,size,name:'image.png'});
test('reads clipboard image bytes from a copied picture or screenshot',()=>{
 const source=file();
 const clipboard={items:[
  {kind:'string',type:'text/plain',getAsFile:()=>null},
  {kind:'file',type:'image/png',getAsFile:()=>source}
 ]};
 assert.deepEqual(imageFilesFromClipboard(clipboard),[source]);
 assert.deepEqual(imageFilesFromClipboard({files:[source]}),[source]);
});
test('ignores copied image URLs and ordinary text',()=>{
 assert.deepEqual(imageFilesFromClipboard({items:[{kind:'string',type:'text/uri-list'}]}),[]);
 assert.deepEqual(imageFilesFromClipboard(null),[]);
});
test('supports valid jpg, png and webp only, each under 3MB',()=>{
 for(const type of ALLOWED_IMAGE_TYPES)assert.equal(validateImageFiles([file(type)]),'');
 assert.match(validateImageFiles([file('image/svg+xml')]),/Only JPG/);
 assert.match(validateImageFiles([file('image/gif')]),/Only JPG/);
 assert.match(validateImageFiles([file('image/png',MAX_UPLOAD_IMAGE_BYTES+1)]),/under 3 MB/);
 assert.match(validateImageFiles([file('image/png',0)]),/under 3 MB/);
});
test('product supports multiple pasted images but cannot exceed its slot limit',()=>{
 const a=file('image/png',100),b=file('image/jpeg',200),c=file('image/webp',300);
 const first=appendImages([],[a,b],{maxCount:3});
 assert.equal(first.error,'');
 assert.equal(first.files.length,2);
 const second=appendImages(first.files,[c],{maxCount:3});
 assert.deepEqual(second.files,[a,b,c]);
 const rejected=appendImages(second.files,[a],{maxCount:3});
 assert.deepEqual(rejected.files,second.files);
 assert.match(rejected.error,/Only 3 image/);
});
test('brands accept only one pasted image',()=>{
 const a=file(),b=file();
 assert.match(validateImageFiles([a,b],{maxCount:1}),/Only 1 image/);
 assert.equal(validateImageFiles([a],{maxCount:1}),'');
});
