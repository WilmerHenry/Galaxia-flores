import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';

const $ = selector => document.querySelector(selector);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x020008);
$('#scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 1, 6500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .045;
controls.minDistance = 350;
controls.maxDistance = 2400;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * .86;
function reset() { camera.position.set(0, 690, 1280); controls.target.set(0, 0, 0); controls.update(); }
reset();

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.12, '#eee0ff');
  gradient.addColorStop(.32, '#a868eaaa'); gradient.addColorStop(1, '#6a25bc00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
const glow = glowTexture();
const galaxy = new THREE.Group(); scene.add(galaxy);
function particles(count, kind) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, y, z;
    if (kind === 'stars') {
      const radius = 1800 + Math.random() * 2300;
      const angle = Math.random() * Math.PI * 2, height = Math.random() * 2 - 1;
      x = Math.cos(angle) * Math.sqrt(1 - height * height) * radius;
      z = Math.sin(angle) * Math.sqrt(1 - height * height) * radius;
      y = height * radius;
    } else {
      const radius = 160 + Math.pow(Math.random(), .85) * 1250;
      const scatter = (Math.random() + Math.random() + Math.random() - 1.5);
      const angle = i % 4 * Math.PI / 2 + Math.log(radius / 160) * 2.7 + scatter * (kind === 'dust' ? .85 : .32);
      x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
      y = (Math.random() + Math.random() - 1) * (22 + radius * .045);
    }
    positions.set([x, y, z], i * 3);
    const warm = Math.random() > .86;
    color.setHSL(warm ? .09 : .65 + Math.random() * .17, warm ? .5 : .45 + Math.random() * .35, .5 + Math.random() * .4);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ map: glow, size: kind === 'dust' ? 22 : kind === 'stars' ? 4.5 : 5,
    vertexColors: true, transparent: true, opacity: kind === 'dust' ? .075 : .9,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  (kind === 'stars' ? scene : galaxy).add(points);
}
particles(42000, 'arms'); particles(10000, 'dust'); particles(6500, 'stars');

// A camera-facing accretion effect: dark event horizon, photon ring,
// flowing disk filaments and the lensed arc above and below the core.
const holeMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { time: { value: 0 } },
  vertexShader: `varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    varying vec2 vUv; uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){
      vec2 p=(vUv-.5)*2.; p=mat2(.985,-.174,.174,.985)*p;
      float r=length(p), a=atan(p.y,p.x);
      float core=1.-smoothstep(.245,.255,r);
      float photon=exp(-abs(r-.263)*220.);
      float aura=exp(-abs(r-.28)*14.)*.52;
      float ellipse=length(vec2(p.x,p.y*4.5));
      float angle=atan(p.y*4.5,p.x);
      float diskMask=smoothstep(.28,.34,ellipse)*(1.-smoothstep(.7,.97,ellipse));
      float flow=noise(vec2(ellipse*34.,angle*6.-time*.24));
      float threads=pow(.5+.5*sin(ellipse*180.+flow*5.-time*.7),2.);
      float disk=diskMask*(.55+threads*.65)*(.7+.3*noise(p*35.+time*.04));
      disk*=p.y<0.?1.:1.-core;
      float lensR=length(vec2(p.x,p.y*1.18));
      float lens=exp(-abs(lensR-.30)*65.)*(.35+.65*abs(sin(a)));
      float energy=photon*1.7+aura+lens*.7;
      vec3 violet=vec3(.57,.18,1.);
      vec3 col=violet*energy+mix(violet,vec3(1.,.75,.94),threads)*disk*1.5;
      col+=vec3(1.,.88,1.)*photon;
      col*=1.-core;
      float alpha=max(core,clamp(energy+disk,0.,1.));
      gl_FragColor=vec4(col,alpha*(1.-smoothstep(.94,1.,r)));
    }`
});
const blackHole = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), holeMaterial);
blackHole.renderOrder = 1; scene.add(blackHole);

