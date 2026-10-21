import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../apps/store/src/styles/product-gallery-v2.css',import.meta.url),'utf8');
const component=readFileSync(new URL('../apps/store/src/components/product/ProductGallery.jsx',import.meta.url),'utf8');
const stage=(css.match(/\.kd-v2-lightbox-stage\{([^}]+)\}/)||[])[1]||'';
const photo=(css.match(/\.kd-v2-lightbox-stage img\{([^}]+)\}/)||[])[1]||'';

test('fullscreen stage is a positioned clipping box, NOT an intrinsic-size grid row',()=>{
 assert.match(stage,/position:\s*relative\s*;/);
 assert.match(stage,/overflow:\s*hidden\s*;/);
 assert.match(stage,/min-height:\s*0\s*;/);
 assert.doesNotMatch(stage,/display:\s*grid\s*;/);
});
test('100% lightbox photo is fully fitted and never forced to fill both dimensions',()=>{
 assert.match(photo,/position:\s*absolute\s*;/);
 assert.match(photo,/top:\s*50%\s*;/);
 assert.match(photo,/left:\s*50%\s*;/);
 assert.match(photo,/width:\s*auto\s*;/);
 assert.match(photo,/height:\s*auto\s*;/);
 assert.match(photo,/max-width:\s*calc\(100%\s*-\s*24px\)/);
 assert.match(photo,/max-height:\s*calc\(100%\s*-\s*24px\)/);
 assert.match(photo,/object-fit:\s*contain\s*;/);
 assert.match(component,/translate\(-50%, -50%\) translate/);
});
test('zoom controls remain interactive after fitting fix',()=>{
 assert.match(component,/aria-label="Zoom in"/);
 assert.match(component,/aria-label="Zoom out"/);
 assert.match(component,/aria-label="Reset zoom"/);
 assert.match(component,/aria-label="Next photo"/);
 assert.match(component,/onPointerMove=\{drag\}/);
});
