import * as THREE from "three";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { SETTINGS, PHRASES } from "./config.js";
import { createBlackHole } from "./black-hole.js";
import { createIntroParticles } from "./intro.js";

// 1. Bienvenida y configuración de la escena.
createIntroParticles(SETTINGS.introParticles);

const $ = (selector) => document.querySelector(selector);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x020008);
$("#scene").appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  1,
  6500,
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.minDistance = 350;
controls.maxDistance = 2400;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.86;
function reset() {
  camera.position.set(0, 690, 1280);
  controls.target.set(0, 0, 0);
  controls.update();
}
reset();

// 2. Textura de luz y brazos de partículas.
function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.12, "#eee0ff");
  gradient.addColorStop(0.32, "#a868eaaa");
  gradient.addColorStop(1, "#6a25bc00");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
const glow = glowTexture();
const galaxy = new THREE.Group();
scene.add(galaxy);
function particles(count, kind) {
  const positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, y, z;
    if (kind === "stars") {
      const radius = 1800 + Math.random() * 2300;
      const angle = Math.random() * Math.PI * 2,
        height = Math.random() * 2 - 1;
      x = Math.cos(angle) * Math.sqrt(1 - height * height) * radius;
      z = Math.sin(angle) * Math.sqrt(1 - height * height) * radius;
      y = height * radius;
    } else {
      const radius = 160 + Math.pow(Math.random(), 0.85) * 1250;
      const scatter = Math.random() + Math.random() + Math.random() - 1.5;
      const angle =
        ((i % 4) * Math.PI) / 2 +
        Math.log(radius / 160) * 2.7 +
        scatter * (kind === "dust" ? 0.85 : 0.32);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      y = (Math.random() + Math.random() - 1) * (22 + radius * 0.045);
    }
    positions.set([x, y, z], i * 3);
    const warm = Math.random() > 0.86;
    color.setHSL(
      warm ? 0.09 : 0.65 + Math.random() * 0.17,
      warm ? 0.5 : 0.45 + Math.random() * 0.35,
      0.5 + Math.random() * 0.4,
    );
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    map: glow,
    size: kind === "dust" ? 22 : kind === "stars" ? 4.5 : 5,
    vertexColors: true,
    transparent: true,
    opacity: kind === "dust" ? 0.075 : 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  (kind === "stars" ? scene : galaxy).add(points);
}
particles(SETTINGS.particles.arms, "arms");
particles(SETTINGS.particles.dust, "dust");
particles(SETTINGS.particles.stars, "stars");

// Agujero negro: el efecto está separado en black-hole.js.
const blackHole = createBlackHole();
const holeMaterial = blackHole.material;
scene.add(blackHole);

function textTexture(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = SETTINGS.phraseFont;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 96;
  canvas.height = 128;
  ctx.font = SETTINGS.phraseFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#b862ff";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#f8eaff";
  ctx.fillText(text, canvas.width / 2, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const items = [];
function addItem(texture, index, flower) {
  const mesh = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: flower ? SETTINGS.flowerOpacity : 1,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = 2;
  scene.add(mesh);
  items.push({
    mesh,
    flower,
    angle: index * 2.399963,
    radius: 480 + (index % 7) * 145,
    y: flower ? Math.sin(index * 4.17) * 220 : ((index % 14) - 6.5) * 90,
    phase: index * 1.7,
    size: flower ? 38 + (index % 4) * 7 : SETTINGS.phraseSize,
  });
}
// 3. Esperar la fuente local antes de dibujar las frases en las texturas.
await document.fonts.load(SETTINGS.phraseFont);
const phraseTextures = PHRASES.map(textTexture);
for (let i = 0; i < SETTINGS.phraseCount; i++) {
  addItem(phraseTextures[i % phraseTextures.length], i, false);
}
const loader = new THREE.TextureLoader();
const flowers = SETTINGS.flowerImages.map((name) => {
  const texture = loader.load("flores/" + name);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
});
for (let i = 0; i < SETTINGS.flowerCount; i++)
  addItem(flowers[i % flowers.length], i + SETTINGS.phraseCount, true);

// 4. Movimiento de la galaxia, las flores y las frases.
const projected = new THREE.Vector3();
let running = false,
  previousTime = 0;
function animate(time) {
  if (!running) return;
  requestAnimationFrame(animate);
  const delta = Math.min((time - previousTime) / 1000 || 0.016, 0.05);
  previousTime = time;
  controls.update();
  camera.updateMatrixWorld();
  galaxy.rotation.y += delta * 0.009;
  blackHole.quaternion.copy(camera.quaternion);
  holeMaterial.uniforms.time.value = time / 1000;
  const mobile = innerWidth < 600;
  for (const item of items) {
    item.angle += delta * 0.012;
    item.mesh.position.set(
      Math.cos(item.angle) * item.radius,
      item.y + Math.sin(time * 0.0003 + item.phase) * 14,
      Math.sin(item.angle) * item.radius,
    );
    // Conservar la proporción de las imágenes al acercar o alejar la cámara.
    projected.copy(item.mesh.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = -projected.z;
    const pixelHeight =
      item.size *
      (mobile ? 0.78 : 1) *
      THREE.MathUtils.clamp(1100 / Math.max(depth, 1), 0.65, 1.15);
    const ratio =
      (item.mesh.material.map.image?.width || 1) /
      (item.mesh.material.map.image?.height || 1);
    const scale =
      ((2 *
        Math.max(depth, 1) *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
        innerHeight) *
      pixelHeight;
    item.mesh.scale.set(scale * ratio, scale, 1);
    // Opacidad constante: ningún elemento desaparece por solaparse con otro.
  }
  renderer.render(scene, camera);
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// 5. Entrada, música y carta. El zoom se controla con rueda o pellizco.
const song = $("#song");
async function playMusic() {
  try {
    await song.play();
    $("#notice").textContent = "";
  } catch {
    $("#notice").textContent = "Toca la pantalla para iniciar la música.";
    renderer.domElement.addEventListener("pointerdown", playMusic, {
      once: true,
    });
  }
}
$("#intro").onclick = () => {
  if (running) return;
  document.body.classList.add("started");
  $("#universe").inert = false;
  $("#intro").classList.add("hidden");
  running = true;
  requestAnimationFrame(animate);
  playMusic();
  $("#letterBtn").focus();
};
function closeLetter() {
  $("#letter").close();
}
$("#letterBtn").onclick = () => $("#letter").showModal();
$("#close").onclick = closeLetter;
$("#letter").onclick = (event) => {
  if (event.target.id === "letter") closeLetter();
};
renderer.domElement.addEventListener("dblclick", reset);
