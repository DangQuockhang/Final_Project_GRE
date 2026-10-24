import test from 'node:test';
import assert from 'node:assert/strict';
import {colorImageUrl,galleryUrls} from '../apps/store/src/utils/productGallery.js';
test('Color selection targets first matching gallery photo without removing other photos',()=>{
 const product={image_url:'cover.jpg',images:[
  {image_url:'red.jpg',color:'Red'},{image_url:'black-front.jpg',color:'Black'},
  {image_url:'black-back.jpg',color:'Black'},{image_url:'general.jpg',color:null}
 ]};
 const resolve=url=>'/media/'+url;
 assert.equal(colorImageUrl(product,' BLACK ',resolve),'/media/black-front.jpg');
 assert.equal(colorImageUrl(product,'red',resolve),'/media/red.jpg');
 assert.equal(colorImageUrl(product,'White',resolve),null);
 assert.equal(colorImageUrl(product,'',resolve),null);
 assert.equal(colorImageUrl({},'Black',resolve),null);
 assert.equal(galleryUrls(product,resolve).length,5);
 product.images.reverse();
 assert.equal(colorImageUrl(product,'Black',resolve),'/media/black-back.jpg');
});
