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
  // Гладят: розовеет, жмурится, сердечки
  isHappy: boolean
  // Испугался: темнеет, зрачки щёлочкой
  isScared: boolean
  // Чернильное пятно: где, сколько секунд ему осталось и форма
  ink: { x: number; y: number; seconds: number; seed: number; isFresh: boolean } | null
  // Рисунок откликается на мышь сам (наведение, нажатие) и форма чернил для этого
  isInteractive?: boolean
  inkSeed?: number
  // Чем занят Claude: осьминог в очках с книжкой, с карандашом, в каске, с глобусом
  activity?: Activity | null
  isAsleep?: boolean
  isHungry?: boolean
  // Прячется: почти прозрачный под цвет фона или в ракушке
  hide?: 'camo' | 'shell' | null
  // Рыбка падает сверху в (x, y)
  fish?: { x: number; y: number; isFresh: boolean } | null
}

export type Activity = 'read' | 'edit' | 'run' | 'web' | 'team'

const ACTIVITY_LABEL: Record<Activity, string> = {
  read: 'читаю…',
  edit: 'пишу код…',
  run: 'запускаю…',
  web: 'ищу в сети…',
  team: 'зову помощников…',
}

// Очки и книжка — пока Claude читает файлы
const GLASSES =
  `<g stroke="#2b2b2b" stroke-width="1.6" fill="#bfe3ff" fill-opacity="0.25">` +
  `<circle cx="-11" cy="-16" r="8.8"/><circle cx="11" cy="-16" r="8.8"/>` +
  `<path d="M-2.4 -17Q0 -19.5 2.4 -17" fill="none"/></g>`
const BOOK =
  `<g transform="translate(0 12) rotate(-4)">` +
  `<path d="M-24 0L0 4L24 0L24 19L0 23L-24 19Z" fill="#3c6fb4" stroke="#1f3f6e"/>` +
  `<path d="M-21 2.5L-1.5 6V20.5L-21 17ZM21 2.5L1.5 6V20.5L21 17Z" fill="#f6f2e4"/>` +
  `<path d="M-18 8L-5 10M-18 11.5L-5 13.5M5 10L18 8M5 13.5L18 11.5" stroke="#b9b29a" stroke-width="0.8"/>` +
  `<path d="M1.5 6L21 2.5V17L1.5 20.5Z" fill="#fffaf0">` +
  `<animate attributeName="d" dur="2.6s" repeatCount="indefinite" keyTimes="0;0.8;0.9;1" values="M1.5 6L21 2.5V17L1.5 20.5Z;M1.5 6L21 2.5V17L1.5 20.5Z;M1.5 6L1 1V20L1.5 20.5Z;M1.5 6L-21 2.5V17L1.5 20.5Z"/>` +
  `</path></g>`
// Каска — пока запускаются команды
const HARD_HAT =
  `<g transform="translate(0 -64)">` +
  `<path d="M-23 4C-23 -16 23 -16 23 4Z" fill="#f2c230" stroke="#a37d10" stroke-width="1"/>` +
  `<rect x="-3.5" y="-13" width="7" height="15" rx="2.5" fill="#e0ad1c"/>` +
  `<rect x="-28" y="2" width="56" height="5.5" rx="2.7" fill="#e0ad1c" stroke="#a37d10" stroke-width="1"/>` +
  `<ellipse cx="-9" cy="-6" rx="5" ry="2.4" fill="#fff" opacity="0.45"/></g>`
// Карандаш стучит — пока правится код
const PENCIL =
  `<g transform="translate(36 2)">` +
  `<animateTransform attributeName="transform" type="rotate" additive="sum" dur="0.35s" repeatCount="indefinite" values="25;45;25"/>` +
  `<rect x="-3.2" y="-24" width="6.4" height="30" fill="#f6c343" stroke="#9a6b12" stroke-width="0.8"/>` +
  `<rect x="-3.2" y="-29" width="6.4" height="5.5" fill="#f08a9a" stroke="#9a6b12" stroke-width="0.8"/>` +
  `<path d="M-3.2 6L0 14L3.2 6Z" fill="#f2d7a6" stroke="#9a6b12" stroke-width="0.6"/>` +
  `<path d="M-1.1 11.3L0 14L1.1 11.3Z" fill="#333"/></g>`
