import {afterEach, describe, expect, it, vi} from 'vitest';
import {gsap,plugins} from '../src/core/gsap.js';
import {createScrollAlignment} from '../src/core/scroll-alignment/index.js';
import {auditScrollAlignment} from '../src/core/scroll-alignment/migration-audit.js';
import {createStationaryTextModule} from '../src/modules/stationary-text-effects.js';
import {stationaryTypographyNames as names} from '../src/modules/stationary-text-policy.js';
import {counterFrame,findCounters} from '../src/modules/stationary-counter-raster.js';

function fixture(name, attributes='') {
  document.body.innerHTML=`<section style="background:linear-gradient(red,blue)"><h1 data-motion="${name}" ${attributes} style="color:rgb(35,35,35);font-size:48px;line-height:52px;padding-inline-start:40px;padding-inline-end:20px;padding:10px 20px 30px 40px;will-change:opacity">BRANDA <em id="authored" style="color:rgb(90,20,30)">OPENS</em><br>SPACE</h1></section>`;
  const el=document.querySelector('h1');
  el.getBoundingClientRect=()=>({top:600,left:0,width:500,height:120,bottom:720,right:500});
  let timeline,config;
  const ScrollTrigger={getAll:()=>[],refresh:vi.fn(),create:vi.fn((cfg,tl)=>{timeline=tl;config=cfg;tl.pause();tl.scrollTrigger={kill:vi.fn(),revert:vi.fn()};return tl.scrollTrigger;})};
  const scrollAlignment=createScrollAlignment({gsap,ScrollTrigger,logger:{warn:vi.fn()}});
  const build=vi.spyOn(scrollAlignment,'build');
  const services={gsap,ScrollTrigger,scrollAlignment,reducedMotion:()=>false};
  return {el,services,build,get timeline(){return timeline},get config(){return config},ScrollTrigger};
}
afterEach(()=>{gsap.globalTimeline.clear();document.body.innerHTML='';});

