const DEFAULTS = {
  base:"#e98aae",
  highlight:"#f6b3c9",
  shadow:"#c96b92",
  crease:"#8f4e70",
  density:1.05,
  fuzz:1,
  puff:1
};

function readNumberAttr(element,name,fallback){
  const value=parseFloat(element.getAttribute(name));
  return Number.isFinite(value)?value:fallback;
}
function optionsFor(element){
  return {
    base:element.getAttribute("data-motion-plush-base")||DEFAULTS.base,
    highlight:element.getAttribute("data-motion-plush-highlight")||DEFAULTS.highlight,
    shadow:element.getAttribute("data-motion-plush-shadow")||DEFAULTS.shadow,
    crease:element.getAttribute("data-motion-plush-crease")||DEFAULTS.crease,
    density:Math.max(.65,Math.min(1.5,readNumberAttr(element,"data-motion-plush-density",DEFAULTS.density))),
    fuzz:Math.max(.6,Math.min(1.5,readNumberAttr(element,"data-motion-plush-fuzz",DEFAULTS.fuzz))),
    puff:Math.max(.7,Math.min(1.45,readNumberAttr(element,"data-motion-plush-puff",DEFAULTS.puff)))
  };
}
function hash(value){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function rng(seedValue){
  let seed=Math.max(1,seedValue|0)%2147483647;
  return ()=>((seed=(seed*48271)%2147483647)/2147483647);
}
function idle(fn){
  if(typeof requestIdleCallback==="function") return {kind:"idle",id:requestIdleCallback(fn,{timeout:180})};
  return {kind:"timer",id:setTimeout(()=>fn({timeRemaining:()=>8,didTimeout:true}),16)};
}
function cancelIdle(handle){
  if(!handle)return;
  if(handle.kind==="idle"&&typeof cancelIdleCallback==="function")cancelIdleCallback(handle.id);
  else clearTimeout(handle.id);
}
function segment(value){
  if(typeof Intl?.Segmenter==="function"){
    return [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(value)].map(x=>x.segment);
  }
  return Array.from(value);
}
function wrapGlyphs(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(!node.parentElement.closest("script,style,[data-plush-canvas]"))nodes.push(node);
  }
  const glyphs=[];
  for(const node of nodes){
    const frag=document.createDocumentFragment();
    for(const value of segment(node.data)){
      if(/^\s+$/.test(value)){frag.append(document.createTextNode(value));continue;}
      const span=document.createElement("span");
      span.textContent=value;
      span.setAttribute("data-plush-glyph","");
      Object.assign(span.style,{position:"relative",display:"inline-block",isolation:"isolate"});
      frag.append(span);glyphs.push(span);
    }
    node.replaceWith(frag);
  }
  return glyphs;
}
function maskFor(glyph,padCss){
  const rect=glyph.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const style=getComputedStyle(glyph);
  const dpr=Math.max(1.5,Math.min(2.25,window.devicePixelRatio||2));
  const cssW=rect.width+padCss*2,cssH=rect.height+padCss*2;
  const width=Math.max(24,Math.min(520,Math.ceil(cssW*dpr)));
  const height=Math.max(24,Math.min(520,Math.ceil(cssH*dpr)));
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)return null;
  const fontSize=parseFloat(style.fontSize)*dpr;
  ctx.font=`${style.fontStyle||"normal"} ${style.fontWeight||400} ${fontSize}px ${style.fontFamily}`;
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";
  ctx.fillText(glyph.textContent||"",width/2,height/2+fontSize*.01);
  const data=ctx.getImageData(0,0,width,height);
  const alpha=new Uint8Array(width*height);
  for(let i=0;i<alpha.length;i++)alpha[i]=data.data[i*4+3];
  return {width,height,dpr,cssW,cssH,alpha};
}
function geometry(mask){
  const {width,height,alpha}=mask,inside=[],edge=[];
  const isIn=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&alpha[y*width+x]>72;
  const step=2;
  for(let y=2;y<height-2;y+=step){
    for(let x=2;x<width-2;x+=step){
      if(!isIn(x,y))continue;
      inside.push([x,y]);
      if(!isIn(x-2,y)||!isIn(x+2,y)||!isIn(x,y-2)||!isIn(x,y+2))edge.push([x,y]);
    }
  }
  return {inside,edge};
}
function nearestEdgeDirection(x,y,edge){
  if(!edge.length)return {tangent:Math.PI/2,normal:0};
  let best=Infinity,nx=edge[0][0],ny=edge[0][1];
  const stride=Math.max(1,Math.floor(edge.length/220));
  for(let i=0;i<edge.length;i+=stride){
    const p=edge[i],dx=p[0]-x,dy=p[1]-y,d=dx*dx+dy*dy;
    if(d<best){best=d;nx=p[0];ny=p[1];}
  }
  const normal=Math.atan2(ny-y,nx-x);
  return {normal,tangent:normal+Math.PI/2};
}
function makeMaskCanvas(mask){
  const canvas=document.createElement("canvas");canvas.width=mask.width;canvas.height=mask.height;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  const image=ctx.createImageData(mask.width,mask.height);
  for(let i=0;i<mask.alpha.length;i++){
    image.data[i*4]=255;image.data[i*4+1]=255;image.data[i*4+2]=255;image.data[i*4+3]=mask.alpha[i];
  }
  ctx.putImageData(image,0,0);return canvas;
}
function drawHair(ctx,x,y,angle,len,width,color,alpha,bend){
  const x2=x+Math.cos(angle)*len,y2=y+Math.sin(angle)*len;
  const cx=x+(x2-x)*.5-Math.sin(angle)*bend,cy=y+(y2-y)*.5+Math.cos(angle)*bend;
  ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(cx,cy,x2,y2);ctx.stroke();
}
function renderGlyph(glyph,index,opts){
  const padCss=5.5*opts.fuzz;
  const mask=maskFor(glyph,padCss);if(!mask)return null;
  const geo=geometry(mask);if(!geo.inside.length)return null;
  const maskCanvas=makeMaskCanvas(mask);if(!maskCanvas)return null;
  const canvas=document.createElement("canvas");canvas.width=mask.width;canvas.height=mask.height;
  canvas.setAttribute("data-plush-canvas","");
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  const rand=rng(hash(`${glyph.textContent}:${index}:${mask.width}:${mask.height}`));

  // Soft inflated body.
  const body=ctx.createRadialGradient(mask.width*.40,mask.height*.30,Math.min(mask.width,mask.height)*.04,mask.width*.53,mask.height*.58,Math.max(mask.width,mask.height)*.72);
  body.addColorStop(0,opts.highlight);body.addColorStop(.42,opts.base);body.addColorStop(.76,opts.shadow);body.addColorStop(1,opts.crease);
  ctx.fillStyle=body;ctx.fillRect(0,0,mask.width,mask.height);
  ctx.globalCompositeOperation="destination-in";ctx.drawImage(maskCanvas,0,0);ctx.globalCompositeOperation="source-over";

  // Dense short-pile tuft clusters, tangential to nearest contour.
  const tuftClusters=Math.min(1000,Math.max(180,Math.round(geo.inside.length*.18*opts.density)));
  const palette=[
    {c:opts.crease,a:.09,l:[1.1,2.1],w:[.34,.56]},
    {c:opts.shadow,a:.15,l:[1.0,1.9],w:[.30,.50]},
    {c:opts.base,a:.20,l:[.9,1.75],w:[.28,.46]},
    {c:opts.highlight,a:.21,l:[.8,1.55],w:[.24,.42]}
  ];
  const pile=document.createElement("canvas");pile.width=mask.width;pile.height=mask.height;
  const pc=pile.getContext("2d");if(!pc)return null;
  pc.shadowBlur=.35*mask.dpr;pc.shadowColor="rgba(255,255,255,.08)";
  for(let i=0;i<tuftClusters;i++){
    const p=geo.inside[Math.floor(rand()*geo.inside.length)];
    const dir=nearestEdgeDirection(p[0],p[1],geo.edge);
    const hairs=3+Math.floor(rand()*3);
    for(let h=0;h<hairs;h++){
      const layer=palette[Math.floor(rand()*palette.length)];
      const angle=dir.tangent+(rand()-.5)*.34;
      const len=(layer.l[0]+rand()*(layer.l[1]-layer.l[0]))*mask.dpr;
      const width=(layer.w[0]+rand()*(layer.w[1]-layer.w[0]))*mask.dpr;
      const offset=(rand()-.5)*1.25*mask.dpr;
      const x=p[0]-Math.sin(dir.tangent)*offset,y=p[1]+Math.cos(dir.tangent)*offset;
      drawHair(pc,x,y,angle,len,width,layer.c,layer.a,(rand()-.5)*len*.16);
    }
  }
  pc.globalCompositeOperation="destination-in";pc.drawImage(maskCanvas,0,0);pc.globalCompositeOperation="source-over";
  ctx.drawImage(pile,0,0);

  // Fuzzy silhouette: short fibers grow from sampled contour points.
  ctx.shadowBlur=0;
  const edgeStride=Math.max(1,Math.floor(geo.edge.length/240));
  for(let i=0;i<geo.edge.length;i+=edgeStride){
    if(rand()>.72)continue;
    const p=geo.edge[i];
    const dir=nearestEdgeDirection(p[0],p[1],geo.edge);
    const angle=dir.tangent+(rand()-.5)*.7;
    const len=(.7+rand()*1.25)*mask.dpr*opts.fuzz;
    drawHair(ctx,p[0],p[1],angle,len,.28*mask.dpr,rand()>.55?opts.highlight:opts.base,.22,(rand()-.5)*len*.12);
  }
  ctx.globalAlpha=1;

  Object.assign(canvas.style,{
    position:"absolute",left:`${-padCss}px`,top:`${-padCss}px`,
    width:`${mask.cssW}px`,height:`${mask.cssH}px`,
    pointerEvents:"none",maxWidth:"none",zIndex:"1"
  });
  return canvas;
}

