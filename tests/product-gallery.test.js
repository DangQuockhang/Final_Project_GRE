import test from 'node:test';
import assert from 'node:assert/strict';
import {nextImage,galleryUrls} from '../apps/store/src/utils/productGallery.js';
test('carousel wraps left/right and supports a single image',()=>{
 assert.equal(nextImage(0,1,3),1);
 assert.equal(nextImage(2,1,3),0);
 assert.equal(nextImage(0,-1,3),2);
 assert.equal(nextImage(0,1,1),0);
 assert.equal(nextImage(0,1,0),0);
});
test('cover is first; gallery order persists; duplicate cover is removed',()=>{
 const product={image_url:'/a.png',images:[
 {image_url:'/b.png',position:0},{image_url:'/a.png',position:1},{image_url:'/c.png',position:2}
 ]};
 assert.deepEqual(galleryUrls(product,url=>url),['/a.png','/b.png','/c.png']);
 assert.deepEqual(galleryUrls({images:[]},url=>url),[]);
 assert.deepEqual(galleryUrls(product,url=>url==='/b.png'?null:url),['/a.png','/c.png']);
});
