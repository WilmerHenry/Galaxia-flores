import * as THREE from "three";

// EDITA AQUÍ: tamaño, inclinación y polvo luminoso del agujero negro.
const APPEARANCE = {
  size: 1100,
  particles: 5600,
  tilt: 0.17,
  diskThickness: 0.29,
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Capas de gas, filamentos suaves, luz curvada y horizonte oscuro.
const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float time;
  uniform float tilt;
  uniform float diskThickness;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x),
      f.y
    );
  }

  float clouds(vec2 p) {
    return noise(p) * 0.57
      + noise(p * 2.07 + 13.4) * 0.28
      + noise(p * 4.13 + 5.7) * 0.15;
  }

  float band(float distance, float width) {
    return exp(-distance * distance / (width * width));
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float outside = smoothstep(0.233, 0.244, radius);

    // Disco de gas suave: capas de luz en lugar de líneas rígidas.
    vec2 diskPoint = vec2(p.x, p.y / diskThickness);
    float diskRadius = length(diskPoint);
    float diskAngle = atan(diskPoint.y, diskPoint.x);
    // Coordenadas periódicas para que el flujo no tenga una costura visible.
    vec2 flowPoint = vec2(cos(diskAngle - time * 0.08), sin(diskAngle - time * 0.08));
    float gas = clouds(flowPoint * 5.0 + vec2(diskRadius * 19.0, diskRadius * 8.0));
    float filaments = clouds(vec2(diskRadius * 80.0 + gas * 2.0, gas * 3.0 + time * 0.04));
    float innerDisk = band(diskRadius - 0.41, 0.095);
    float middleDisk = band(diskRadius - 0.55, 0.14);
    float outerDisk = band(diskRadius - 0.72, 0.14);
    float disk = (innerDisk * 1.0 + middleDisk * 0.55 + outerDisk * 0.2);
    disk *= (0.35 + gas * 0.75 + filaments * 0.35);
    disk *= smoothstep(0.25, 0.31, diskRadius);
    disk *= 1.0 - smoothstep(0.82, 1.0, diskRadius);
    // Un lado más brillante aporta profundidad al disco.
    disk *= 0.8 + 0.35 * smoothstep(-0.5, 0.65, p.x);

    // Arcos de luz curvada alrededor del horizonte.
    float lensRadius = length(vec2(p.x, p.y * 0.94));
    float arc = band(lensRadius - 0.272, 0.023);
    arc *= 0.45 + 0.55 * abs(sin(angle));
    float echo = band(length(vec2(p.x, p.y * 1.07)) - 0.306, 0.013);
    echo *= 0.22 + 0.25 * abs(sin(angle));
    float photon = band(radius - 0.244, 0.0045);
    float rim = band(radius - 0.251, 0.016);
    float halo = exp(-abs(radius - 0.27) * 14.0) * 0.26;
    float wideGlow = band(length(vec2(p.x, p.y * 2.2)) - 0.37, 0.23) * 0.11;

    vec3 violet = vec3(0.47, 0.18, 0.95);
    vec3 rose = vec3(1.0, 0.48, 0.78);
    vec3 pearl = vec3(1.0, 0.87, 0.98);
    vec3 diskColor = mix(violet, rose, clamp(innerDisk * 0.65 + gas * 0.2, 0.0, 1.0));
    diskColor = mix(diskColor, pearl, innerDisk * 0.35);
    vec3 color = diskColor * disk * 1.65;
    color += mix(rose, pearl, 0.6) * arc * 0.95;
    color += violet * echo * 1.3;
    color += pearl * photon * 1.9 + rose * rim * 0.55;
    color += violet * (halo + wideGlow);
    color *= outside;

    float light = disk + arc + echo + photon + rim + halo + wideGlow;
    float alpha = max(1.0 - outside, clamp(light * 1.45, 0.0, 1.0));
    alpha *= 1.0 - smoothstep(0.97, 1.0, radius);
    gl_FragColor = vec4(color, alpha);
  }
`;

// Polvo en órbita, calculado en la GPU para evitar actualizar miles de puntos en CPU.
function createOrbitingDust(timeUniform) {
  const count = APPEARANCE.particles;
  const positions = new Float32Array(count * 3);
  const orbits = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const radius = 0.32 + Math.pow(Math.random(), 1.35) * 0.62;
    orbits.set(
      [
        radius,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.025,
        0.7 + Math.random() * 1.8,
      ],
      i * 4,
    );
    color.setHSL(
      0.72 + Math.random() * 0.14,
      0.3 + Math.random() * 0.4,
      0.65 + Math.random() * 0.25,
    );
    colors.set([color.r, color.g, color.b], i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("orbit", new THREE.BufferAttribute(orbits, 4));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: timeUniform,
      radiusScale: { value: APPEARANCE.size / 2 },
      tilt: { value: APPEARANCE.tilt },
      thickness: { value: APPEARANCE.diskThickness },
      pixelRatio: { value: Math.min(devicePixelRatio, 1.75) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 orbit;
      attribute vec3 color;
      uniform float time;
      uniform float radiusScale;
      uniform float tilt;
      uniform float thickness;
      uniform float pixelRatio;
      varying vec3 vColor;
      varying float vOpacity;
      varying vec2 vLocal;

      void main() {
        float angle = orbit.y + time * 0.12 / pow(orbit.x + 0.2, 1.5);
        vec2 p = vec2(cos(angle), sin(angle) * thickness) * orbit.x;
        p.y += orbit.z;
        vLocal = p;
        p = mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt)) * p;
        vec4 viewPosition = modelViewMatrix * vec4(p * radiusScale, 0.2, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(orbit.w * 1500.0 / max(1.0, -viewPosition.z), 1.0, 4.0) * pixelRatio;
        vColor = color;
        vOpacity = (0.5 + 0.22 * sin(angle * 4.0 + time)) * (1.0 - smoothstep(0.78, 0.96, orbit.x));
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vOpacity;
      varying vec2 vLocal;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float glow = exp(-dot(p, p) * 22.0);
        float visible = smoothstep(0.245, 0.27, length(vLocal));
        gl_FragColor = vec4(vColor, glow * vOpacity * visible);
      }
    `,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  dust.renderOrder = 1.1;
  return dust;
}

export function createBlackHole() {
  const time = { value: 0 };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time,
      tilt: { value: APPEARANCE.tilt },
      diskThickness: { value: APPEARANCE.diskThickness },
    },
    vertexShader,
    fragmentShader,
  });
  const blackHole = new THREE.Mesh(
    new THREE.PlaneGeometry(APPEARANCE.size, APPEARANCE.size),
    material,
  );
  blackHole.renderOrder = 1;
  blackHole.add(createOrbitingDust(time));

  // El horizonte cubre las frases y flores que pasan por su centro.
  const horizon = new THREE.Mesh(
    new THREE.CircleGeometry(APPEARANCE.size * 0.116, 80),
    new THREE.MeshBasicMaterial({
      color: 0x010006,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  horizon.position.z = 0.4;
  horizon.renderOrder = 999;
  blackHole.add(horizon);
  return blackHole;
}
