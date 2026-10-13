import { paintBackdrop } from './backdrop.js';

export function luminance(rgb) {
  const linear = rgb.map(value => { const c=value/255; return c<=.04045?c/12.92:((c+.055)/1.055)**2.4; });
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
export function contrast(a,b) {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const mix=(back,front,alpha)=>back.map((c,i)=>c*(1-alpha)+front[i]*alpha);
export function compositeGlass(back,tint,opacity,coat,selected=false) {
  let color=mix(back,coat,.25);
  color=mix(color,tint,.33);
  color=mix(color,coat,.13);
  color=mix(back,color,opacity);
  if(selected) color=mix(color,coat,.37*opacity);
  return color;
}
export function chooseForeground(backgrounds,dark,light,previous) {
  const score=color=>Math.min(...backgrounds.map(back=>contrast(color,back)));
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

export function createAdaptiveContrast(element,underlay,artboard,getSettings) {
  let backdrop=null,revision=0,frame=0,disposed=false;
  const groups=[
    ['.google > .adaptive-icon',[134,47,47],[255,224,224]],
    ['.selected',[112,47,134],[250,228,255]],
    ['.collections',[112,47,134],[250,228,255]],
    ['.create',[112,47,134],[250,228,255]],
    ['.plus',[47,70,134],[227,237,255]],
    ['.ask',[47,70,134],[227,237,255]],
    ['.mic',[47,70,134],[227,237,255]],
    ['.voice',[47,70,134],[227,237,255]],
  ].map(([selector,dark,light])=>({node:element.querySelector(selector),dark,light}));
  const surfaces=[...element.querySelectorAll('.surface')];
  function sample(rect) {
    if(!backdrop) return [[255,255,255]];
    const {data,width,height}=backdrop;
    const colors=[];
    // Average a neighborhood for each of nine positions, approximating frost.
    const reach=Math.max(2,getSettings().blur/2)*.5;
    for(const fy of [.25,.5,.75]) for(const fx of [.2,.5,.8]) {
      const centerX=(rect.x+rect.width*fx)*.5;
      const centerY=(rect.y+rect.height*fy+underlay.scrollTop)*.5;
      const rgb=[0,0,0];let count=0;
      for(const dy of [-reach,0,reach]) for(const dx of [-reach,0,reach]) {
        const x=Math.max(0,Math.min(width-1,Math.round(centerX+dx)));
        const y=Math.max(0,Math.min(height-1,Math.round(centerY+dy)));
        const index=(y*width+x)*4;
        for(let c=0;c<3;c++) rgb[c]+=data[index+c];
        count++;
      }
      colors.push(rgb.map(c=>c/count));
    }
    return colors;
  }
  function rectOf(node) {
    const rect=node.getBoundingClientRect(),board=artboard.getBoundingClientRect();
    const scale=board.width/912;
    return {x:(rect.x-board.x)/scale,y:(rect.y-board.y)/scale,width:rect.width/scale,height:rect.height/scale};
  }
  function update() {
    frame=0;if(disposed || !backdrop) return;
    const settings=getSettings();
    for(const surface of surfaces) {
      const colors=sample(rectOf(surface));
      const average=colors.reduce((sum,c)=>sum+luminance(c),0)/colors.length;
      const wasDark=surface.dataset.coating==='dark';
      const dark=average<(wasDark?.24:.18);
      surface.dataset.coating=dark?'dark':'light';
      surface.style.setProperty('--coat',dark?'24,28,32':'255,255,255');
    }
    for(const group of groups) {
      const {node}=group,surface=node.closest('.surface');
      const tint=getComputedStyle(surface).getPropertyValue('--tint').split(',').map(Number);
      const coat=surface.dataset.coating==='dark'?[24,28,32]:[255,255,255];
      const backgrounds=sample(rectOf(node)).map(c=>compositeGlass(c,tint,settings.opacity/100,coat,node.matches('.selected,.voice')));
      const result=chooseForeground(backgrounds,group.dark,group.light,node.dataset.foreground);
      node.dataset.foreground=result.mode;
      node.dataset.contrast=result.ratio.toFixed(2);
      node.style.setProperty('--adaptive-foreground',`rgb(${result.color.join(',')})`);
    }
  }
  function schedule() {if(!frame&&!disposed) frame=requestAnimationFrame(update);}
  async function capture() {
    const current=++revision;
    const clone=underlay.cloneNode(true);
    clone.removeAttribute('tabindex');clone.setAttribute('aria-hidden','true');
    const height=Math.max(722,underlay.scrollHeight);
    Object.assign(clone.style,{position:'fixed',left:'-10000px',top:'0',width:'912px',height:`${height}px`,transform:'none',pointerEvents:'none'});
    element.append(clone);
    try {
      await Promise.all([...clone.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
      if(disposed||current!==revision) return;
      backdrop=paintBackdrop(clone);
      schedule();
    } catch(error) {
      // A rasterization failure still uses the scene's actual theme as fallback.
      if(!disposed&&current===revision) {
        const dark=getSettings().theme==='dark';
        const canvas=document.createElement('canvas');canvas.width=456;canvas.height=Math.ceil(height/2);
        const context=canvas.getContext('2d');context.fillStyle=dark?'#171f1a':'#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
        backdrop=context.getImageData(0,0,canvas.width,canvas.height);schedule();
        console.warn('Backdrop contrast uses theme fallback:',error);
      }
    } finally {clone.remove();}
  }
  return {capture,schedule,destroy(){disposed=true;revision++;cancelAnimationFrame(frame);}};
}
