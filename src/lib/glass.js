import { paintBackdrop } from './backdrop.js';
import { chooseForeground, contrast, luminance, contrastGuard } from './contrast.js';

const mix=(back,front,alpha)=>back.map((c,i)=>c*(1-alpha)+front[i]*alpha);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

// Three separable box passes approximate a Gaussian. Unlike SVG filters on
// HTML or CanvasRenderingContext2D.filter, this works in Safari/WebViews too.
function blurPixels(image,sigma) {
  const {width,height}=image;
  let source=new Float32Array(image.data),target=new Float32Array(source.length);
  const radius=Math.max(0,Math.round((Math.sqrt(4*sigma*sigma+1)-1)/2));
  if(!radius)return image;
  const diameter=radius*2+1;
  for(let pass=0;pass<3;pass++) {
    for(let y=0;y<height;y++)for(let channel=0;channel<3;channel++) {
      const at=x=>((y*width+clamp(x,0,width-1))*4+channel);
      let sum=0;for(let x=-radius;x<=radius;x++)sum+=source[at(x)];
      for(let x=0;x<width;x++){target[(y*width+x)*4+channel]=sum/diameter;sum+=source[at(x+radius+1)]-source[at(x-radius)];}
    }
    [source,target]=[target,source];
    for(let x=0;x<width;x++)for(let channel=0;channel<3;channel++) {
      const at=y=>((clamp(y,0,height-1)*width+x)*4+channel);
      let sum=0;for(let y=-radius;y<=radius;y++)sum+=source[at(y)];
      for(let y=0;y<height;y++){target[(y*width+x)*4+channel]=sum/diameter;sum+=source[at(y+radius+1)]-source[at(y-radius)];}
    }
    [source,target]=[target,source];
  }
  const data=new Uint8ClampedArray(source.length);
  for(let i=0;i<data.length;i+=4){data[i]=source[i];data[i+1]=source[i+1];data[i+2]=source[i+2];data[i+3]=255;}
  return {width,height,data};
}

export function lowerHighlight(depth,normalY) {
  // The source's negative-Y inner shadow is a luminous band inside the lower
  // curved rim, not an exterior drop shadow. Follow the capsule normal.
  return .52*Math.max(0,normalY)*Math.exp(-(((depth-10)/17)**2));
}
export function guardCoverage(px,py,box) {
  return clamp((1+Math.min(px-(box.x-8),box.x+box.width+8-px,py-(box.y-8),box.y+box.height+8-py))/8,0,1);
}

