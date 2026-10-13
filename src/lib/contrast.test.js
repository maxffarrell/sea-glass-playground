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

test('scrolling keeps the dark theme coating through ordinary light and dark regions',async()=>{
  const {advanceCoating}=await import('./coating.js');
  let state;
  for(const [time,ratios] of [[0,[1.5,1.8,2]],[100,[1.09,1.6,1.8]],[1000,[1.4,1.5,1.6]]]) {
    state=advanceCoating(state,'dark',ratios,time).state;
    assert.deepEqual(state.color,[24,28,32]);assert.equal(state.boost,false);
  }
});
test('material visibility correction requires sustained widespread loss and animates gradually',async()=>{
  const {advanceCoating}=await import('./coating.js');
  let state=advanceCoating(null,'dark',[1.02,1.04,1.03],0).state;
  state=advanceCoating(state,'dark',[1.02,1.04,1.03],200).state;
  assert.equal(state.boost,false);
  state=advanceCoating(state,'dark',[1.02,1.04,1.03],500).state;
  assert.equal(state.boost,true);assert.ok(state.color[0]>24&&state.color[0]<52);
  state=advanceCoating(state,'dark',[1.2,1.2,1.2],800).state;
  assert.equal(state.boost,true); // No threshold chatter.
  state=advanceCoating(state,'dark',[1.5,1.5,1.5],900).state;
  assert.equal(state.boost,true);
  state=advanceCoating(state,'dark',[1.5,1.5,1.5],1400).state;
  assert.equal(state.boost,false);assert.ok(state.color[0]>24);
});
test('brief loss of rim visibility cancels without recoloring',async()=>{
  const {advanceCoating}=await import('./coating.js');
  let state=advanceCoating(null,'light',[1.01,1.01],0).state;
  state=advanceCoating(state,'light',[1.7,1.7],300).state;
  assert.equal(state.pending,null);assert.deepEqual(state.color,[255,255,255]);
});
test('theme change animates even after the renderer has been idle for a long time',async()=>{
  const {advanceCoating}=await import('./coating.js');
  let state=advanceCoating(null,'dark',[],0).state;
  const changed=advanceCoating(state,'light',[],60000);
  assert.equal(changed.active,true);assert.deepEqual(changed.state.color,[24,28,32]);
  state=advanceCoating(changed.state,'light',[],60100).state;
  assert.ok(state.color[0]>24&&state.color[0]<255);
});
