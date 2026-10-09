import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateFit,SIZE_CHART} from '../packages/virtual-fitting/src/fitCalculator.js';
test('display fitted size from chest ease',()=>{
 assert.equal(estimateFit(106,98).tone,'warn');
 assert.equal(estimateFit(114,98).tone,'good');
 assert.equal(estimateFit(98,98).tone,'bad');
 assert.equal(estimateFit(130,98).tone,'info');
});
test('size chart is ordered',()=>assert.ok(SIZE_CHART.S<SIZE_CHART.M&&SIZE_CHART.M<SIZE_CHART.L));
test('invalid measurements are not treated as valid fits',()=>assert.equal(estimateFit(null,98).tone,'info'));
