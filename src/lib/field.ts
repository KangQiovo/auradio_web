import * as THREE from 'three';
export type FieldMode = 'ribbon' | 'orbit' | 'wave';
export interface FieldSettings { mode: FieldMode; intensity: number; animated: boolean; reduced: boolean; level: () => number }
/** A single draw-call line sculpture. No particles, image textures or third-party requests. */
export function createField(host: HTMLElement, read: () => FieldSettings) {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x101d24,0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,0.1,40);
  camera.position.set(0,0,8);
  const geometry = new THREE.BufferGeometry();
  const bands = window.innerWidth < 600 ? 48 : 72;
  const segments = 180;
  const positions = new Float32Array(bands * segments * 6);
  let cursor = 0;
  for (let line = 0; line < bands; line++) {
    for (let step = 0; step < segments; step++) {
      for (let end = 0; end < 2; end++) {
        positions[cursor++] = (step + end) / segments * Math.PI * 2;
        positions[cursor++] = line / (bands - 1);
        positions[cursor++] = 0;
      }
    }
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const uniforms = {uTime:{value:0},uMode:{value:0},uLevel:{value:0},uIntensity:{value:0.55}};
  const material = new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,
    vertexShader: `
      uniform float uTime; uniform float uMode; uniform float uLevel; uniform float uIntensity;
      varying float vBand; varying float vLight;
      void main(){
        float a=position.x; float b=position.y; float v=b*2.0-1.0;
        float t=uTime; float pulse=uLevel*uIntensity;
        vec3 p;
        if(uMode<0.5){
          p=vec3(2.28*sin(a),v*0.72+0.64*sin(2.0*a+v*1.35+t*0.2),0.75*cos(a)+v*0.32);
          p.y+=pulse*0.33*sin(a*5.0+t);
        }else if(uMode<1.5){
          float r=1.12+b*0.72+0.15*pulse*sin(a*7.0+t);
          p=vec3(r*cos(a),r*sin(a),0.4*sin(a*3.0+v*2.0+t*0.25));
        }else{
          float x=(a/3.14159265-1.0)*2.36;
          p=vec3(x,v*1.0+(0.3+pulse*0.5)*sin(a*2.0+v*2.0+t*0.4)*exp(-x*x*0.15),0.22*cos(a+v));
        }
        vBand=b; vLight=0.65+0.35*cos(a-0.8);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `
      varying float vBand; varying float vLight;
      void main(){
        vec3 green=vec3(0.26,0.776,0.635); vec3 paper=vec3(0.86,0.91,0.84);
        vec3 col=mix(green,paper,smoothstep(0.05,0.95,vBand));
        gl_FragColor=vec4(col*vLight,0.44+0.2*sin(vBand*3.14159));
      }`,
  });
  const sculpture = new THREE.LineSegments(geometry,material);
  sculpture.rotation.set(-0.26,-0.08,-0.13);
  scene.add(sculpture);
  let active = true, visible = !document.hidden, disposed = false, raf = 0;
  let time = 0, last = 0, pointerX = 0, pointerY = 0, level = 0;
  const modes = {ribbon:0,orbit:1,wave:2};
  function render(now = performance.now()) {
    const settings = read();
    const moving = active && visible && settings.animated && !settings.reduced;
    if (moving) time += Math.min((now - (last || now))/1000,0.05);
    last = now;
    level += ((settings.reduced ? 0 : settings.level()) - level) * 0.15;
    uniforms.uTime.value = time;
    uniforms.uMode.value = modes[settings.mode];
    uniforms.uLevel.value = level;
    uniforms.uIntensity.value = settings.intensity;
    const px = settings.reduced ? 0 : pointerX;
    const py = settings.reduced ? 0 : pointerY;
    sculpture.rotation.y += (px*0.17-0.08-sculpture.rotation.y)*0.045;
    sculpture.rotation.x += (-py*0.09-0.26-sculpture.rotation.x)*0.045;
    renderer.render(scene,camera);
    if (moving && !disposed) raf = requestAnimationFrame(render);
    else raf = 0;
  }
  function sync() {
    if(disposed) return;
    cancelAnimationFrame(raf); raf=0; last=0;
    render();
  }
  const observer = new IntersectionObserver(([entry]) => { active=entry.isIntersecting; sync(); },{rootMargin:'40px'});
  observer.observe(host);
  const resize = new ResizeObserver(() => {
    if(disposed) return;
    const {width,height} = host.getBoundingClientRect();
    if(!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect=width/height;
    camera.position.z=camera.aspect<0.95 ? 9.2 : 7.3;
    camera.updateProjectionMatrix(); sync();
  });
  resize.observe(host);
  const pointer = (event: PointerEvent) => {
    if(event.pointerType==='touch') return;
    const r=host.getBoundingClientRect();
    pointerX=(event.clientX-r.left)/r.width*2-1;
    pointerY=(event.clientY-r.top)/r.height*2-1;
  };
  const leave = () => {pointerX=0;pointerY=0;};
  const visibility = () => {visible=!document.hidden;sync();};
  const contextLost = (e: Event) => {e.preventDefault();disposed=true;cancelAnimationFrame(raf);host.dispatchEvent(new Event('field-unavailable'));};
  host.addEventListener('pointermove',pointer,{passive:true});
  host.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',visibility);
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  sync();
  return { sync, destroy(){
    disposed=true;cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();
    host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave);
    document.removeEventListener('visibilitychange',visibility);
    renderer.domElement.removeEventListener('webglcontextlost',contextLost);
    geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }};
}
