import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDetails} from '../server/src/productDetails.js';
test('Structured details preserve text and only accept owned or uploaded images',()=>{
 const old=[{type:'image',url:'/media/products/owned.png'}];
 assert.deepEqual(validateDetails([{type:'paragraph',text:'<script>alert(1)</script>'}],[],old),[{type:'paragraph',text:'<script>alert(1)</script>'}]);
 assert.equal(validateDetails([{type:'image',url:old[0].url}],[],old)[0].url,old[0].url);
 assert.equal(validateDetails([{type:'image',upload_index:0,caption:'Fabric'}],[{}])[0].upload_index,0);
 assert.throws(()=>validateDetails([{type:'image',url:'https://example.com/x.png'}],[],old));
 assert.throws(()=>validateDetails([{type:'html',text:'unsafe'}],[]));
 assert.throws(()=>validateDetails([{type:'paragraph',text:'x'.repeat(12001)}],[]));
 assert.throws(()=>validateDetails([{type:'image',upload_index:1}],[{}]));
 assert.throws(()=>validateDetails([{type:'image',upload_index:0},{type:'image',upload_index:0}],[{}]));
 assert.throws(()=>validateDetails([], [{}]));
 assert.deepEqual(validateDetails([],[],old),[]);
});
