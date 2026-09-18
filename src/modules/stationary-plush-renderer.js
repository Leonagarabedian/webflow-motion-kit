const TEXTURE_URL = "data:image/webp;base64,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";
const DEFAULTS={base:"#e98aae",highlight:"#f6b3c9",shadow:"#c96b92",crease:"#8f4e70",fuzz:1,puff:1};

function num(el,name,fallback){
  const v=parseFloat(el.getAttribute(name));
  return Number.isFinite(v)?v:fallback;
}
function opts(el){
  return {
    base:el.getAttribute("data-motion-plush-base")||DEFAULTS.base,
    highlight:el.getAttribute("data-motion-plush-highlight")||DEFAULTS.highlight,
    shadow:el.getAttribute("data-motion-plush-shadow")||DEFAULTS.shadow,
    crease:el.getAttribute("data-motion-plush-crease")||DEFAULTS.crease,
    fuzz:Math.max(.6,Math.min(1.6,num(el,"data-motion-plush-fuzz",DEFAULTS.fuzz))),
    puff:Math.max(.7,Math.min(1.45,num(el,"data-motion-plush-puff",DEFAULTS.puff)))
  };
}
function chars(value){
  return typeof Intl?.Segmenter==="function"
    ? [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(value)].map(x=>x.segment)
    : Array.from(value);
}
function wrap(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],glyphs=[];
  while(walker.nextNode()){
    const n=walker.currentNode;
    if(!n.parentElement.closest("script,style,[data-plush-layer]"))nodes.push(n);
  }
  for(const n of nodes){
    const frag=document.createDocumentFragment();
    for(const value of chars(n.data)){
      if(/^\s+$/.test(value)){frag.append(document.createTextNode(value));continue;}
      const span=document.createElement("span");
      span.textContent=value;
      span.setAttribute("data-plush-glyph","");
      Object.assign(span.style,{position:"relative",display:"inline-block",isolation:"isolate"});
      frag.append(span);glyphs.push(span);
    }
    n.replaceWith(frag);
  }
  return glyphs;
}
function layer(glyph,name,styles){
  const node=document.createElement("span");
  node.textContent=glyph.firstChild?.textContent||glyph.textContent||"";
  node.setAttribute("data-plush-layer",name);
  Object.assign(node.style,{
    position:"absolute",inset:"0",display:"block",pointerEvents:"none",
    font:"inherit",letterSpacing:"inherit",lineHeight:"inherit",textTransform:"inherit",
    whiteSpace:"inherit",zIndex:"1",...styles
  });
  return node;
}
function buildGlyph(glyph,o){
  glyph.querySelectorAll("[data-plush-layer]").forEach(n=>n.remove());
  const body=layer(glyph,"body",{
    color:"transparent",WebkitTextFillColor:"transparent",
    backgroundImage:`radial-gradient(circle at 38% 28%, ${o.highlight} 0%, ${o.base} 42%, ${o.shadow} 78%, ${o.crease} 100%)`,
    backgroundSize:"100% 100%",backgroundRepeat:"no-repeat",
    WebkitBackgroundClip:"text",backgroundClip:"text",
    transform:`scale(${1+.018*o.puff})`,transformOrigin:"50% 55%",zIndex:"1"
  });
  const texture=layer(glyph,"texture",{
    color:"transparent",WebkitTextFillColor:"transparent",
    backgroundImage:`url("${TEXTURE_URL}")`,
    backgroundSize:"145% 145%",backgroundPosition:"center",backgroundRepeat:"no-repeat",
    WebkitBackgroundClip:"text",backgroundClip:"text",
    mixBlendMode:"multiply",opacity:".96",filter:"contrast(1.06) saturate(.95)",zIndex:"2"
  });
  const highlight=layer(glyph,"highlight",{
    color:"transparent",WebkitTextFillColor:"transparent",
    backgroundImage:"linear-gradient(to bottom,rgba(255,255,255,.38) 0%,rgba(255,255,255,.10) 36%,rgba(255,255,255,0) 62%)",
    backgroundSize:"100% 100%",backgroundRepeat:"no-repeat",
    WebkitBackgroundClip:"text",backgroundClip:"text",opacity:".72",zIndex:"3"
  });
  const edge=layer(glyph,"edge",{
    color:o.base,WebkitTextFillColor:o.base,
    transform:`scale(${1.018+.008*o.fuzz})`,transformOrigin:"50% 55%",
    filter:`blur(${.42*o.fuzz}px)`,opacity:".74",zIndex:"0"
  });
  glyph.style.color="transparent";
  glyph.style.WebkitTextFillColor="transparent";
  glyph.append(edge,body,texture,highlight);
}
function schedule(fn){
  if(typeof requestIdleCallback==="function")return {kind:"idle",id:requestIdleCallback(fn,{timeout:160})};
  return {kind:"timer",id:setTimeout(fn,16)};
}
function cancelScheduled(h){
  if(!h)return;
  if(h.kind==="idle"&&typeof cancelIdleCallback==="function")cancelIdleCallback(h.id);
  else clearTimeout(h.id);
}
export function attachSafePlushRenderer(surface,element){
  const o=opts(element),glyphs=wrap(surface.layer);
  let destroyed=false,started=false,handle=null,observer=null,index=0;
  surface.layer.style.color=o.base;
  surface.layer.style.WebkitTextFillColor=o.base;

  const renderBatch=deadline=>{
    if(destroyed)return;
    const remaining=()=>deadline?.timeRemaining?.()??6;
    while(index<glyphs.length&&(remaining()>2||deadline?.didTimeout)){
      try{buildGlyph(glyphs[index],o);}catch(_e){}
      index++;
      if(index<glyphs.length&&remaining()<=2)break;
    }
    if(index<glyphs.length)handle=schedule(renderBatch);
  };
  const start=()=>{
    if(started||destroyed)return;
    started=true;handle=schedule(renderBatch);
  };

  if(typeof IntersectionObserver==="function"){
    observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){observer.disconnect();observer=null;start();}
    },{rootMargin:"40% 0px"});
    observer.observe(element);
  }else{
    (typeof requestAnimationFrame==="function"?requestAnimationFrame:(fn)=>setTimeout(fn,16))(start);
  }

  return {
    update(){},
    destroy(){
      destroyed=true;observer?.disconnect();cancelScheduled(handle);
      glyphs.forEach(g=>g.querySelectorAll("[data-plush-layer]").forEach(n=>n.remove()));
    }
  };
}