// Глобус крутится — пока идёт поиск в сети
const GLOBE =
  `<g transform="translate(40 -4)">` +
  `<circle r="11" fill="#5ab4e8" stroke="#22628a" stroke-width="1"/>` +
  `<path d="M-6 -5C-2 -8 2 -3 0 0C-3 3 -7 1 -6 -5ZM3 2C7 1 8 6 5 8C2 9 1 5 3 2Z" fill="#6cc46a"/>` +
  `<ellipse rx="4" ry="11" fill="none" stroke="#22628a" stroke-width="0.8">` +
  `<animate attributeName="rx" dur="1.6s" repeatCount="indefinite" values="11;0.5;11"/></ellipse>` +
  `<path d="M-11 0H11" stroke="#22628a" stroke-width="0.8"/></g>`
// Помощники — пока работают субагенты: маленькие осьминожки-пузырьки
const TEAM =
  `<g fill="#ff9a76" stroke="#8e2414" stroke-width="0.8">` +
  `<g transform="translate(-44 4) scale(0.32)">${'<path d="M-27 2C-33 -30 -19 -70 0 -70C19 -70 33 -30 27 2C15 10 -15 10 -27 2Z"/>'}` +
  `<animateTransform attributeName="transform" type="translate" additive="sum" dur="0.9s" repeatCount="indefinite" values="0 0;0 -8;0 0"/></g>` +
  `<g transform="translate(44 4) scale(0.32)">${'<path d="M-27 2C-33 -30 -19 -70 0 -70C19 -70 33 -30 27 2C15 10 -15 10 -27 2Z"/>'}` +
  `<animateTransform attributeName="transform" type="translate" additive="sum" dur="0.9s" begin="0.45s" repeatCount="indefinite" values="0 0;0 -8;0 0"/></g></g>`

function activityProps(a: Activity) {
  return { read: GLASSES + BOOK, edit: PENCIL, run: HARD_HAT, web: GLOBE, team: TEAM }[a]
}

function speechTag(text: string) {
  const w = text.length * 6.4 + 14

  return (
    `<g transform="translate(26 -96)">` +
    `<rect x="0" y="-12" width="${r(w)}" height="18" rx="9" fill="#ffffff" stroke="#9aa" stroke-width="0.8"/>` +
    `<text x="7" y="1" font-family="Segoe UI, sans-serif" font-size="11" fill="#334">${text}</text></g>`
  )
}

// Спит: глаза-щёлочки и улетающие «z»
function sleepingEye(cx: number) {
  return `<path transform="translate(${cx} -15)" d="M-6 0Q0 4.5 6 0" fill="none" stroke="#3a0d06" stroke-width="2.2" stroke-linecap="round"/>`
}

function zzz() {
  const z = (begin: string, size: number) =>
    `<text font-family="Segoe UI, sans-serif" font-weight="700" font-size="${size}" fill="#7a8fb0" opacity="0">z` +
    `<animate attributeName="opacity" dur="3s" begin="${begin}" repeatCount="indefinite" values="0;1;0"/>` +
    `<animateTransform attributeName="transform" type="translate" dur="3s" begin="${begin}" repeatCount="indefinite" values="20 -70;34 -100;50 -130"/></text>`

  return z('0s', 12) + z('1s', 16) + z('2s', 20)
}

// Голодный: веки приопущены
function hungryLid(cx: number) {
  return `<ellipse cx="${cx}" cy="-21" rx="7.6" ry="5.2" fill="url(#skin)"/>`
}

