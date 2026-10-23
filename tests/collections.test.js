import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCollectionName,collectionSuggestions,groupCollections} from '../apps/store/src/utils/collections.js';
test('collection names use sentence case and normalized spacing',()=>{
 for(const [input,expected] of [['CHARM','Charm'],['SHirt','Shirt'],['t-shirt','T-shirt'],['  HAIR   ACCESSORIES  ','Hair accessories'],['ÁO KHOÁC','Áo khoác'],[null,'']]){
  assert.equal(normalizeCollectionName(input),expected);
  assert.equal(normalizeCollectionName(expected),expected);
 }
});
const collections=[
 {id:1,name:'T-shirt',category:'clothing',hidden:false,active_count:2},
 {id:2,name:'Tote bag',category:'bags',hidden:false,active_count:1},
 {id:3,name:'Shirt',category:'clothing',hidden:true,active_count:1},
 {id:4,name:'Charm',category:'accessories',hidden:false,active_count:0}
];
test('typing T suggests T-shirt in clothing and reuses mixed-case names',()=>{
 assert.deepEqual(collectionSuggestions(collections,'clothing','T').map(c=>c.id),[1]);
 assert.deepEqual(collectionSuggestions(collections,'clothing','SHirt').map(c=>c.id),[3]);
 assert.deepEqual(collectionSuggestions(collections,'bags','t').map(c=>c.id),[2]);
});
test('customer directory excludes empty and hidden collections',()=>{
 const groups=groupCollections(collections);
 assert.deepEqual(groups.map(g=>g.name),['Bags','Clothing']);
 assert.deepEqual(groups.flatMap(g=>g.items.map(c=>c.id)),[2,1]);
});
