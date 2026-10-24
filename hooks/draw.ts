// Векторный осьминог: SVG с SMIL-анимацией (щупальца, моргание, дыхание, переползание)

export type Scene = {
  width: number
  height: number
  x: number
  y: number
  tx: number
  ty: number
  // Сколько секунд осталось ползти до цели; 0 — сидит на месте
  seconds: number
  isPointed: boolean
  isBusy: boolean
}

const TAU = Math.PI * 2
const FRAMES = 8
const STEPS = 14
const SUCKERS = [0.22, 0.36, 0.5, 0.63, 0.75, 0.85]

const r = (v: number) => Math.round(v * 10) / 10

type Point = { x: number; y: number; nx: number; ny: number; w: number }

function spine(i: number, phase: number, isMoving: boolean): Point[] {
  const side = i - 3.5
  const a0 = (side * 22 * Math.PI) / 180
  const length = 62 - Math.abs(side) * 3
  const curl = Math.sign(side) * (0.6 + Math.abs(side) * 0.25)
  const amp = isMoving ? 0.55 : 0.22
  const step = length / STEPS

  let x = side * 5.2
  let y = 2
  const points: Point[] = []
  for (let k = 0; k <= STEPS; k++) {
    const s = k / STEPS
    const heading = a0 + curl * s * s + amp * Math.sin(TAU * 1.2 * s - phase - i * 0.9) * s
    const w = 6.5 * Math.pow(1 - s, 0.85) + 0.7
    points.push({ x, y, nx: Math.cos(heading), ny: -Math.sin(heading), w })
    x += Math.sin(heading) * step
    y += Math.cos(heading) * step
  }

  return points
}

function outline(points: Point[], inner: number, outer: number) {
  const left = points.map(p => `${r(p.x + p.nx * p.w * outer)} ${r(p.y + p.ny * p.w * outer)}`)
  const right = points.map(p => `${r(p.x - p.nx * p.w * inner)} ${r(p.y - p.ny * p.w * inner)}`)

  return `M${left.join('L')}L${right.reverse().join('L')}Z`
}

function at(points: Point[], s: number) {
  const f = s * STEPS
  const k = Math.min(STEPS - 1, Math.floor(f))
  const t = f - k
  const a = points[k]
  const b = points[k + 1]
  const w = a.w + (b.w - a.w) * t
  const lerp = (u: number, v: number) => u + (v - u) * t

  return {
    x: lerp(a.x, b.x) - lerp(a.nx, b.nx) * w * 0.55,
    y: lerp(a.y, b.y) - lerp(a.ny, b.ny) * w * 0.55,
    r: Math.max(0.6, w * 0.32),
  }
}

function tentacle(i: number, isMoving: boolean) {
  const dur = isMoving ? '0.8s' : '2.8s'
  const frames = Array.from({ length: FRAMES + 1 }, (_, f) => spine(i, (TAU * f) / FRAMES, isMoving))
  const anim = (attr: string, values: string[]) =>
    `<animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" values="${values.join(';')}"/>`

  const body = frames.map(p => outline(p, 1, 1))
  const belly = frames.map(p => outline(p, 1, -0.35))
  const suckers = SUCKERS.map(s => {
    const spots = frames.map(p => at(p, s))

    return (
      `<circle cx="${r(spots[0].x)}" cy="${r(spots[0].y)}" r="${r(spots[0].r)}" fill="url(#sucker)">` +
      anim('cx', spots.map(p => `${r(p.x)}`)) +
      anim('cy', spots.map(p => `${r(p.y)}`)) +
      `</circle>`
    )
  })

  return (
    `<path d="${body[0]}" fill="url(#skin)" stroke="#7a1f12" stroke-width="0.6" stroke-linejoin="round">${anim('d', body)}</path>` +
    `<path d="${belly[0]}" fill="#f6b3a0" opacity="0.85">${anim('d', belly)}</path>` +
    suckers.join('')
  )
}

function eye(cx: number, look: number) {
  return (
    `<g transform="translate(${cx} -16)">` +
    `<ellipse rx="7.2" ry="8" fill="#a8321f"/>` +
    `<ellipse rx="6" ry="6.8" fill="#fff6d8"/>` +
    `<rect x="${r(-3.6 + look)}" y="-1.6" width="7.2" height="3.2" rx="1.6" fill="#1b0f0c"/>` +
    `<circle cx="${r(-1.8 + look)}" cy="-2.6" r="1.3" fill="#fff" opacity="0.9"/>` +
    // Веко: опускается раз в несколько секунд
    `<ellipse cy="-8" rx="7.4" ry="0" fill="url(#skin)">` +
    `<animate attributeName="ry" dur="4.7s" repeatCount="indefinite" keyTimes="0;0.9;0.94;0.98;1" values="0;0;8.6;0;0"/>` +
    `<animate attributeName="cy" dur="4.7s" repeatCount="indefinite" keyTimes="0;0.9;0.94;0.98;1" values="-8;-8;-0.5;-8;-8"/>` +
    `</ellipse>` +
    `</g>`
  )
}

