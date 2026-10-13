export function luminance(rgb) {
  const linear = rgb.map(value => { const c=value/255; return c<=.04045?c/12.92:((c+.055)/1.055)**2.4; });
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
export function contrast(a,b) {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const mix=(back,front,alpha)=>back.map((c,i)=>c*(1-alpha)+front[i]*alpha);
export function chooseForeground(backgrounds,dark,light,previous) {
  const backgroundLuminances=backgrounds.map(luminance);
  const score=color=>{const ink=luminance(color);return Math.min(...backgroundLuminances.map(back=>(Math.max(ink,back)+.05)/(Math.min(ink,back)+.05)));};
  const options=[{color:dark,mode:'dark'},{color:light,mode:'light'}];
  let best=options.reduce((a,b)=>score(a.color)>=score(b.color)?a:b);
  if(score(best.color)<4.5) {
    const neutral=[{color:[20,24,22],mode:'dark'},{color:[255,255,255],mode:'light'}];
    best=[best,...neutral].reduce((a,b)=>score(a.color)>=score(b.color)?a:b);
  }
  // Keep the previous polarity near the crossover, but never retain a failing
  // color if another candidate meets the target. This avoids scroll flicker.
  const same=options.find(option=>option.mode===previous);
  if(same && score(same.color)>=4.5 && score(same.color)>=score(best.color)/1.15) best=same;
  return {...best,ratio:score(best.color)};
}

export function contrastGuard(backgrounds,color,mode,target=4.7) {
  if(backgrounds.every(pixel=>contrast(color,pixel)>=4.5))return 0;
  const scrim=mode==='light'?[0,0,0]:[255,255,255];
  let low=0,high=1;
  for(let step=0;step<12;step++) {
    const alpha=(low+high)/2;
    if(backgrounds.every(pixel=>contrast(color,mix(pixel,scrim,alpha))>=target))high=alpha;else low=alpha;
  }
  return high;
}
