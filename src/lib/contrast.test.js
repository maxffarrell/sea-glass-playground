import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luminance,contrast,compositeGlass,chooseForeground } from './contrast.js';

test('relative luminance and contrast use linear sRGB',()=>{
  assert.equal(luminance([0,0,0]),0);
  assert.equal(luminance([255,255,255]),1);
  assert.equal(contrast([0,0,0],[255,255,255]),21);
  assert.ok(Math.abs(luminance([128,128,128])-.21586)<.00001);
});
test('transparent glass does not change its sampled backdrop',()=>{
  assert.deepEqual(compositeGlass([30,80,120],[191,0,255],0,[255,255,255],true),[30,80,120]);
});
test('foreground flips with background, independently of page theme',()=>{
  const dark=[112,47,134],light=[250,228,255];
  const bright=compositeGlass([255,255,255],[191,0,255],1,[255,255,255]);
  const dim=compositeGlass([23,31,26],[191,0,255],1,[24,28,32]);
  assert.equal(chooseForeground([bright],dark,light).mode,'dark');
  assert.equal(chooseForeground([dim],dark,light,'dark').mode,'light');
  assert.ok(chooseForeground([dim],dark,light).ratio>=4.5);
});
test('hysteresis never keeps a failing previous color when a readable alternative exists',()=>{
  const result=chooseForeground([[255,255,255]],[112,47,134],[250,228,255],'light');
  assert.equal(result.mode,'dark');assert.ok(result.ratio>=4.5);
});
