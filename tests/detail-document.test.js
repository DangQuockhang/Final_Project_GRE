import test from 'node:test';
import assert from 'node:assert/strict';
import {readDocument} from '../apps/store/src/utils/detailDocument.js';
const text=value=>({nodeType:3,textContent:value});
const el=(tagName,...childNodes)=>({nodeType:1,tagName,childNodes,dataset:{}});
test('One editable document serializes interleaved text, headings and registered images',()=>{
 const photo={...el('IMG'),dataset:{detailId:'1'}};
 const data={type:'image',url:'/media/products/photo.png',caption:'Fabric'};
 const root=el('DIV',el('P',text('Before'),el('BR'),text('Second line')),photo,el('H3',text('Care')),el('DIV',text('After')));
 assert.deepEqual(readDocument(root,new Map([['1',data]])),[
  {type:'paragraph',text:'Before\nSecond line'},data,{type:'heading',text:'Care'},{type:'paragraph',text:'After'}
 ]);
});
test('Unknown images cannot become saved media, and inline text is preserved',()=>{
 const root=el('DIV',el('P',text('A '),el('B',text('bold')),text(' sentence'),el('IMG')));
 assert.deepEqual(readDocument(root,new Map()),[{type:'paragraph',text:'A bold sentence'}]);
 assert.deepEqual(readDocument(el('DIV'),new Map()),[]);
});