export function attachSafePlushRenderer(surface,element){
  const opts=optionsFor(element);
  let destroyed=false,started=false,idleHandle=null,observer=null,index=0;
  const glyphs=wrapGlyphs(surface.layer);
  surface.layer.style.color=opts.base;
  surface.layer.style.WebkitTextFillColor=opts.base;

  const renderNext=(deadline)=>{
    if(destroyed)return;
    const budget=()=>deadline?.timeRemaining?.()??6;
    while(index<glyphs.length&&(budget()>2||deadline?.didTimeout)){
      const glyph=glyphs[index];
      try{
        glyph.querySelectorAll("[data-plush-canvas]").forEach(node=>node.remove());
        const canvas=renderGlyph(glyph,index,opts);
        if(canvas){
          glyph.style.color="transparent";glyph.style.WebkitTextFillColor="transparent";
          glyph.append(canvas);
        }
      }catch(_error){
        // Fail soft: this glyph stays as the simple base-color fallback.
      }
      index++;
      if(index<glyphs.length&&budget()<=2)break;
    }
    if(index<glyphs.length)idleHandle=idle(renderNext);
  };
  const start=()=>{
    if(started||destroyed)return;started=true;
    idleHandle=idle(renderNext);
  };

  if(typeof IntersectionObserver==="function"){
    observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();observer=null;start();}
    },{rootMargin:"35% 0px"});
    observer.observe(element);
  }else{
    const raf=typeof requestAnimationFrame==="function"?requestAnimationFrame:(fn)=>setTimeout(fn,16);
    raf(start);
  }

  return {
    update(){
      // Surface geometry refreshes synchronously. Heavy plush rasterization stays deferred.
    },
    destroy(){
      destroyed=true;observer?.disconnect();cancelIdle(idleHandle);
      glyphs.forEach(g=>g.querySelectorAll("[data-plush-canvas]").forEach(node=>node.remove()));
    }
  };
}