describe('stationary typography behavior and migration',()=>{
  it.each(names)('%s restores exact styles, markup, original nodes and listeners',name=>{
    const f=fixture(name),before=f.el.outerHTML,child=f.el.querySelector('em'),text=f.el.firstChild;
    const listener=vi.fn();child.addEventListener('click',listener);
    const cleanup=createStationaryTextModule(name).mount(f.el,f.services);
    expect(f.ScrollTrigger.create).toHaveBeenCalledTimes(1);
    for(const progress of [0,0.5,1]) f.timeline.totalProgress(progress);
    expect(f.build.mock.calls[0][1].motionTimeline).toBe(f.timeline);
    expect(f.build.mock.calls[0][1].stages).toBeUndefined();
    expect(f.config.scrub).not.toBe(0.65);
    expect(Number.isFinite(f.config.start())).toBe(true);
    expect(f.config.end()).toBeGreaterThan(f.config.start());
    cleanup();
    expect(f.el.outerHTML).toBe(before);
    expect(f.el.querySelector('em')).toBe(child);expect(f.el.firstChild).toBe(text);
    child.click();expect(listener).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-motion-surface],[data-motion-filter]')).toHaveLength(0);
  });
  it.each(names)('%s honors manual fallback, explicit scrub and reduced motion',name=>{
    const f=fixture(name,'data-motion-align="legacy" data-motion-start="top 80%" data-motion-end="bottom 20%" data-motion-scrub="0.9"');
    const cleanup=createStationaryTextModule(name).mount(f.el,f.services);
    expect(f.build).not.toHaveBeenCalled();expect(f.config.start).toBe('top 80%');expect(f.config.end).toBe('bottom 20%');expect(f.config.scrub).toBe(0.9);cleanup();
    const before=f.el.outerHTML;
    createStationaryTextModule(name).mount(f.el,{...f.services,reducedMotion:()=>true});
    expect(f.el.outerHTML).toBe(before);expect(f.ScrollTrigger.create).toHaveBeenCalledTimes(1);
  });
  it('preserves asymmetric section padding and remeasures authored endpoints',()=>{
    const f=fixture('section-space');
    const cleanup=createStationaryTextModule('section-space').mount(f.el,f.services);
    f.timeline.totalProgress(1);
    expect(f.el.style.paddingTop).toBe('10px');expect(f.el.style.paddingBottom).toBe('30px');expect(f.el.style.paddingInlineStart).toBe('40px');expect(f.el.style.paddingInlineEnd).toBe('20px');
    f.config.onRefreshInit();f.timeline.invalidate().totalProgress(1);
    expect(f.el.style.paddingBottom).toBe('30px');cleanup();
  });
  it('uses a growing radial clip with intact styled markup and authored breaks',()=>{
    const f=fixture('glyph-mask-reveal','data-motion-mask="radial" data-motion-to-color="#fcd5d7"');
    const cleanup=createStationaryTextModule('glyph-mask-reveal').mount(f.el,f.services);
    const layers=f.el.querySelectorAll('[data-motion-surface]');expect(layers).toHaveLength(2);
    expect(layers[1].querySelector('em')).not.toBeNull();expect(layers[1].querySelector('br')).not.toBeNull();expect(layers[1].querySelector('#authored')).toBeNull();
    f.timeline.totalProgress(0);expect(layers[1].style.clipPath).toBe('circle(0% at 50% 50%)');
    f.timeline.totalProgress(1);expect(layers[1].style.clipPath).toBe('circle(150% at 50% 50%)');cleanup();
  });
  it('keeps slices fixed, preserves rich type and excludes generated layers from discovery',()=>{
    const f=fixture('slice-fragment-reveal'),cleanup=createStationaryTextModule('slice-fragment-reveal').mount(f.el,f.services);
    const layers=f.el.querySelectorAll('[data-motion-surface]');expect(layers).toHaveLength(6);
    for(const layer of layers){expect(layer.querySelector('em')).not.toBeNull();expect(layer.querySelector('br')).not.toBeNull();expect(layer.hasAttribute('data-motion')).toBe(false);}
    for(const p of [0,0.5,1]){f.timeline.totalProgress(p);for(const layer of layers)expect(layer.style.transform).toBe('none');}
    cleanup();
  });

  it.each(['stroke-fill','glyph-mask-reveal','occlusion-blocks','slice-fragment-reveal','negative-space-cutout','material-shift'])('%s does not double authored root transforms on fixed surfaces',name=>{
    const f=fixture(name);
    f.el.style.transform='translate(-50%, -50%)';
    f.el.style.translate='10% 5%';
    f.el.style.rotate='3deg';
    f.el.style.scale='0.9';
    const child=f.el.querySelector('em');
    child.style.transform='rotate(2deg)';
    const before=f.el.outerHTML;
    const cleanup=createStationaryTextModule(name).mount(f.el,f.services);
    const layers=f.el.querySelectorAll('[data-motion-surface]');
    expect(layers.length).toBeGreaterThan(0);
    for(const progress of [0,0.5,1]){
      f.timeline.totalProgress(progress);
      f.config.onRefreshInit();
      for(const layer of layers){
        expect(layer.style.transform).toBe('none');
        expect(layer.style.translate).toBe('none');
        expect(layer.style.rotate).toBe('none');
        expect(layer.style.scale).toBe('none');
        expect(layer.querySelector('em').style.transform).toBe('rotate(2deg)');
      }
      expect(f.el.style.transform).toBe('translate(-50%, -50%)');
    }
    cleanup();expect(f.el.outerHTML).toBe(before);
  });

  it('reveals plush-bloom from the center with a procedural fiber texture',()=>{
    const f=fixture('material-shift','data-motion-from="fill" data-motion-to="plush-bloom"'),cleanup=createStationaryTextModule('material-shift').mount(f.el,f.services);
    const layers=[...f.el.querySelectorAll('[data-motion-surface]')];
    const plush=layers.find(layer=>layer.style.clipPath);
    expect(plush).toBeTruthy();
    expect(plush.style.clipPath).toContain('circle');
    expect(plush.style.backgroundImage).toContain('data:image/svg+xml');
    expect(plush.style.backgroundClip || plush.style.webkitBackgroundClip).toContain('text');
    cleanup();
  });

  it.each(['furry','rubber','marble','rock','crumpled-paper'])('provides a distinct tactile SVG %s treatment',material=>{
    const f=fixture('material-shift',`data-motion-from="${material}"`),cleanup=createStationaryTextModule('material-shift').mount(f.el,f.services);
    const filter=f.el.querySelector('filter');
    expect(filter).not.toBeNull();
    if(material==='furry'){expect(filter.querySelector('feDisplacementMap')).not.toBeNull();expect(filter.querySelector('feGaussianBlur')).not.toBeNull();}
    if(material==='rubber')expect(filter.querySelector('feSpecularLighting')).not.toBeNull();
    if(material==='marble'){expect(filter.querySelector('feTurbulence')).not.toBeNull();expect(filter.querySelector('feDisplacementMap')).not.toBeNull();}
    if(material==='rock')expect(filter.querySelector('feDiffuseLighting')).not.toBeNull();
    if(material==='furry'||material==='marble'||material==='crumpled-paper')expect(filter.querySelector('feColorMatrix[type="saturate"][values="0"]')).not.toBeNull();
    if(material==='crumpled-paper'){expect(filter.querySelectorAll('feTurbulence').length).toBeGreaterThanOrEqual(2);expect(filter.querySelector('feDiffuseLighting')).not.toBeNull();}
    cleanup();
  });

  it.each(['grain','matte','glass','erosion'])('provides an actual SVG %s treatment',material=>{
    const f=fixture('material-shift',`data-motion-from="${material}"`),cleanup=createStationaryTextModule('material-shift').mount(f.el,f.services);
    expect(f.el.querySelector('feTurbulence')).not.toBeNull();
    if(material==='glass')expect(f.el.querySelector('feDisplacementMap')).not.toBeNull();
    if(material==='erosion'){expect(f.el.querySelector('feComposite')).not.toBeNull();const threshold=f.el.querySelector('feFuncA');f.timeline.totalProgress(0);const start=threshold.getAttribute('intercept');f.timeline.totalProgress(1);expect(threshold.getAttribute('intercept')).not.toBe(start);}
    cleanup();
  });
  it('retains explicit auto scrub, honors aligned mode and supports triggered reversal',()=>{
    for (const attr of ['data-motion-scrub="0.9"','data-motion-align="aligned" data-motion-alignment-span="40vh"','data-motion-scrub="false"']) {
      const f=fixture('stroke-fill',attr), cleanup=createStationaryTextModule('stroke-fill').mount(f.el,f.services);
      if(attr.includes('0.9'))expect(f.config.scrub).toBe(0.9);
      if(attr.includes('aligned'))expect(f.build.mock.calls[0][1].mode).toBe('aligned');
      if(attr.includes('false')){expect(f.config.scrub).toBe(false);expect(f.config.toggleActions).toBe('play none none reverse');}
      cleanup();
    }
  });
  it('attaches and removes a real ScrollTrigger through the shared planner',()=>{
    vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const f=fixture('glyph-mask-reveal','data-motion-mask="radial"');
    const ScrollTrigger=plugins.ScrollTrigger;
    const before=ScrollTrigger.getAll().length;
    const services={gsap,ScrollTrigger,reducedMotion:()=>false,scrollAlignment:createScrollAlignment({gsap,ScrollTrigger})};
    const cleanup=createStationaryTextModule('glyph-mask-reveal').mount(f.el,services);
    const trigger=ScrollTrigger.getAll().find(t=>t.trigger===f.el);
    expect(trigger).toBeDefined();trigger.refresh();expect(trigger.end).toBeGreaterThan(trigger.start);
    trigger.animation.totalProgress(0.5);cleanup();expect(ScrollTrigger.getAll()).toHaveLength(before);
  });
  it('rolls back DOM and styles if a bad trigger selector aborts mounting',()=>{
    const f=fixture('glyph-mask-reveal','data-motion-trigger="["'), before=f.el.outerHTML, child=f.el.querySelector('em');
    expect(()=>createStationaryTextModule('glyph-mask-reveal').mount(f.el,f.services)).toThrow();
    expect(f.el.outerHTML).toBe(before);expect(f.el.querySelector('em')).toBe(child);
  });
  it('classifies all new modules, recognizes shorthand and includes a root element',()=>{
    document.body.innerHTML=names.map(name=>`<div data-motion="${name}"></div>`).join('');
    const report=auditScrollAlignment(document);expect(report.unclassified).toEqual([]);expect(report.entries.every(entry=>entry.alignment==='auto')).toBe(true);expect(report.safeToEnable).toEqual([]);
    const root=document.body.firstChild;root.dataset.motionAlign='legacy';expect(auditScrollAlignment(root).entries[0].alignment).toBe('legacy');
  });
  it('retains an explicitly authored counter target without transforming outer letters',()=>{
    const f=fixture('counter-expansion');const target=document.createElement('span');target.dataset.motionCounter='';target.textContent='inner';f.el.querySelector('em').append(target);
    const cleanup=createStationaryTextModule('counter-expansion').mount(f.el,f.services);
    f.timeline.totalProgress(0);expect(target.style.transform).not.toBe('');expect(f.el.style.transform).toBe('');cleanup();expect(target.style.transform).toBe('');
  });
});

