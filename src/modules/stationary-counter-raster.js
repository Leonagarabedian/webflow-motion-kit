// Enclosed transparent components are counters; exterior transparency is excluded.
export function findCounters(data, width, height) {
  const seen=new Uint8Array(width*height), counters=[];
  const transparent=i => data[i*4+3]<128;
  for(let seed=0;seed<seen.length;seed++) {
    if(seen[seed] || !transparent(seed)) continue;
    const queue=[seed], pixels=[]; seen[seed]=1; let exterior=false;
    for(let q=0;q<queue.length;q++) {
      const i=queue[q], x=i%width,y=Math.floor(i/width);pixels.push(i);
      if(x===0||y===0||x===width-1||y===height-1) exterior=true;
      for(const j of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1]) {
        if(j>=0&&!seen[j]&&transparent(j)){seen[j]=1;queue.push(j);}
      }
    }
    if(!exterior&&pixels.length>1) {
      const mask=new Set(pixels);
      const cx=pixels.reduce((sum,i)=>sum+i%width,0)/pixels.length;
      const cy=pixels.reduce((sum,i)=>sum+Math.floor(i/width),0)/pixels.length;
      counters.push({pixels,mask,cx,cy});
    }
  }
  return counters;
}

export function counterFrame(source, width, counters, progress, scale=0.82, distort=0, color=[0,0,0]) {
  const output=new Uint8ClampedArray(source);
  if(progress>=1) return output;
  const pressure=Math.max(0.1,Math.min(1,scale+(1-scale)*progress));
  for(const {pixels,mask,cx,cy} of counters) for(const i of pixels) {
    const x=i%width,y=Math.floor(i/width);
    const skew=(1-progress)*distort*(y-cy);
    const sx=Math.round(cx+(x-cx-skew)/pressure),sy=Math.round(cy+(y-cy)/pressure);
    if(sx<0||sx>=width||!mask.has(sy*width+sx)) {
      output[i*4]=color[0];output[i*4+1]=color[1];output[i*4+2]=color[2];output[i*4+3]=255;
    }
  }
  return output;
}

export function createCounterSurface(char, {scale=0.82,distort=0}={}) {
  const rect=char.getBoundingClientRect();
  if(rect.width<=0 || rect.height<=0) return null;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx) return null;
  const cs=getComputedStyle(char),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.ceil(rect.width*dpr));canvas.height=Math.max(1,Math.ceil(rect.height*dpr));
  ctx.scale(dpr,dpr);
  ctx.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.fillStyle=cs.color;
  const text=cs.textTransform==='uppercase' ? char.textContent.toUpperCase() : cs.textTransform==='lowercase' ? char.textContent.toLowerCase() : char.textContent;
  const metrics=ctx.measureText(text);
  const ascent=metrics.fontBoundingBoxAscent ?? parseFloat(cs.fontSize)*0.8;
  const descent=metrics.fontBoundingBoxDescent ?? parseFloat(cs.fontSize)*0.2;
  ctx.fillText(text,0,(rect.height-ascent-descent)/2+ascent);
  const source=ctx.getImageData(0,0,canvas.width,canvas.height);
  const counters=findCounters(source.data,canvas.width,canvas.height);
  if(!counters.length) return null;
  const sample=source.data.findIndex((_,i)=>i%4===3&&source.data[i]>240);
  const rgb=sample>=0?[...source.data.slice(sample-3,sample)]:[0,0,0];
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  canvas.setAttribute('aria-hidden','true');
  const previous=char.getAttribute('style');
  char.style.position='relative';char.style.color='transparent';char.append(canvas);
  return {render(progress) {
    const frame=ctx.createImageData(canvas.width,canvas.height);
    frame.data.set(counterFrame(source.data,canvas.width,counters,progress,scale,distort,rgb));
    ctx.putImageData(frame,0,0);
  },remove(){canvas.remove();if(previous==null)char.removeAttribute('style');else char.setAttribute('style',previous);}};
}