const DEFS =
  `<defs>` +
  `<radialGradient id="skin" cx="38%" cy="28%" r="80%">` +
  `<stop offset="0" stop-color="#ff9a76"/><stop offset="0.45" stop-color="#e2553a"/><stop offset="1" stop-color="#8e2414"/>` +
  `</radialGradient>` +
  `<radialGradient id="sucker" cx="40%" cy="35%" r="70%">` +
  `<stop offset="0" stop-color="#ffe3d6"/><stop offset="0.7" stop-color="#f0a48d"/><stop offset="1" stop-color="#b8543d"/>` +
  `</radialGradient>` +
  `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `</defs>`

const MANTLE =
  `<g>` +
  `<animateTransform attributeName="transform" type="scale" dur="2.4s" repeatCount="indefinite" values="1 1;1.05 0.96;1 1"/>` +
  `<path d="M-27 2C-33 -30 -19 -70 0 -70C19 -70 33 -30 27 2C15 10 -15 10 -27 2Z" fill="url(#skin)" stroke="#7a1f12" stroke-width="0.8"/>` +
  `<ellipse cx="-9" cy="-50" rx="9" ry="12" fill="#fff" opacity="0.22"/>` +
  `<ellipse cx="12" cy="-40" rx="3" ry="2.2" fill="#9c2a17" opacity="0.5"/>` +
  `<ellipse cx="-14" cy="-32" rx="2.2" ry="1.7" fill="#9c2a17" opacity="0.5"/>` +
  `<ellipse cx="4" cy="-56" rx="2.6" ry="1.9" fill="#9c2a17" opacity="0.45"/>` +
  `<ellipse cx="17" cy="-24" rx="1.8" ry="1.4" fill="#9c2a17" opacity="0.5"/>` +
  // Сифон сбоку
  `<path d="M24 -8c6 -1 9 2 8 5c-1 3 -5 3 -8 1z" fill="#c4442b" stroke="#7a1f12" stroke-width="0.6"/>` +
  `</g>`

function thinking() {
  const dot = (cx: number, cy: number, rr: number, begin: string) =>
    `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#fff" stroke="#9aa" stroke-width="0.8" opacity="0">` +
    `<animate attributeName="opacity" dur="1.8s" begin="${begin}" repeatCount="indefinite" values="0;1;1;0"/></circle>`

  return `<g>${dot(24, -66, 3, '0s')}${dot(33, -78, 4.5, '0.3s')}${dot(46, -94, 7, '0.6s')}</g>`
}

export function octopusSvg(scene: Scene) {
  const { width, height, x, y, tx, ty, seconds } = scene
  const isMoving = seconds > 0
  const dx = tx - x
  const look = isMoving ? Math.max(-1.6, Math.min(1.6, dx / 40)) : 0
  const tilt = isMoving ? Math.max(-9, Math.min(9, dx / 25)) : 0

  const place = isMoving
    ? `<animateTransform attributeName="transform" type="translate" from="${r(x)} ${r(y)}" to="${r(tx)} ${r(ty)}" dur="${r(seconds)}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1"/>`
    : ''
  const target =
    isMoving && scene.isPointed
      ? `<g transform="translate(${r(tx)} ${r(ty + 40)})" fill="none" stroke="#e8b54a" stroke-width="2">` +
        `<circle r="4"><animate attributeName="r" dur="1.2s" repeatCount="indefinite" values="4;20"/>` +
        `<animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="0.9;0"/></circle></g>`
      : ''

  const tentacles = [0, 7, 1, 6, 2, 5, 3, 4].map(i => tentacle(i, isMoving)).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    DEFS +
    target +
    `<g transform="translate(${r(x)} ${r(y)})">${place}` +
    `<ellipse cy="52" rx="56" ry="9" fill="url(#shadow)"/>` +
    `<g transform="rotate(${r(tilt)})">` +
    `<g><animateTransform attributeName="transform" type="translate" dur="${isMoving ? '0.8s' : '2.4s'}" repeatCount="indefinite" values="0 0;0 -3;0 0"/>` +
    tentacles +
    MANTLE +
    eye(-11, look) +
    eye(11, look) +
    (scene.isBusy ? thinking() : '') +
    `</g></g></g></svg>`
  )
}
