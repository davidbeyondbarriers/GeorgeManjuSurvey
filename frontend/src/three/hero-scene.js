/**
 * hero-scene.js — WebGL aurora borealis background
 *
 * Three.js ShaderMaterial approach:
 * - Fullscreen quad with GLSL fragment shader for aurora ribbons
 * - BufferGeometry Points for star field with mouse parallax
 * - Respects prefers-reduced-motion (falls back to CSS aurora)
 * - Caps pixel ratio on mobile for performance
 */

import * as THREE from 'three'

// ── SHADERS ───────────────────────────────────────────────────────────────────

const AURORA_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const AURORA_FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;

  varying vec2 vUv;

  /* ── Value noise ──────────────────────────────────────────── */
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i),             hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.500 * vnoise(p);
    v += 0.250 * vnoise(p * 2.1);
    v += 0.125 * vnoise(p * 4.3);
    v += 0.063 * vnoise(p * 8.7);
    return v;
  }

  /* ── Single aurora ribbon ─────────────────────────────────── */
  float ribbon(vec2 uv, float t, float yCenter, float halfWidth,
               float speed, float warpAmt) {
    /* Horizontally warp x with organic noise */
    float xw = uv.x + fbm(vec2(uv.x * 1.4, t * 0.10 * speed)) * warpAmt;

    /* Layered sine undulation — curtain rippling in the wind */
    float wave  = sin(xw * 4.1  + t * 0.38 * speed) * 0.055;
    wave       += sin(xw * 2.2  - t * 0.22 * speed) * 0.038;
    wave       += sin(xw * 7.8  + t * 0.55 * speed) * 0.018;
    wave       += sin(xw * 1.1  - t * 0.15 * speed) * 0.025;

    float dist    = abs(uv.y - (yCenter + wave));
    float falloff = exp(-(dist * dist) / (halfWidth * halfWidth));

    /* Brightness columns along x */
    float cols = fbm(vec2(xw * 2.5, t * 0.07 * speed)) * 0.7 + 0.3;

    return falloff * cols;
  }

  void main() {
    vec2 uv = vUv;

    /* Subtle mouse parallax on UV */
    uv.x += uMouse.x * 0.012;
    uv.y += uMouse.y * 0.006;

    float t = uTime * 0.55;

    /* ── Three ribbons at different depths ─────────────────── */
    float r1 = ribbon(uv, t,        0.70, 0.130, 1.00, 0.28); /* mint-green primary   */
    float r2 = ribbon(uv, t * 0.75, 0.63, 0.090, 0.72, 0.32); /* teal mid             */
    float r3 = ribbon(uv, t * 1.15, 0.78, 0.065, 1.30, 0.20); /* blue-violet fringe   */

    /* ── Colour palette ────────────────────────────────────── */
    vec3 mintGreen  = vec3(0.243, 0.812, 0.627); /* #3ECFA0 */
    vec3 paleGreen  = vec3(0.72,  1.00,  0.88);  /* bright core */
    vec3 deepTeal   = vec3(0.05,  0.60,  0.58);
    vec3 teal       = vec3(0.10,  0.78,  0.72);
    vec3 blueViolet = vec3(0.35,  0.52,  0.94);
    vec3 softWhite  = vec3(0.85,  1.00,  0.93);

    vec3 c1 = mix(mintGreen, softWhite, pow(r1, 2.2)) * r1 * 1.10;
    vec3 c2 = mix(deepTeal, teal, r2) * r2 * 0.75;
    vec3 c3 = blueViolet * r3 * 0.52;

    vec3 aurora = c1 + c2 + c3;

    /* Atmospheric top-edge haze */
    float topGlow = smoothstep(0.50, 1.0, vUv.y) * 0.10;
    aurora += vec3(0.04, 0.18, 0.14) * topGlow;

    /* Fade out over bottom 40% — keep ground dark for text */
    aurora *= smoothstep(0.28, 0.55, uv.y);

    aurora *= 1.45;

    /* Sky base colour #020c12 */
    vec3 sky = vec3(0.008, 0.047, 0.071);
    gl_FragColor = vec4(sky + aurora, 1.0);
  }