describe('actual counter geometry',()=>{
  it('finds only enclosed holes and changes their interior without changing outer pixels',()=>{
    const w=9,h=9,source=new Uint8ClampedArray(w*h*4);
    for(let y=1;y<8;y++)for(let x=1;x<8;x++)if(x<3||x>5||y<3||y>5){const i=(y*w+x)*4;source[i]=35;source[i+1]=35;source[i+2]=35;source[i+3]=255;}
    const counters=findCounters(source,w,h);expect(counters).toHaveLength(1);expect(counters[0].pixels).toHaveLength(9);
    const start=counterFrame(source,w,counters,0,0.3,0,[35,35,35]),finish=counterFrame(source,w,counters,1,0.3);
    expect(start).not.toEqual(source);expect(finish).toEqual(source);
    const hole=new Set(counters[0].pixels);for(let i=0;i<w*h;i++)if(!hole.has(i))expect([...start.slice(i*4,i*4+4)]).toEqual([...source.slice(i*4,i*4+4)]);
  });
  it('antialiases deformed counter boundaries and changes smoothly between nearby frames',()=>{
    const w=21,h=21,source=new Uint8ClampedArray(w*h*4);
    for(let y=2;y<19;y++)for(let x=2;x<19;x++)if(x<6||x>14||y<6||y>14){
      const i=(y*w+x)*4;source[i]=35;source[i+1]=35;source[i+2]=35;source[i+3]=255;
    }
    const counters=findCounters(source,w,h);
    const a=counterFrame(source,w,counters,0.4,0.55,0.35,[35,35,35]);
    const b=counterFrame(source,w,counters,0.401,0.55,0.35,[35,35,35]);
    expect([...a].some((value,i)=>i%4===3&&value>0&&value<255)).toBe(true);
    const maxDelta=a.reduce((max,value,i)=>Math.max(max,Math.abs(value-b[i])),0);
    expect(maxDelta).toBeLessThan(5);
    const holes=new Set(counters.flatMap(counter=>counter.pixels));
    for(const p of [0,0.25,0.5,0.75,0.99]){
      const frame=counterFrame(source,w,counters,p,0.4,0.35,[35,35,35]);
      for(let i=0;i<w*h;i++)if(!holes.has(i))
        expect([...frame.slice(i*4,i*4+4)]).toEqual([...source.slice(i*4,i*4+4)]);
    }
    expect(counterFrame(source,w,counters,1,0.4,0.35)).toEqual(source);
    expect(counterFrame(source,w,counters,2,0.4,0.35)).toEqual(source);
  });
  it('leaves glyphs without enclosed counters untouched',()=>{
    const source=new Uint8ClampedArray(5*5*4);
    for(let x=0;x<5;x++)source[(2*5+x)*4+3]=255;
    const before=new Uint8ClampedArray(source),counters=findCounters(source,5,5);
    expect(counters).toHaveLength(0);
    expect(counterFrame(source,5,counters,0,0.4,0.35)).toEqual(before);
    expect(source).toEqual(before);
  });

});
