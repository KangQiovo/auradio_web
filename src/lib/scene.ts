import * as THREE from 'three';

export type SculptureState = { mode: number; strength: number; moving: boolean; analyser: AnalyserNode | null };

/** A purpose-built line sculpture. Independent of the Auradio application renderer. */
export function createSculpture(host: HTMLElement, getState: () => SculptureState, onUnavailable: () => void = () => {}) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) throw new Error('WebGL is not available');
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
  camera.position.z = 9.7;
  const geometry = new THREE.BufferGeometry();
  const bands = 96, segments = 180;
  const positions = new Float32Array(bands * segments * 6);
  const uvs = new Float32Array(bands * segments * 4);
  let index = 0;
  for (let band = 0; band < bands; band++) for (let segment = 0; segment < segments; segment++) {
    uvs[index++] = segment / segments * Math.PI * 2;
    uvs[index++] = band / bands * Math.PI * 2;
    uvs[index++] = (segment + 1) / segments * Math.PI * 2;
    uvs[index++] = band / bands * Math.PI * 2;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, uStrength: { value: .5 }, uMode: { value: 0 } },
    vertexShader: `
      uniform float uTime; uniform float uEnergy; uniform float uStrength; uniform float uMode;
      varying float vLight; varying float vBand;
      void main() {
        float t = uv.x, p = uv.y;
        float amplitude = .07 + uEnergy * uStrength * .6;
        float ripple = sin(t * 4. + p * 2. + uTime * .35) * amplitude;
        float radius = 1.95 + (.64 + ripple) * cos(p);
        vec3 pos = vec3(radius * cos(t), radius * sin(t), .8 * sin(p));
        if (uMode > .5 && uMode < 1.5) {
          float twist = t * 1.5 + uTime * .12;
          pos = vec3((1.85 + .72 * cos(p + twist)) * cos(t), (1.85 + .72 * cos(p + twist)) * sin(t), .78 * sin(p + twist));
        }
        if (uMode > 1.5) {
          float r = 1.85 + .44 * sin(t * 5. + uTime * .12) * sin(p);
          pos = vec3(r * cos(t) * sin(p), r * sin(t) * sin(p), r * cos(p));
        }
        pos.z += sin(t * 3. + uTime * .25) * (.10 + uEnergy * uStrength * .15);
        vLight = .30 + .7 * (.5 + .5 * sin(p + .8)) * (.65 + .35 * cos(t - .7));
        vBand = .5 + .5 * sin(t + p * .3);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
      }
    `,
    fragmentShader: `
      varying float vLight; varying float vBand;
      void main() {
        vec3 ink = mix(vec3(.30,.51,.40), vec3(.82,.88,.70), vBand);
        gl_FragColor = vec4(ink * vLight, .67);
      }
    `,
  });
  const shape = new THREE.LineSegments(geometry, material);
  shape.frustumCulled = false;
  shape.rotation.set(.95, -.25, -.55);
  scene.add(shape);
  let frame = 0, visible = true, disposed = false, seconds = 0, previous = 0;
  let pointerX = 0, pointerY = 0;
  const frequency = new Uint8Array(128);
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < .8 ? 11.4 : 9.7;
    camera.updateProjectionMatrix();
  }
  function schedule() { if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden || host.dataset.failed) return;
    if (now - previous < 32) { schedule(); return; }
    const state = getState();
    const dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    if (state.moving) seconds += dt;
    let energy = 0;
    if (state.moving && state.analyser) {
      state.analyser.getByteFrequencyData(frequency);
      energy = frequency.reduce((sum, value) => sum + value, 0) / frequency.length / 255;
    }
    material.uniforms.uTime.value = seconds;
    material.uniforms.uEnergy.value = state.moving ? material.uniforms.uEnergy.value + (energy - material.uniforms.uEnergy.value) * .1 : 0;
    material.uniforms.uStrength.value = state.strength;
    material.uniforms.uMode.value = state.mode;
    shape.rotation.x += ((.95 + (state.moving ? pointerY * .13 : 0)) - shape.rotation.x) * .04;
    shape.rotation.y += ((-.25 + (state.moving ? pointerX * .2 : 0)) - shape.rotation.y) * .04;
    shape.rotation.z = -.55 + (state.moving ? Math.sin(seconds * .08) * .08 : 0);
    if (!state.moving) shape.rotation.set(.95, -.25, -.55);
    renderer.render(scene, camera);
    if (state.moving) schedule();
  }
  function pointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    const box = host.getBoundingClientRect();
    pointerX = (event.clientX - box.left) / box.width - .5;
    pointerY = (event.clientY - box.top) / box.height - .5;
  }
  const observer = new ResizeObserver(() => { resize(); schedule(); });
  observer.observe(host);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: '80px' });
  visibility.observe(host);
  host.addEventListener('pointermove', pointer);
  const mutation = new MutationObserver(schedule);
  const room = host.closest('.listening-room');
  if (room) mutation.observe(room, { attributes: true, attributeFilter: ['data-mode', 'data-strength'] });
  window.addEventListener('auradio:motion', schedule);
  document.addEventListener('visibilitychange', schedule);
  function lose(event: Event) { event.preventDefault(); host.dataset.failed = 'true'; cancelAnimationFrame(frame); frame = 0; onUnavailable(); }
  renderer.domElement.addEventListener('webglcontextlost', lose);
  resize();
  frame = requestAnimationFrame(draw);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect(); visibility.disconnect(); mutation.disconnect();
    window.removeEventListener('auradio:motion', schedule);
    document.removeEventListener('visibilitychange', schedule);
    host.removeEventListener('pointermove', pointer);
    renderer.domElement.removeEventListener('webglcontextlost', lose);
    geometry.dispose(); material.dispose(); renderer.dispose();
    renderer.domElement.remove();
  };
}