`

const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aBrightness;
  uniform   vec2  uMouse;
  varying   float vBrightness;

  void main() {
    vBrightness = aBrightness;
    vec3 pos = position;
    pos.x += uMouse.x * 0.035;
    pos.y += uMouse.y * 0.035;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (280.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`

const STAR_FRAG = /* glsl */`
  varying float vBrightness;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = (1.0 - d * 2.0) * vBrightness;
    gl_FragColor = vec4(0.95, 0.97, 1.0, alpha);
  }
`

// ── SCENE INIT ────────────────────────────────────────────────────────────────

export function initHeroScene (canvas) {
  if (!canvas) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const isMobile = window.innerWidth < 768
  const dpr      = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
  const W        = window.innerWidth
  const H        = window.innerHeight

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha:          false,
    antialias:      false,
    powerPreference: 'low-power'
  })
  renderer.setPixelRatio(dpr)
  renderer.setSize(W, H)
  renderer.setClearColor(0x020c12, 1)

  const scene  = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  /* Aurora fullscreen quad */
  const auroraMat = new THREE.ShaderMaterial({
    vertexShader:   AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    uniforms: {
      uTime:       { value: 0 },
      uResolution: { value: new THREE.Vector2(W, H) },
      uMouse:      { value: new THREE.Vector2(0, 0) }
    }
  })
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), auroraMat))

  /* Stars */
  const COUNT      = isMobile ? 200 : 400
  const positions  = new Float32Array(COUNT * 3)
  const sizes      = new Float32Array(COUNT)
  const brightness = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const j = i * 3
    positions[j]     = (Math.random() - 0.5) * 2.0
    positions[j + 1] = (Math.random() - 0.5) * 2.0
    positions[j + 2] = -0.5
    sizes[i]      = Math.random() * 1.6 + 0.5
    brightness[i] = Math.pow(Math.random(), 1.4) * 0.75 + 0.25
  }

  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position',    new THREE.BufferAttribute(positions, 3))
  starGeo.setAttribute('aSize',       new THREE.BufferAttribute(sizes, 1))
  starGeo.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1))

  const starMat = new THREE.ShaderMaterial({
    vertexShader:   STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms:    { uMouse: { value: new THREE.Vector2(0, 0) } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending
  })
  scene.add(new THREE.Points(starGeo, starMat))

  /* Mouse / touch tracking */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }

  const onMouseMove = e => {
    mouse.tx =  (e.clientX / window.innerWidth  - 0.5) * 2
    mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2
  }
  const onTouchMove = e => {
    const t = e.touches[0]
    mouse.tx =  (t.clientX / window.innerWidth  - 0.5) * 2
    mouse.ty = -(t.clientY / window.innerHeight - 0.5) * 2
  }
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })

  /* Resize */
  const onResize = () => {
    const w = window.innerWidth, h = window.innerHeight
    renderer.setSize(w, h)
    auroraMat.uniforms.uResolution.value.set(w, h)
  }
  window.addEventListener('resize', onResize, { passive: true })

  /* Render loop */
  let frameId
  const startTime = performance.now()

  const tick = () => {
    frameId = requestAnimationFrame(tick)
    mouse.x += (mouse.tx - mouse.x) * 0.06
    mouse.y += (mouse.ty - mouse.y) * 0.06
    const t = (performance.now() - startTime) * 0.001
    auroraMat.uniforms.uTime.value = t
    auroraMat.uniforms.uMouse.value.set(mouse.x, mouse.y)
    starMat.uniforms.uMouse.value.set(mouse.x, mouse.y)
    renderer.render(scene, camera)
  }

  /* Show canvas with fade-in */
  canvas.style.display    = 'block'
  canvas.style.opacity    = '0'
  canvas.style.transition = 'opacity 1.4s ease'
  requestAnimationFrame(() => {
    tick()
    requestAnimationFrame(() => { canvas.style.opacity = '1' })
  })

  /* Stop if user enables reduced-motion at runtime */
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
    if (e.matches) {
      cancelAnimationFrame(frameId)
      canvas.style.display = 'none'
    }
  })

  /* Teardown for HMR */
  return () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
  }
}