const phrases = ['Eres mi flor favorita','Gracias por tanto cariño','Contigo todo florece','Me haces sonreír sin darte cuenta','Te amo mucho, princesa','Un universo para ti','Me gusta verte sonreír','Gracias por estar en mi vida','Cada flor es un pensamiento bonito','Mi lugar favorito es contigo','Eres mi casualidad favorita','Me encanta tu forma de ser','Qué bonito coincidir contigo','Hoy el morado te sonríe','Eres mi persona especial','Contigo los días son más bonitos','Tu sonrisa ilumina mis días','Mi amor por ti sigue creciendo','Eres un pedacito de mi felicidad','Me gusta todo de ti','Te escogería una y mil veces','Mi corazón sonríe contigo','Tú haces especial lo sencillo','Gracias por los momentos bonitos','Eres una razón para sonreír','Un abrazo para mi princesa','Me encantas más de lo que imaginas','Cada estrella guarda un te quiero','Para ti, mi amor','Que nunca te falten flores'];
function textTexture(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '42px Georgia';
  canvas.width = Math.ceil(ctx.measureText(text).width) + 64; canvas.height = 96;
  ctx.font = '42px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#b862ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#f8eaff';
  ctx.fillText(text, canvas.width / 2, 48);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const items = [];
function addItem(texture, index, flower) {
  const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: flower ? .65 : 1, depthWrite: false }));
  mesh.renderOrder = 2; scene.add(mesh);
  items.push({ mesh, flower, angle: index * 2.399963, radius: 480 + (index % 7) * 145,
    y: flower ? Math.sin(index * 4.17) * 220 : (index % 10 - 4.5) * 95, phase: index * 1.7,
    size: flower ? 38 + (index % 4) * 7 : 32 });
}
phrases.forEach((phrase, i) => addItem(textTexture(phrase), i, false));
const loader = new THREE.TextureLoader();
const flowers = ['flor-1.png', 'flor-2.png', 'flor-3.png', 'flor-4.png', 'flor-5.png'].map(name => {
  const texture = loader.load('flores/' + name); texture.colorSpace = THREE.SRGBColorSpace; return texture;
});
for (let i = 0; i < 50; i++) addItem(flowers[i % flowers.length], i + 30, true);

const projected = new THREE.Vector3();
let running = false, previousTime = 0;
function animate(time) {
  if (!running) return;
  requestAnimationFrame(animate);
  const delta = Math.min((time - previousTime) / 1000 || .016, .05); previousTime = time;
  controls.update(); camera.updateMatrixWorld();
  galaxy.rotation.y += delta * .009;
  blackHole.quaternion.copy(camera.quaternion); holeMaterial.uniforms.time.value = time / 1000;
  const mobile = innerWidth < 600;
  for (const item of items) {
    item.angle += delta * .012;
    item.mesh.position.set(Math.cos(item.angle) * item.radius, item.y + Math.sin(time * .0003 + item.phase) * 14, Math.sin(item.angle) * item.radius);
    // Match screen size using camera-space depth, preserving each image's proportions.
    projected.copy(item.mesh.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = -projected.z;
    const pixelHeight = item.size * (mobile ? .78 : 1) * THREE.MathUtils.clamp(1100 / Math.max(depth, 1), .65, 1.15);
    const ratio = (item.mesh.material.map.image?.width || 1) / (item.mesh.material.map.image?.height || 1);
    const scale = 2 * Math.max(depth, 1) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / innerHeight * pixelHeight;
    item.mesh.scale.set(scale * ratio, scale, 1);
    // Keep every flower and phrase in the scene with constant opacity.
    // Camera framing alone determines which objects are on screen.
  }
  renderer.render(scene, camera);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const song = $('#song');
function updateMusicButton() {
  const playing = !song.paused; $('#music').textContent = playing ? '❚❚' : '♫';
  $('#music').setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  $('#music').setAttribute('aria-pressed', String(playing));
}
async function playMusic() {
  try { await song.play(); $('#notice').textContent = ''; }
  catch { $('#notice').textContent = 'Toca ♫ para reproducir la música.'; }
}
$('#intro').onclick = () => {
  if (running) return;
  document.body.classList.add('started'); $('#universe').inert = false;
  $('#intro').classList.add('hidden'); running = true; requestAnimationFrame(animate); playMusic(); $('#letterBtn').focus();
};
$('#letterBtn').onclick = () => $('#letter').classList.remove('hidden');
$('#close').onclick = () => $('#letter').classList.add('hidden');
$('#letter').onclick = event => { if (event.target.id === 'letter') $('#letter').classList.add('hidden'); };
$('#in').onclick = () => { camera.position.multiplyScalar(.78); controls.update(); };
$('#out').onclick = () => { camera.position.multiplyScalar(1.28); controls.update(); };
$('#reset').onclick = reset; renderer.domElement.addEventListener('dblclick', reset);
song.addEventListener('play', updateMusicButton); song.addEventListener('pause', updateMusicButton); updateMusicButton();
$('#music').onclick = () => song.paused ? playMusic() : song.pause();
