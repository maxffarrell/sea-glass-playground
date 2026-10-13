// Paint the preview's computed backgrounds and images into a small local canvas.
// This avoids SVG foreignObject rasterization, which is blank in some WebViews.
function splitLayers(value) {
  const parts=[];let depth=0,start=0;
  for(let i=0;i<value.length;i++) {
    if(value[i]==='(') depth++;
    if(value[i]===')') depth--;
    if(value[i]===','&&depth===0){parts.push(value.slice(start,i).trim());start=i+1;}
  }
  parts.push(value.slice(start).trim());return parts;
}
function paintGradient(context,layer,width,height) {
  const match=layer.match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/);
  if(!match) return;
  const parts=splitLayers(match[3]);
  const hasDirection=!/^(rgb|#|transparent)/.test(parts[0]);
  const direction=hasDirection?parts.shift():'';
  let gradient,length;
  if(match[2]==='linear') {
    const angle=(direction.includes('deg')?parseFloat(direction):direction==='to top'?0:180)*Math.PI/180;
    const dx=Math.sin(angle),dy=-Math.cos(angle);
    length=Math.abs(width*dx)+Math.abs(height*dy);
    gradient=context.createLinearGradient(width/2-dx*length/2,height/2-dy*length/2,width/2+dx*length/2,height/2+dy*length/2);
  } else {
    const position=direction.match(/at\s+(\d+)%\s+(\d+)%/);
    const x=position?width*Number(position[1])/100:width/2,y=position?height*Number(position[2])/100:height/2;
    length=Math.max(Math.hypot(x,y),Math.hypot(width-x,height-y));
    gradient=context.createRadialGradient(x,y,0,x,y,length);
  }
  const stops=[];
  parts.forEach((part,i)=>{
    const color=part.match(/^(rgba?\([^)]*\)|#[\da-f]+|transparent|[a-z]+)/i)?.[0];
    if(!color)return;
    const positions=part.slice(color.length).match(/[\d.]+(?:%|px)/g);
    if(positions)positions.forEach(position=>stops.push({color,offset:parseFloat(position)/(position.endsWith('%')?100:length)}));
    else stops.push({color,offset:i/(parts.length-1)});
  });
  if(match[1]&&stops.length) {
    const period=stops.at(-1).offset;
    if(period>0) for(let shift=0;shift<1;shift+=period) for(const stop of stops) {
      if(shift+stop.offset<=1)gradient.addColorStop(shift+stop.offset,stop.color);
    }
  } else for(const stop of stops)gradient.addColorStop(Math.max(0,Math.min(1,stop.offset)),stop.color);
  context.fillStyle=gradient;context.fillRect(0,0,width,height);
}
export function paintBackdrop(scene) {
  const canvas=document.createElement('canvas'),height=Math.max(722,scene.scrollHeight);
  canvas.width=456;canvas.height=Math.ceil(height/2);
  const context=canvas.getContext('2d');context.scale(.5,.5);
  const origin=scene.getBoundingClientRect();
  const paint=node=>{
    const style=getComputedStyle(node),box=node.getBoundingClientRect();
    const x=box.x-origin.x,y=box.y-origin.y,width=box.width,height=box.height;
    if(!width||!height)return;
    context.save();context.translate(x,y);
    const radius=Math.min(parseFloat(style.borderTopLeftRadius)||0,width/2,height/2);
    context.beginPath();context.roundRect(0,0,width,height,radius);context.clip();
    context.fillStyle=style.backgroundColor;context.fillRect(0,0,width,height);
    if(node===scene&&scene.dataset.background==='checker') {
      for(let py=0;py<height;py+=16)for(let px=0;px<width;px+=16) {
        context.fillStyle=(px/16+py/16)%2?scene.dataset.theme==='dark'?'#29322b':'#ecede8':scene.dataset.theme==='dark'?'#171f1a':'#fff';
        context.fillRect(px,py,16,16);
      }
    } else splitLayers(style.backgroundImage).reverse().forEach(layer=>paintGradient(context,layer,width,height));
    if(node instanceof HTMLImageElement&&node.complete&&node.naturalWidth) {
      const scale=Math.max(width/node.naturalWidth,height/node.naturalHeight);
      const imageWidth=node.naturalWidth*scale,imageHeight=node.naturalHeight*scale;
      context.drawImage(node,(width-imageWidth)/2,(height-imageHeight)/2,imageWidth,imageHeight);
    }
    context.restore();
    for(const child of node.children)paint(child);
    // The preview presets use leaf text blocks. Approximate wrapping with the
    // browser's computed font and measured block width; frost averages details.
    if(!node.children.length&&node.textContent?.trim()) {
      context.save();context.fillStyle=style.color;context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const fontSize=parseFloat(style.fontSize),lineHeight=parseFloat(style.lineHeight)||fontSize*1.2;
      const left=x+parseFloat(style.paddingLeft),top=y+parseFloat(style.paddingTop);
      const available=width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      context.textBaseline='top';let lineIndex=0;
      for(const paragraph of node.textContent.split('\n')) {
        let line='';
        for(const word of paragraph.split(/\s+/)) {
          const next=line?`${line} ${word}`:word;
          if(line&&context.measureText(next).width>available){context.fillText(line,left,top+lineIndex++*lineHeight);line=word;}else line=next;
        }
        context.fillText(line,left,top+lineIndex++*lineHeight);
      }
      context.restore();
    }
  };
  paint(scene);return context.getImageData(0,0,canvas.width,canvas.height);
}
