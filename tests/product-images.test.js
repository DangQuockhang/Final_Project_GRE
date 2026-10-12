import test from 'node:test';
import assert from 'node:assert/strict';
import {detectImage} from '../server/src/productImages.js';
import {productImageUrl} from '../packages/catalog/media.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6TuYAAAAASUVORK5CYII=','base64');
test('upload requires a matching image signature',()=>{
 assert.equal(detectImage(png,'image/png'),'png');
 // Windows/browsers may infer MIME from filename; trust the actual supported bytes.
 assert.equal(detectImage(png,'image/jpeg'),'png');
 assert.equal(detectImage(png,'application/octet-stream'),'png');
 assert.equal(detectImage(Buffer.from('<svg onload=alert(1)>'),'image/png'),null);
 const fakedWebp=Buffer.from('RIFF0000WEBPnot-an-image');
 assert.equal(detectImage(fakedWebp,'image/webp'),null);
});
test('URL resolver rejects unsafe relative media paths',()=>{
 const id='11111111-2222-4333-8444-555555555555';
 assert.equal(productImageUrl('/media/products/'+id+'.png','http://localhost:4000/api'),'http://localhost:4000/media/products/'+id+'.png');
 assert.equal(productImageUrl('/media/products/../../secret'),null);
 assert.equal(productImageUrl('javascript:alert(1)'),null);
});
