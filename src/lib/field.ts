import * as THREE from 'three';
import {readAudioFrame, subscribeSignal} from './audio-signal';
import {relax, shouldAnimateField} from './spectrum.mjs';
export type FieldMode = 'ribbon' | 'orbit' | 'wave';
export interface FieldSettings {mode: FieldMode; intensity: number; animated: boolean; reduced: boolean}
/** One draw call. Frequency bands shape the geometry; short pointer impulses scatter and settle it. */
export function createField(host: HTMLElement, read: () => FieldSettings) {
  const mobile = window.matchMedia('(pointer: coarse)').matches || host.clientWidth < 500;
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: !mobile, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.6));
  renderer.setClearColor(0x101d24, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.z = 8;
  const bands = mobile ? 40 : 60, segments = mobile ? 112 : 160;
  const positions = new Float32Array(bands * segments * 6);
  const seeds = new Float32Array(bands * segments * 2);
  let cursor = 0, seedCursor = 0;
  for (let b = 0; b < bands; b++) for (let s = 0; s < segments; s++) {
    // A stable seed shared by both endpoints preserves each short line segment when scattered.
    const seed = ((b * 271 + s * 67) % 997) / 997;
    for (let end = 0; end < 2; end++) {
      positions[cursor++] = (s + end) / segments * Math.PI * 2;
      positions[cursor++] = b / (bands - 1); positions[cursor++] = 0;
      seeds[seedCursor++] = seed;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  // Vertex positions are generated in the shader; the input parameter bounding box is not geometry.
  const touches = Array.from({length: 5}, () => new THREE.Vector4(0, 0, 0, 0));
  const levels = new Float32Array(64);
  const uniforms = {
    uTime: {value: 0}, uMode: {value: 0}, uRms: {value: 0}, uIntensity: {value: 0.55},
    uSpectrum: {value: levels}, uTouches: {value: touches},
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uMode, uRms, uIntensity;
      uniform float uSpectrum[64]; uniform vec4 uTouches[5];
      varying float vBand, vLight, vScatter;
      void main(){
        float a=position.x, b=position.y, v=b*2.0-1.0;
        float t=uTime;
        // Neighbor interpolation avoids abrupt steps but keeps each frequency region independent.
        float f=clamp(a/6.2831853*63.0,0.0,63.0);
        int lo=int(floor(f)); int hi=min(lo+1,63);
        float band=mix(uSpectrum[lo],uSpectrum[hi],fract(f));
        float energy=band*uIntensity;
        vec3 p;
        if(uMode<0.5){
          p=vec3(2.28*sin(a),v*0.72+0.64*sin(2.0*a+v*1.35+t*0.2),0.75*cos(a)+v*0.32);
          p.y+=(0.25+abs(v)*0.5)*energy*sin(a*5.0+v*2.4);
          p.z+=energy*0.5; p.xy*=1.0+uRms*uIntensity*0.10;
        }else if(uMode<1.5){
          float r=1.05+b*0.67+energy*(0.45+b*0.35);
          p=vec3(r*cos(a),r*sin(a),0.35*sin(a*3.0+v*2.0+t*0.25));
        }else{
          float x=(a/3.14159265-1.0)*2.36;
          p=vec3(x,v*0.55+0.16*sin(a*2.0+v+t*0.4)+(0.25+b*0.9)*energy,0.22*cos(a+v));
        }
        vec3 offset=vec3(0.0); float scatter=0.0;
        for(int i=0;i<5;i++){
          vec2 d=p.xy-uTouches[i].xy;
          float influence=exp(-dot(d,d)/0.52)*uTouches[i].z;
          float angle=aSeed*31.4159;
          vec2 direction=normalize(d+vec2(cos(angle),sin(angle))*0.08);
          offset.xy+=influence*(direction*(0.27+aSeed*0.47)+vec2(-d.y,d.x)*0.35*uTouches[i].w);
          offset.z+=influence*sin(angle)*0.42;
          scatter+=influence;
        }
        p+=offset/max(1.0,scatter*0.65);
        vScatter=min(scatter,1.0);vBand=b;vLight=0.65+0.35*cos(a-0.8)+energy*0.2;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `
      varying float vBand,vLight,vScatter;
      void main(){
        vec3 col=mix(vec3(0.26,0.776,0.635),vec3(0.86,0.91,0.84),smoothstep(0.05,0.95,vBand));
        gl_FragColor=vec4(col*vLight,(0.44+0.2*sin(vBand*3.14159))*(1.0-vScatter*0.17));
      }`,
  });
  const sculpture = new THREE.LineSegments(geometry, material);
  sculpture.frustumCulled = false;
  sculpture.rotation.set(-0.26, -0.08, -0.13); scene.add(sculpture);
  let active = false, visible = !document.hidden, disposed = false, contextBroken = false, raf = 0;
  let time = 0, last = 0, pointerSlot = 0, lastImpulse = 0, rms = 0;
  const modes = {ribbon: 0, orbit: 1, wave: 2};
  const ndc = new THREE.Vector2(), point = new THREE.Vector3();
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  function state(value: string) {if (host.dataset.fieldState !== value) host.dataset.fieldState = value;}
  function render(now: number) {
    raf = 0;
    if (disposed || contextBroken) return;
    const settings = read();
    if (!active || !visible) {last = 0; state('sleeping'); return;}
    const dt = Math.min((now - (last || now - 16)) / 1000, 0.05); last = now;
    const signal = readAudioFrame(now);
    let settling = false, interaction = 0;
    for (let i = 0; i < 64; i++) {
      const target = settings.reduced ? 0 : signal.bands[i];
      levels[i] = relax(levels[i], target, dt, target > levels[i] ? 0.025 : 0.14);
      if (!signal.active && levels[i] < 0.001) levels[i] = 0;
      settling ||= levels[i] > 0.001;
    }
    rms = relax(rms, settings.reduced ? 0 : signal.rms, dt, 0.07);
    if (rms < 0.001) rms = 0;
    for (const touch of touches) {
      touch.z = settings.reduced ? 0 : relax(touch.z, 0, dt, 0.36);
      if (touch.z < 0.001) touch.z = 0;
      interaction += touch.z;
    }
    // Autonomous movement belongs only to explicitly animated art. Silent audio supplies no fake beat.
    if (!settings.reduced && settings.animated && !signal.active) time += dt;
    uniforms.uTime.value = time; uniforms.uMode.value = modes[settings.mode];
    uniforms.uRms.value = rms; uniforms.uIntensity.value = settings.intensity;
    renderer.render(scene, camera);
    const moving = shouldAnimateField({visible: active && visible, reduced: settings.reduced,
      playing: signal.active, idleMotion: settings.animated, interaction, settling: settling || rms > 0});
    state(settings.reduced ? 'reduced' : moving ? 'active' : 'rest');
    if (moving) raf = requestAnimationFrame(render);
  }
  function wake() {
    if (!disposed && !contextBroken && !raf && active && visible) raf = requestAnimationFrame(render);
  }
  function sync() {last = 0; wake();}
  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (!active) {cancelAnimationFrame(raf); raf = 0; last = 0; state('sleeping');}
    else sync();
  }, {rootMargin: '0px'});
  observer.observe(host);
  const resize = new ResizeObserver(() => {
    if (disposed || contextBroken) return;
    const {width, height} = host.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.position.z = camera.aspect < 0.95 ? 9.2 : 7.3;
    camera.updateProjectionMatrix(); sync();
  }); resize.observe(host);
  function impulse(x: number, y: number, strength: number, spin: number) {
    if (read().reduced || !active || !visible) return;
    ndc.set(x, y); sculpture.updateMatrixWorld(); camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, point)) return;
    sculpture.worldToLocal(point);
    touches[pointerSlot].set(point.x, point.y, strength, spin);
    pointerSlot = (pointerSlot + 1) % touches.length;
    wake(); // Not conditional on media play state.
  }
  function pointer(event: PointerEvent) {
    if (event.type === 'pointermove' && performance.now() - lastImpulse < 20) return;
    lastImpulse = performance.now();
    const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    impulse((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2,
      event.type === 'pointerdown' ? 1.25 : event.pointerType === 'touch' ? 0.85 : 0.65,
      event.movementX < 0 ? -1 : 1);
  }
  const leave = () => wake(); // Existing impulses decay instead of snapping home.
  function keyboard(event: KeyboardEvent) {
    if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    impulse(event.key === 'ArrowLeft' ? -0.25 : event.key === 'ArrowRight' ? 0.25 : 0,
      event.key === 'ArrowUp' ? 0.25 : event.key === 'ArrowDown' ? -0.25 : 0, 1.25, 1);
  }
  const visibility = () => {
    visible = !document.hidden;
    if (!visible) {cancelAnimationFrame(raf); raf = 0; last = 0; touches.forEach(t => {t.z = 0;}); state('sleeping');}
    else sync();
  };
  const contextLost = (e: Event) => {e.preventDefault(); contextBroken = true; cancelAnimationFrame(raf); raf = 0; host.dispatchEvent(new Event('field-unavailable'));};
  host.addEventListener('pointermove', pointer, {passive: true});
  host.addEventListener('pointerdown', pointer, {passive: true});
  host.addEventListener('pointerleave', leave); host.addEventListener('pointerup', leave); host.addEventListener('pointercancel', leave);
  host.addEventListener('keydown', keyboard); document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const unsubscribe = subscribeSignal(sync);
  return {sync, destroy() {
    disposed = true; cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect(); unsubscribe();
    host.removeEventListener('pointermove', pointer); host.removeEventListener('pointerdown', pointer);
    host.removeEventListener('pointerleave', leave); host.removeEventListener('pointerup', leave); host.removeEventListener('pointercancel', leave);
    host.removeEventListener('keydown', keyboard); document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }};
}
