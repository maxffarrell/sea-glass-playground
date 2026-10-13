const palettes={light:[255,255,255],dark:[24,28,32]};
const adjusted={light:[224,228,226],dark:[52,58,64]};

// Theme owns the material's polarity. Scrolling can make a small adjustment
// only after almost the whole rim has disappeared for a sustained interval.
export function advanceCoating(state,theme,ratios,now,reducedMotion=false) {
  const mode=theme==='dark'?'dark':'light';
  state??={mode,boost:false,pending:null,color:[...palettes[mode]],last:now};
  if(state.mode!==mode){state.mode=mode;state.boost=false;state.pending=null;state.last=now;}
  const lost=ratios.length&&ratios.filter(r=>r<1.12).length/ratios.length>=.8;
  const clear=ratios.length&&ratios.filter(r=>r>=1.3).length/ratios.length>=.8;
  const desired=state.boost?!clear:!!lost;
  if(desired!==state.boost) {
    if(state.pending?.boost!==desired)state.pending={boost:desired,since:now};
    if(now-state.pending.since>=450){state.boost=desired;state.pending=null;}
  } else state.pending=null;
  const target=(state.boost?adjusted:palettes)[mode];
  const factor=reducedMotion?1:1-Math.exp(-Math.max(0,now-state.last)/240);
  state.color=state.color.map((c,i)=>Math.abs(c-target[i])<.3?target[i]:c+(target[i]-c)*factor);
  state.last=now;
  return {state,active:!!state.pending||state.color.some((c,i)=>Math.abs(c-target[i])>.3)};
}
export function baseCoating(theme){return palettes[theme==='dark'?'dark':'light'];}
