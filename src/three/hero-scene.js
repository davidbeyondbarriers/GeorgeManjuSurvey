/**
 * Three.js Hero Scene — floating particle field
 *
 * Lazy-loaded after the hero paints so it never blocks initial render.
 * Gracefully degrades if Three.js fails to load or WebGL is unavailable.
 * Respects prefers-reduced-motion (static if motion is off).
 */

const PARTICLE_COUNT = 120
const PARTICLE_SPREAD = 18
const COLORS = [0x4a7fc1, 0x3d7a5c, 0x7b6fa0, 0xe07b54, 0x8ec9a8]

/**
 * Initialise the Three.js particle scene in a canvas element.
 * @param {HTMLCanvasElement} canvas
 */
export async function initHeroScene (canvas) {
  if (!canvas) return

  // Abort if WebGL is unavailable
  if (!_webGLSupported()) return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let THREE
  try {
    THREE = await import('three')
  } catch {
    return // Three.js failed — hero still looks fine without it
  }

  const { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry,
          Float32BufferAttribute, PointsMaterial, Points, Color,
          AdditiveBlending } = THREE

  const W = canvas.clientWidth  || window.innerWidth
  const H = canvas.clientHeight || window.innerHeight

  // Renderer
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.setClearColor(0x000000, 0)

  // Scene + camera
  const scene  = new Scene()
  const camera = new PerspectiveCamera(60, W / H, 0.1, 1000)
  camera.position.z = 20

  // Particles
  const geo = new BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors    = new Float32Array(PARTICLE_COUNT * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3
    positions[i3]     = (Math.random() - 0.5) * PARTICLE_SPREAD
    positions[i3 + 1] = (Math.random() - 0.5) * PARTICLE_SPREAD
    positions[i3 + 2] = (Math.random() - 0.5) * PARTICLE_SPREAD

    const c = new Color(COLORS[Math.floor(Math.random() * COLORS.length)])
    colors[i3]     = c.r
    colors[i3 + 1] = c.g
    colors[i3 + 2] = c.b
  }

  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('color',    new Float32BufferAttribute(colors, 3))

  const mat = new PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false
  })

  const points = new Points(geo, mat)
  scene.add(points)

  // Resize handler
  const onResize = () => {
    const w = canvas.clientWidth  || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize, { passive: true })

  // Render loop — paused if reduced-motion
  if (prefersReduced) {
    renderer.render(scene, camera)
    return
  }

  let raf
  const tick = () => {
    raf = requestAnimationFrame(tick)
    points.rotation.y += 0.0008
    points.rotation.x += 0.0003
    renderer.render(scene, camera)
  }
  tick()

  // Clean up when hero leaves the viewport
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', onResize)
        renderer.dispose()
        observer.disconnect()
      }
    })
  })
  observer.observe(canvas)
}

function _webGLSupported () {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
  } catch {
    return false
  }
}
