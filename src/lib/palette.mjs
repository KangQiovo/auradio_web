const bound = (x, a, b) => Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));
const hex = rgb => '#' + rgb.map(v => Math.round(bound(v,0,255)).toString(16).padStart(2,'0')).join('');
const mix = (a,b,t) => a.map((v,i)=>v*(1-t)+b[i]*t);
/** @param {string} color */
export function relativeLuminance(color) {
  const v = [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);
  return v[0]*0.2126 + v[1]*0.7152 + v[2]*0.0722;
}
/** Generate a dark, legible surface and pastel accents from an actual cover color. */
export function paletteFromRgb(rgb) {
  const safe=rgb.map(n=>bound(n,0,255));
  let accent=hex(mix(safe,[249,248,246],0.61));
  if(relativeLuminance(accent)<0.45) accent=hex(mix(safe,[255,255,255],0.75));
  return {dark:hex(mix(safe,[9,16,21],0.88)), glow:hex(mix(safe,[15,23,28],0.54)), accent,
    paper:hex(mix(safe,[241,241,232],0.93)), soft:hex(mix(safe,[19,29,32],0.82))};
}
/** Small quantized histogram: no per-frame canvas reads, no dependency or worker startup. */
export function paletteFromPixels(pixels) {
  const buckets=new Map();
  for(let i=0;i+3<pixels.length;i+=4){
    const [r,g,b,a]=pixels.slice(i,i+4);
    const max=Math.max(r,g,b),min=Math.min(r,g,b), saturation=max-min;
    if(a<180 || max<25 || min>235) continue;
    const key=(r>>4)*256+(g>>4)*16+(b>>4);
    const weight=1+Math.min(saturation/32,5);
    const item=buckets.get(key)||{count:0,r:0,g:0,b:0,score:0};
    item.count++;item.r+=r;item.g+=g;item.b+=b;item.score+=weight;
    buckets.set(key,item);
  }
  const candidates=[...buckets.values()];
  // Cream paper borders form a single large bucket; painted areas span many shades.
  // Prefer a meaningful chromatic region, but retain neutrals for monochrome covers.
  const chromatic=candidates.filter(item=>{
    const channels=[item.r,item.g,item.b].map(value=>value/item.count);
    const high=Math.max(...channels),low=Math.min(...channels);
    return high>55 && high-low>36 && (high-low)/high>0.18;
  });
  const coloredCount=chromatic.reduce((sum,item)=>sum+item.count,0);
  const totalCount=candidates.reduce((sum,item)=>sum+item.count,0);
  const pool=coloredCount>=Math.max(3,totalCount*0.03)?chromatic:candidates;
  const best=pool.sort((a,b)=>b.score-a.score)[0];
  return paletteFromRgb(best?[best.r/best.count,best.g/best.count,best.b/best.count]:[116,143,151]);
}
// Limit work to one 40×40 sample per artwork, including across multiple React islands.
const cache=new Map();
export function extractCoverPalette(url, fallback) {
  if(cache.has(url)) return cache.get(url);
  const work=new Promise(resolve=>{
    const image=new Image();image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';
    let settled=false;
    const done=result=>{if(!settled){settled=true;clearTimeout(timer);image.onload=image.onerror=null;resolve(result);}};
    const timer=setTimeout(()=>done({palette:paletteFromRgb(fallback),extracted:false}),7000);
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=40;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        if(!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(image,0,0,40,40);
        done({palette:paletteFromPixels(ctx.getImageData(0,0,40,40).data),extracted:true});
      }catch{done({palette:paletteFromRgb(fallback),extracted:false});}
    };
    image.onerror=()=>done({palette:paletteFromRgb(fallback),extracted:false});
    image.src=url;
  });
  cache.set(url,work);
  return work;
}