// Ракушка, из которой выглядывают глаза
const SHELL =
  `<g transform="translate(0 6)">` +
  `<path d="M-46 26C-58 -10 -30 -52 6 -50C40 -48 56 -14 44 14C36 32 10 38 -8 34Z" fill="url(#shell)" stroke="#a9744a" stroke-width="1.5"/>` +
  `<path d="M6 -50C26 -36 28 -6 12 6C-2 16 -20 6 -18 -10C-16 -22 -2 -24 2 -14C5 -6 -4 -2 -8 -8" fill="none" stroke="#a9744a" stroke-width="2"/>` +
  `<path d="M-40 10C-30 4 -14 6 -8 20" fill="none" stroke="#c99a6c" stroke-width="1.4"/>` +
  `<ellipse cx="-30" cy="26" rx="18" ry="9" fill="#3b1d10"/>` +
  `<g><animateTransform attributeName="transform" type="translate" dur="4s" repeatCount="indefinite" keyTimes="0;0.35;0.5;0.85;1" values="0 6;0 6;0 -2;0 -2;0 6"/>` +
  `<circle cx="-36" cy="24" r="4" fill="#f7e6b0"/><circle cx="-24" cy="24" r="4" fill="#f7e6b0"/>` +
  `<rect x="-38.5" y="23" width="5" height="2.2" rx="1" fill="#1b0f0c"/><rect x="-26.5" y="23" width="5" height="2.2" rx="1" fill="#1b0f0c"/>` +
  `</g>` +
  `<ellipse cx="-30" cy="31" rx="19" ry="5" fill="#d8b48a"/></g>`

