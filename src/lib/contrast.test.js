import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luminance,contrast,chooseForeground,contrastGuard } from './contrast.js';
import { lowerHighlight,guardCoverage } from './glass.js';

test('relative luminance and contrast use linear sRGB',()=>{
  assert.equal(luminance([0,0,0]),0);
  assert.equal(luminance([255,255,255]),1);
  assert.equal(contrast([0,0,0],[255,255,255]),21);
  assert.ok(Math.abs(luminance([128,128,128])-.21586)<.00001);
});
test('foreground flips with background, independently of page theme',()=>{
  const dark=[112,47,134],light=[250,228,255];
  const bright=[237,182,255];
  const dim=[69,20,91];
  assert.equal(chooseForeground([bright],dark,light).mode,'dark');
  assert.equal(chooseForeground([dim],dark,light,'dark').mode,'light');
  assert.ok(chooseForeground([dim],dark,light).ratio>=4.5);
});
test('hysteresis never keeps a failing previous color when a readable alternative exists',()=>{
  const result=chooseForeground([[255,255,255]],[112,47,134],[250,228,255],'light');
  assert.equal(result.mode,'dark');assert.ok(result.ratio>=4.5);
});
test('mixed black and white content gets sufficient local material protection',()=>{
  const pixels=[[0,0,0],[255,255,255],[120,90,170]];
  const result=chooseForeground(pixels,[112,47,134],[250,228,255]);
  assert.ok(result.ratio<4.5);
  const guard=contrastGuard(pixels,result.color,result.mode);
  const scrim=result.mode==='light'?[0,0,0]:[255,255,255];
  assert.ok(guard>0&&guard<1);
  for(const pixel of pixels)assert.ok(contrast(result.color,pixel.map((c,i)=>c*(1-guard)+scrim[i]*guard))>=4.7);
});
test('readable source defaults need no extra contrast plate',()=>{
  assert.equal(contrastGuard([[235,186,255]],[112,47,134],'dark'),0);
});
test('caustic follows the lower internal rim rather than the top or center',()=>{
  assert.ok(lowerHighlight(10,1)>.5);
  assert.equal(lowerHighlight(10,-1),0);
  assert.ok(lowerHighlight(52,1)<.01);
});
test('fractional glyph bounds receive full protection at their first sampled pixel',()=>{
  const box={x:480.9999,y:33.0001,width:38,height:38};
  assert.equal(guardCoverage(Math.floor(box.x),42,box),1);
  assert.equal(guardCoverage(box.x+box.width+9,42,box),0);
});