export function createGlassRenderer(element,underlay,artboard,getSettings) {
  let backdrop=null,frost=null,blur=-1,revision=0,frame=0,disposed=false;
  const shapes=[...element.querySelectorAll('.surface')].map(node=>{
    const canvas=document.createElement('canvas');canvas.className='glass-pixels';canvas.setAttribute('aria-hidden','true');
    canvas.width=node.offsetWidth;canvas.height=node.offsetHeight;node.prepend(canvas);
    return {node,canvas,context:canvas.getContext('2d'),width:canvas.width,height:canvas.height,x:node.offsetLeft,y:node.offsetTop};
  });
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
  let seed=74321;
  const noise=Array.from({length:256*256},()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});
  function sample(image,x,y) {
    const i=(clamp(Math.round(y/2),0,image.height-1)*image.width+clamp(Math.round(x/2),0,image.width-1))*4;
    return [image.data[i],image.data[i+1],image.data[i+2]];
  }
  function bounds(node,shape) {
    const r=node.getBoundingClientRect(),board=artboard.getBoundingClientRect(),scale=board.width/912;
    return {x:(r.x-board.x)/scale-shape.x,y:(r.y-board.y)/scale-shape.y,width:r.width/scale,height:r.height/scale};
  }
  function update() {
    frame=0;if(disposed||!backdrop)return;
    const settings=getSettings(),opacity=settings.opacity/100;
    if(blur!==settings.blur){blur=settings.blur;frost=blurPixels(backdrop,blur/4);}
    for(const shape of shapes) {
      const {node,width,height,x,y,context}=shape;
      const tint=getComputedStyle(node).getPropertyValue('--tint').split(',').map(Number);
      // Determine coating from the current area, then keep it consistent with
      // the pixel buffer used for contrast. Theme alone never chooses ink.
      const background=sample(frost,x+width/2,y+height/2+underlay.scrollTop);
      const dark=luminance(background)<(node.dataset.coating==='dark'?.22:.16);
      const coat=dark?[24,28,32]:[255,255,255];node.dataset.coating=dark?'dark':'light';
      const data=context.createImageData(width,height),visible=new Float32Array(width*height*3);
      const radius=height/2;
      const insets=[...node.querySelectorAll('.selected,.voice')].map(n=>bounds(n,shape));
      for(let py=0;py<height;py++)for(let px=0;px<width;px++) {
        const dx=px+.5-clamp(px+.5,radius,width-radius),dy=py+.5-radius,length=Math.hypot(dx,dy);
        const depth=radius-length,nx=length?dx/length:0,ny=length?dy/length:0;
        const bend=depth>=0&&depth<23?Math.sin(depth/23*Math.PI)*settings.distortion/100*23:0;
        const back=sample(backdrop,x+px,y+py+underlay.scrollTop);
        let color=sample(frost,x+px-nx*bend,y+py-ny*bend+underlay.scrollTop);
        color=mix(color,coat,.25);color=mix(color,tint,.33);color=mix(color,coat,.15-.04*py/height);
        color=mix(color,[255,255,255],.18*Math.max(0,-ny)*Math.exp(-Math.max(0,depth)/23));
        color=mix(color,[231,255,255],lowerHighlight(depth,ny));
        for(const inset of insets) {
          const r=inset.height/2,cx=clamp(px,inset.x+r,inset.x+inset.width-r),cy=inset.y+r;
          if(Math.hypot(px-cx,py-cy)<r)color=mix(color,coat,.37);
        }
        // Density remains the source's 35%; strength is calibrated to its
        // faint 2px speckles rather than opaque single-pixel static.
        const grain=noise[(Math.floor(py/2)%256)*256+Math.floor(px/2)%256];
        if(grain<settings.grain/100)color=mix(color,grain<settings.grain/200?[0,0,0]:[255,255,255],grain<settings.grain/200?.035:.055);
        const i=(py*width+px)*4,j=(py*width+px)*3;
        for(let c=0;c<3;c++){data.data[i+c]=color[c];visible[j+c]=back[c]*(1-opacity)+color[c]*opacity;}
        data.data[i+3]=Math.round(opacity*255);
      }
      for(const group of groups.filter(g=>g.node.closest('.surface')===node)) {
        // Photos contains an icon and a text span: measure the actual glyph
        // area rather than its entire highlighted pill and rounded corners.
        const targets=group.node.matches('.selected,.voice')?[...group.node.children]:[group.node];
        const boxes=targets.map(target=>bounds(target,shape));
        const pixels=[];
        for(const box of boxes)for(let py=Math.max(0,Math.floor(box.y+box.height*.2));py<Math.min(height,box.y+box.height*.8);py+=2)
          for(let px=Math.max(0,Math.floor(box.x));px<Math.min(width,box.x+box.width);px+=2) {
            const i=(py*width+px)*3;pixels.push([visible[i],visible[i+1],visible[i+2]]);
          }
        if(!pixels.length)continue;
        let result=chooseForeground(pixels,group.dark,group.light,group.node.dataset.foreground);
        let guard=0;
        if(result.ratio<4.5) {
          const scrim=result.mode==='light'?[0,0,0]:[255,255,255];
          // Find the least material adjustment that clears every sampled
          // finished pixel, including bright lower caustics and inset fills.
          guard=contrastGuard(pixels,result.color,result.mode);
          for(const box of boxes)for(let py=Math.max(0,Math.floor(box.y-8));py<Math.min(height,box.y+box.height+8);py++)
            for(let px=Math.max(0,Math.floor(box.x-8));px<Math.min(width,box.x+box.width+8);px++) {
              // Include the fractional boundary pixel measured by floor(x).
              const feather=guardCoverage(px,py,box);
              const alpha=guard*feather,i=(py*width+px)*4,j=(py*width+px)*3,oldAlpha=data.data[i+3]/255,newAlpha=alpha+oldAlpha*(1-alpha);
              for(let c=0;c<3;c++) {data.data[i+c]=(scrim[c]*alpha+data.data[i+c]*oldAlpha*(1-alpha))/newAlpha;visible[j+c]=visible[j+c]*(1-alpha)+scrim[c]*alpha;}
              data.data[i+3]=Math.round(newAlpha*255);
            }
          result={...result,ratio:Math.min(...pixels.map(pixel=>contrast(result.color,mix(pixel,scrim,guard))))};
        }
        group.node.dataset.foreground=result.mode;group.node.dataset.contrast=result.ratio.toFixed(2);group.node.dataset.contrastGuard=guard.toFixed(3);
        group.node.style.setProperty('--adaptive-foreground',`rgb(${result.color.join(',')})`);
      }
      context.putImageData(data,0,0);
      // Audit the quantized canvas result, rather than reporting the solver's
      // floating-point prediction. Also read the effective CSS foreground so
      // specificity or color transitions cannot silently invalidate it.
      const painted=context.getImageData(0,0,width,height).data;
      for(const group of groups.filter(g=>g.node.closest('.surface')===node)) {
        const ink=getComputedStyle(group.node).color.match(/[\d.]+/g)?.slice(0,3).map(Number);
        if(!ink)continue;
        const targets=group.node.matches('.selected,.voice')?[...group.node.children]:[group.node];
        let minimum=21;
        for(const target of targets) {
          const box=bounds(target,shape);
          for(let py=Math.max(0,Math.floor(box.y+box.height*.2));py<Math.min(height,box.y+box.height*.8);py+=2)
            for(let px=Math.max(0,Math.floor(box.x));px<Math.min(width,box.x+box.width);px+=2) {
              const i=(py*width+px)*4,alpha=painted[i+3]/255,back=sample(backdrop,x+px,y+py+underlay.scrollTop);
              const color=back.map((c,channel)=>c*(1-alpha)+painted[i+channel]*alpha);
              const measured=contrast(ink,color);
              minimum=Math.min(minimum,measured);
            }
        }
        group.node.dataset.contrast=minimum.toFixed(2);
      }
    }
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(update);}
  async function capture() {
    const current=++revision,clone=underlay.cloneNode(true);clone.removeAttribute('tabindex');clone.setAttribute('aria-hidden','true');
    Object.assign(clone.style,{position:'fixed',left:'-10000px',top:'0',width:'912px',height:`${Math.max(722,underlay.scrollHeight)}px`,transform:'none',pointerEvents:'none'});
    element.append(clone);
    try {
      await Promise.all([...clone.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
      if(disposed||current!==revision)return;
      backdrop=paintBackdrop(clone);blur=-1;schedule();
    } finally {clone.remove();}
  }
  return {capture,schedule,destroy(){disposed=true;revision++;cancelAnimationFrame(frame);shapes.forEach(s=>s.canvas.remove());}};
}
