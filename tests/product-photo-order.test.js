import test from 'node:test';
import assert from 'node:assert/strict';
import {moveItem,galleryInOrder,validateGalleryOrder} from '../apps/store/src/utils/productPhotoOrder.js';

test('new image queue can be reordered without mutating original FileList',()=>{
 const files=[{name:'side.jpg'},{name:'front.jpg'},{name:'back.jpg'}];
 const swapped=moveItem(files,1,-1);
 assert.deepEqual(swapped.map(x=>x.name),['front.jpg','side.jpg','back.jpg']);
 assert.deepEqual(files.map(x=>x.name),['side.jpg','front.jpg','back.jpg']);
 assert.deepEqual(moveItem(swapped,2,1),swapped,'moving past the last image does nothing');
});
test('gallery IDs map correctly to their real image URLs and positions',()=>{
 const images=[{id:11,image_url:'/media/products/a.jpg'},{id:22,image_url:'/media/products/b.jpg'},{id:33,image_url:'/media/products/c.jpg'}];
 assert.deepEqual(galleryInOrder(images,[33,11,22]).map(x=>x.image_url),[
  '/media/products/c.jpg','/media/products/a.jpg','/media/products/b.jpg'
 ]);
 assert.deepEqual(galleryInOrder(images,[33]).map(x=>x.id),[33,11,22]);
});
test('gallery validation rejects duplicates, foreign IDs and incomplete lists',()=>{
 assert.equal(validateGalleryOrder([1,2,3],[2,1,3],3),true);
 assert.equal(validateGalleryOrder([1,2,3],[1,2,3],null),true);
 assert.equal(validateGalleryOrder([1,2,3],[1,2],null),false);
 assert.equal(validateGalleryOrder([1,2,3],[1,2,2],null),false);
 assert.equal(validateGalleryOrder([1,2,3],[1,2,9],null),false);
 assert.equal(validateGalleryOrder([1,2,3],[1,2,3],9),false);
 assert.equal(validateGalleryOrder([1,2,3],['1','2','3'],3),true);
});