function fishSvg(fish: NonNullable<Scene['fish']>) {
  const fall = fish.isFresh
    ? `<animateTransform attributeName="transform" type="translate" dur="1s" fill="freeze" values="${r(fish.x)} -20;${r(fish.x)} ${r(fish.y)}" keySplines="0.5 0 1 1" calcMode="spline" keyTimes="0;1"/>`
    : ''

  return (
    `<g transform="translate(${r(fish.x)} ${r(fish.y)})">${fall}` +
    `<g><animateTransform attributeName="transform" type="rotate" dur="0.6s" repeatCount="indefinite" values="-8;8;-8"/>` +
    `<path d="M10 0L20 -8L18 0L20 8Z" fill="#2f8fc9"/>` +
    `<ellipse rx="12" ry="7" fill="#4fb3e8" stroke="#2a74a6" stroke-width="0.8"/>` +
    `<path d="M-2 -6Q2 0 -2 6" fill="none" stroke="#2a74a6" stroke-width="0.8"/>` +
    `<circle cx="-6" cy="-1.5" r="1.8" fill="#123"/></g></g>`
  )
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

// Довольный глаз-дужка и румянец под ним
function happyEye(cx: number) {
  return (
    `<g transform="translate(${cx} -16)">` +
    `<path d="M-6 2Q0 -7 6 2" fill="none" stroke="#3a0d06" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse cx="${cx < 0 ? -3 : 3}" cy="9" rx="5.5" ry="2.6" fill="#ff7b9c" opacity="0.75"/>` +
    `</g>`
  )
}

function hearts() {
  const heart = (x: number, begin: string, s: number) =>
    `<g opacity="0"><animate attributeName="opacity" dur="1.8s" begin="${begin}" repeatCount="indefinite" values="0;1;1;0"/>` +
    `<animateTransform attributeName="transform" type="translate" dur="1.8s" begin="${begin}" repeatCount="indefinite" values="${x} -70;${x + 6} -100;${x - 4} -128"/>` +
    `<path transform="scale(${s})" d="M0 4C-2 0 -9 -2 -9 -7C-9 -11 -4 -12 0 -8C4 -12 9 -11 9 -7C9 -2 2 0 0 4Z" fill="#ff4f86" stroke="#c42a5c" stroke-width="0.8"/></g>`

  return heart(-22, '0s', 1) + heart(8, '0.6s', 1.25) + heart(28, '1.2s', 0.9)
}

// Чернильное облако вокруг (0, 0): неровный край, брызги, блик
function inkShape(s: number) {
  const R = 58
  const n = 36
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (TAU * k) / n
    const rr = R * (1 + 0.2 * Math.sin(3 * a + s) + 0.1 * Math.sin(7 * a + 2.3 * s) + 0.06 * Math.sin(11 * a + 0.7 * s))

    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
  const mid = (i: number) => {
    const [ax, ay] = pts[i % n]
    const [bx, by] = pts[(i + 1) % n]

    return `${r((ax + bx) / 2)} ${r((ay + by) / 2)}`
  }
  const d = `M${mid(0)}` + pts.map((_, i) => `Q${r(pts[(i + 1) % n][0])} ${r(pts[(i + 1) % n][1])} ${mid(i + 1)}`).join('') + 'Z'
  const drops = Array.from({ length: 8 }, (_, k) => {
    const a = s * 3.1 + k * 0.8 + Math.sin(s + k) * 0.5
    const dd = R * (1.3 + 0.5 * Math.abs(Math.sin(s * 1.7 + k * 2.3)))

    return `<circle cx="${r(Math.cos(a) * dd)}" cy="${r(Math.sin(a) * dd)}" r="${r(4 + 7 * Math.abs(Math.cos(s + k)))}"/>`
  }).join('')

  return (
    `<path d="${d}" fill="url(#ink)" stroke="#2a2140" stroke-width="2"/>` +
    `<g fill="#120d1c">${drops}</g>` +
    `<ellipse cx="-20" cy="-24" rx="16" ry="8" fill="#6a6290" opacity="0.45" transform="rotate(-25 -20 -24)"/>`
  )
}

// Чернила по кнопке: на месте осьминога, исчезают к концу срока
function inkBlot(ink: NonNullable<Scene['ink']>) {
  const fade = Math.max(0, ink.seconds - 1.5)
  const pop = ink.isFresh
    ? `<animateTransform attributeName="transform" type="scale" dur="0.3s" values="0.2;1.12;1" fill="freeze"/>`
    : ''

  return (
    `<g transform="translate(${r(ink.x)} ${r(ink.y)})">` +
    `<animate attributeName="opacity" begin="${r(fade)}s" dur="${r(Math.min(1.5, ink.seconds))}s" from="1" to="0" fill="freeze"/>` +
    `<g>${pop}${inkShape(ink.seed)}</g></g>`
  )
}

function eye(cx: number, look: number, isScared = false) {
  const pupil = isScared
    ? `<ellipse cx="${r(look)}" rx="1.6" ry="3.4" fill="#1b0f0c"/>`
    : `<rect x="${r(-3.6 + look)}" y="-1.6" width="7.2" height="3.2" rx="1.6" fill="#1b0f0c"/>`

  return (
    `<g transform="translate(${cx} -16)">` +
    `<ellipse rx="7.2" ry="8" fill="#a8321f"/>` +
    `<ellipse rx="6" ry="6.8" fill="#fff6d8"/>` +
    pupil +
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
  `<radialGradient id="ink" cx="40%" cy="35%" r="75%">` +
  `<stop offset="0" stop-color="#2b2342"/><stop offset="0.6" stop-color="#14101f"/><stop offset="1" stop-color="#07050c"/>` +
  `</radialGradient>` +
  `<filter id="scared"><feColorMatrix type="matrix" values="0.55 0 0 0 0  0 0.5 0 0 0  0 0 0.6 0 0.02  0 0 0 1 0"/></filter>` +
  `<filter id="happy"><feColorMatrix type="matrix" values="1 0.1 0.1 0 0.03  0 0.9 0.15 0 0.05  0.05 0.1 1 0 0.12  0 0 0 1 0"/></filter>` +
  `<radialGradient id="shell" cx="40%" cy="30%" r="80%">` +
  `<stop offset="0" stop-color="#fff1df"/><stop offset="0.6" stop-color="#f0c9a0"/><stop offset="1" stop-color="#c98f5e"/>` +
  `</radialGradient>` +
  `<filter id="camo"><feColorMatrix type="saturate" values="0.15"/></filter>` +
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
    (scene.isInteractive ? TOUCH_CSS : '') +
    target +
    `<g transform="translate(${r(x)} ${r(y)})">${place}` +
    `<ellipse cy="52" rx="56" ry="9" fill="url(#shadow)"/>` +
    `<g transform="rotate(${r(tilt)})">` +
    (scene.hide === 'shell' ? SHELL : body(scene, tentacles, look, isMoving)) +
    `</g></g>` +
    (scene.fish ? fishSvg(scene.fish) : '') +
    (scene.ink === null ? '' : inkBlot(scene.ink)) +
    `</svg>`
  )
}

function body(scene: Scene, tentacles: string, look: number, isMoving: boolean) {
  const filter = scene.isScared ? 'scared' : scene.isHappy ? 'happy' : scene.hide === 'camo' ? 'camo' : ''
  const eyes = scene.isHappy
    ? happyEye(-11) + happyEye(11)
    : scene.isAsleep
      ? sleepingEye(-11) + sleepingEye(11)
      : eye(-11, look, scene.isScared) + eye(11, look, scene.isScared) + (scene.isHungry ? hungryLid(-11) + hungryLid(11) : '')
  const bob = isMoving ? '0.8s' : scene.isHappy ? '1.1s' : scene.isAsleep ? '4s' : '2.4s'
  const camo =
    scene.hide === 'camo'
      ? ` opacity="0.16"><animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.1;0.22;0.1"/`
      : ''
  const extras =
    scene.hide === 'camo'
      ? ''
      : scene.isHappy
        ? hearts()
        : scene.isAsleep
          ? zzz()
          : scene.activity
            ? activityProps(scene.activity) + speechTag(ACTIVITY_LABEL[scene.activity])
            : scene.isBusy
              ? thinking()
              : ''

  return (
    `<g${filter === '' ? '' : ` filter="url(#${filter})"`}${camo}>` +
    `<animateTransform attributeName="transform" type="translate" dur="${bob}" repeatCount="indefinite" values="0 0;0 -3;0 0"/>` +
    tentacles +
    MANTLE +
    eyes +
    `</g>` +
    extras +
    (scene.isInteractive && scene.hide !== 'camo' ? touchLayers(scene.inkSeed ?? 0) : '')
  )
}

// Отклик на мышь без скриптов, одним CSS: наведение — ласка, нажатие — чернила.
// Чернила проявляются по :active и гаснут с задержкой 8,5 с, так что держатся ~10 секунд.
const TOUCH_CSS =
  `<style>` +
  `.hit{fill:#000;fill-opacity:0.001;cursor:pointer}` +
  `.pet,.inkfx{pointer-events:none}` +
  `.pet{opacity:0;transition:opacity .35s}` +
  `.me:hover .pet{opacity:1}` +
  `.me:active .pet{opacity:0;transition:opacity 0s}` +
  `.inkfx{opacity:0;transition:opacity 1.5s ease 8.5s}` +
  `.me:active .inkfx{opacity:1;transition:opacity 0s}` +
  `</style>`

function touchLayers(seed: number) {
  return (
    `<g class="me">` +
    // Невидимая «шкурка» по контуру осьминога — по ней и ловится мышь
    `<ellipse class="hit" cy="-28" rx="44" ry="46"/><ellipse class="hit" cy="26" rx="62" ry="32"/>` +
    `<g class="pet" filter="url(#happy)">` +
    `<g transform="translate(-11 -16)"><ellipse rx="7.6" ry="8.4" fill="url(#skin)"/></g>` +
    `<g transform="translate(11 -16)"><ellipse rx="7.6" ry="8.4" fill="url(#skin)"/></g>` +
    happyEye(-11) +
    happyEye(11) +
    hearts() +
    `</g>` +
    `<g class="inkfx" transform="translate(0 -30)">${inkShape(seed)}</g>` +
    `</g>`
  )
}
