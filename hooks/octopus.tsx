import type { ClientModule } from 'claude-code'

// Пиксельный осьминог для терминала: каждая клетка — два пикселя полублоком «▀»
type Props = { isBusy: boolean; say: string; isThinking: boolean }
type Ink = { x: number; y: number; ttl: number; seed: number }
type Press = { x: number; y: number; moved: number; isOnBody: boolean }
type Octo = {
  x: number
  y: number
  tx: number
  ty: number
  tick: number
  phase: number
  tilt: number
  rest: number
  isPointed: boolean
  pet: number
  scared: number
  stroke: number
  ink: Ink | null
  press: Press | null
  hover: { x: number; y: number } | null
  draft: string
}

const EMPTY = -1
const STEPS = 12
const ORDER = [0, 7, 1, 6, 2, 5, 3, 4]
const TICK_MS = 90
const INK_TICKS = Math.round(10000 / TICK_MS)
const TOP_ROWS = 3

const SKIN_DARK = 0x5e160c
const SKIN_MID = 0xd2472d
const SKIN_LIGHT = 0xff9a72
const BELLY = 0xf0a189
const SUCKER = 0xffe4d6
const EYE_RING = 0x7a1e10
const EYE_WHITE = 0xf7e6b0
const PUPIL = 0x120806
const BUBBLE = 0xeef3f6
const TARGET = 0xe8b54a
const HEART = 0xff4f86
const BLUSH = 0xff7b9c
const INK_CORE = 0x0e0a16
const INK_EDGE = 0x2a2140
const INK_GLOSS = 0x4a4268

const HEART_SPRITE = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..']

function mix(a: number, b: number, t: number) {
  const k = Math.min(1, Math.max(0, t))
  const ch = (s: number) => {
    const u = (a >> s) & 255
    const v = (b >> s) & 255

    return Math.round(u + (v - u) * k) << s
  }

  return ch(16) | ch(8) | ch(0)
}

function skin(l: number) {
  return l < 0.5 ? mix(SKIN_DARK, SKIN_MID, l * 2) : mix(SKIN_MID, SKIN_LIGHT, (l - 0.5) * 2)
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

type Seg = { ax: number; ay: number; bx: number; by: number; wa: number; wb: number }

// Средняя линия щупальца в единицах тела: веер вниз, кончики закручены наружу
function arm(i: number, phase: number, isMoving: boolean): Seg[] {
  const side = i - 3.5
  const a0 = (side * 16 * Math.PI) / 180
  const length = 2.5 - Math.abs(side) * 0.08
  const curl = Math.sign(side) * (0.45 + Math.abs(side) * 0.16)
  const amp = isMoving ? 0.65 : 0.25
  const step = length / STEPS
  const width = (s: number) => 0.3 * Math.pow(1 - s, 0.8) + 0.05

  let x = side * 0.2
  let y = 0
  const segs: Seg[] = []
  for (let k = 0; k < STEPS; k++) {
    const s = k / STEPS
    const heading = a0 + curl * s * s + amp * Math.sin(Math.PI * 2.4 * s - phase - i * 0.9) * s
    const nx = x + Math.sin(heading) * step
    const ny = y + Math.cos(heading) * step
    segs.push({ ax: x, ay: y, bx: nx, by: ny, wa: width(s), wb: width((k + 1) / STEPS) })
    x = nx
    y = ny
  }

  return segs
}

export function scaleFor(W: number, H: number) {
  return Math.max(5, Math.min(10, Math.min(W / 5.5, H / 6.4)))
}

// Попал ли пиксель (в координатах холста) в осьминога
export function isOnBody(o: Octo, x: number, y: number, S: number) {
  const dx = (x - o.x) / S
  const dy = (y - o.y) / S

  return Math.abs(dx) < 1.5 && dy > -2.5 && dy < 1.8
}

function paintInk(out: Int32Array, ink: Ink, W: number, H: number, S: number) {
  const age = INK_TICKS - ink.ttl
  const size = Math.min(1, (age + 1) / 4) * Math.min(1, ink.ttl / 18)
  const R = 1.7 * S * size
  if (R < 0.5) return
  const s = ink.seed
  const drops = Array.from({ length: 7 }, (_, n) => {
    const a = s * 3.1 + n * 0.9 + Math.sin(s + n) * 0.5
    const d = R * (1.3 + 0.45 * Math.abs(Math.sin(s * 1.7 + n * 2.3)))

    return { x: ink.x + Math.cos(a) * d, y: ink.y + Math.sin(a) * d, r: R * (0.1 + 0.12 * Math.abs(Math.cos(s + n))) }
  })
  const reach = R * 2
  for (let py = Math.max(0, Math.floor(ink.y - reach)); py < Math.min(H, ink.y + reach); py++) {
    for (let px = Math.max(0, Math.floor(ink.x - reach)); px < Math.min(W, ink.x + reach); px++) {
      const dx = px + 0.5 - ink.x
      const dy = py + 0.5 - ink.y
      const a = Math.atan2(dy, dx)
      const d = Math.hypot(dx, dy)
      const edge = R * (1 + 0.22 * Math.sin(3 * a + s) + 0.12 * Math.sin(7 * a + 2.3 * s) + 0.07 * Math.sin(11 * a + 0.7 * s))
      let color = EMPTY
      if (d < edge) {
        color = d > edge - 1.2 ? INK_EDGE : INK_CORE
        const gx = (dx + R * 0.35) / (R * 0.28)
        const gy = (dy + R * 0.4) / (R * 0.16)
        if (gx * gx + gy * gy < 1) color = INK_GLOSS
      } else {
        for (const p of drops) {
          if (Math.hypot(px + 0.5 - p.x, py + 0.5 - p.y) < Math.max(0.7, p.r)) color = INK_CORE
        }
      }
      if (color !== EMPTY) out[py * W + px] = color
    }
  }
}

export function paint(o: Octo, isBusy: boolean, W: number, H: number): Int32Array {
  const px = new Int32Array(W * H).fill(EMPTY)
  const S = scaleFor(W, H)
  const isMoving = Math.hypot(o.tx - o.x, o.ty - o.y) > 0.6
  const isHappy = o.pet > 0
  const isScared = o.scared > 0
  const breath = Math.sin(o.tick * (isHappy ? 0.12 : 0.07))
  const bob = Math.sin(o.tick * (isMoving ? 0.6 : isHappy ? 0.35 : 0.18)) * (isHappy ? 0.08 : 0.05)
  const cos = Math.cos(o.tilt)
  const sin = Math.sin(o.tilt)
  const arms = ORDER.map(i => arm(i, o.phase, isMoving))
  const look = isMoving ? Math.sign(o.tx - o.x) * 0.35 : 0
  const isBlink = o.tick % 55 < 2
  // Осьминоги меняют цвет: от ласки розовеют, от испуга темнеют
  const tint = (c: number) =>
    isScared ? mix(c, 0x3a0a14, 0.35) : isHappy ? mix(c, 0xff8fb0, 0.22) : c

  // Мантия: эллипс с плоским низом, «дышит»
  const hy = -1.15
  const rx = 0.98 * (1 + 0.04 * breath)
  const ry = 1.2 * (1 - 0.03 * breath)
  const eyeR = Math.max(2.5, 0.34 * S) / S

  const x0 = Math.max(0, Math.floor(o.x - 3.4 * S))
  const x1 = Math.min(W, Math.ceil(o.x + 3.4 * S))
  const y0 = Math.max(0, Math.floor(o.y - 3.9 * S))
  const y1 = Math.min(H, Math.ceil(o.y + 3.1 * S))

  for (let py = y0; py < y1; py++) {
    for (let pxx = x0; pxx < x1; pxx++) {
      const dx = (pxx + 0.5 - o.x) / S
      const dy = (py + 0.5 - o.y) / S - bob
      const u = dx * cos + dy * sin
      const v = -dx * sin + dy * cos
      let color = EMPTY

      // Щупальца: последнее попадание в порядке ORDER ближе к зрителю
      for (let n = arms.length - 1; n >= 0 && color === EMPTY; n--) {
        const segs = arms[n]
        for (let k = 0; k < segs.length; k++) {
          const g = segs[k]
          const sx = g.bx - g.ax
          const sy = g.by - g.ay
          const len2 = sx * sx + sy * sy
          const t = Math.min(1, Math.max(0, ((u - g.ax) * sx + (v - g.ay) * sy) / len2))
          const qx = u - (g.ax + sx * t)
          const qy = v - (g.ay + sy * t)
          const w = Math.max(g.wa + (g.wb - g.wa) * t, 0.55 / S)
          const d = Math.hypot(qx, qy)
          if (d >= w) continue
          const s = (k + t) / STEPS
          // Сторона щупальца: с одной — светлое брюшко с присосками
          const across = (qx * sy - qy * sx) / Math.sqrt(len2) / w
          if (across > 0.1 && s > 0.12) {
            const ring = (s * 10) % 1
            color = ring > 0.3 && ring < 0.75 && s < 0.92 && across > 0.3 ? SUCKER : BELLY
          } else {
            color = skin(0.6 - across * 0.35 - s * 0.25 - (n < 4 ? 0.1 : 0))
          }
          break
        }
      }

      // Перепонка между основаниями щупалец
      const wu = u / 0.95
      const wv = (v - 0.05) / 0.32
      if (wu * wu + wv * wv < 1) color = skin(0.5 - 0.25 * wv - 0.2 * Math.abs(wu))

      const nx = u / rx
      const ny = (v - hy) / ry
      if (nx * nx + ny * ny < 1 && v < 0.12) {
        color = skin(0.62 - 0.32 * nx - 0.42 * ny)
        const hx = (u + 0.36) / 0.2
        const hh = (v + 1.75) / 0.3
        if (hx * hx + hh * hh < 1) color = mix(color, 0xffffff, 0.35)
        const spots = [
          [0.42, -1.55, 0.012],
          [-0.52, -1.05, 0.01],
          [0.1, -1.95, 0.008],
          [0.62, -0.95, 0.007],
        ]
        for (const [su, sv, sr] of spots) {
          if ((u - su) ** 2 + (v - sv) ** 2 < sr) color = mix(color, SKIN_DARK, 0.45)
        }
        if (isHappy) {
          for (const bu of [-0.66, 0.66]) {
            if ((u - bu) ** 2 / 0.03 + (v + 0.22) ** 2 / 0.008 < 1) color = mix(color, BLUSH, 0.7)
          }
        }

        // Глаза по бокам у основания мантии, зрачки горизонтальные
        for (const ex of [-0.44, 0.44]) {
          const ddx = (u - ex) * S
          const ddy = (v + 0.5) * S
          const er = eyeR * S
          const d = Math.hypot(ddx, ddy)
          if (d >= er + 0.4) continue
          if (isHappy) {
            // Довольные глаза-дужки «^ ^»
            color = Math.abs(ddy + 0.6 * er - 0.75 * Math.abs(ddx)) < 0.95 ? PUPIL : skin(0.5)
          } else if (isBlink) {
            color = Math.abs(ddy) < 0.6 ? EYE_RING : skin(0.45)
          } else if (d > er - 0.6) {
            color = EYE_RING
          } else if (Math.abs(ddy) < (isScared ? 1.4 : 0.55) && Math.abs(ddx - look * er) < er * (isScared ? 0.35 : 0.55)) {
            color = PUPIL
          } else if (Math.abs(ddx + er * 0.35) < 0.6 && Math.abs(ddy + er * 0.45) < 0.6) {
            color = 0xffffff
          } else {
            color = EYE_WHITE
          }
        }
      }

      px[py * W + pxx] = color === EMPTY ? EMPTY : tint(color)
    }
  }

  // Контур: край тела темнее
  const out = px.slice()
  for (let py = y0; py < y1; py++) {
    for (let pxx = x0; pxx < x1; pxx++) {
      const c = px[py * W + pxx]
      if (c === EMPTY) continue
      const isEdge =
        pxx === 0 || pxx === W - 1 || py === 0 || py === H - 1 ||
        px[py * W + pxx - 1] === EMPTY || px[py * W + pxx + 1] === EMPTY ||
        px[(py - 1) * W + pxx] === EMPTY || px[(py + 1) * W + pxx] === EMPTY
      if (isEdge) out[py * W + pxx] = mix(c, SKIN_DARK, 0.55)
    }
  }

  const dot = (cx: number, cy: number, rr: number, c: number) => {
    for (let py = Math.floor(cy - rr); py <= cy + rr; py++) {
      for (let pxx = Math.floor(cx - rr); pxx <= cx + rr; pxx++) {
        if (pxx < 0 || py < 0 || pxx >= W || py >= H) continue
        if (Math.hypot(pxx + 0.5 - cx, py + 0.5 - cy) <= rr) out[py * W + pxx] = c
      }
    }
  }

  // Пока Claude думает, над головой всплывают пузырьки
  if (isBusy && !isHappy) {
    const shown = Math.floor(o.tick / 5) % 4
    const bubbles = [
      [1.0, -2.6, 0.14],
      [1.35, -3.0, 0.2],
      [1.85, -3.5, 0.3],
    ]
    bubbles.forEach(([bu, bv, br], n) => {
      if (n < shown) dot(o.x + bu * S, o.y + bv * S, Math.max(0.8, br * S), BUBBLE)
    })
  }

  // Сердечки поднимаются над головой, пока гладят
  if (isHappy) {
    for (let k = 0; k < 3; k++) {
      const life = (o.tick + k * 7) % 21
      const hx = Math.round(o.x + Math.sin((o.tick + k * 11) * 0.3) * S * 0.5 + (k - 1) * S * 0.9) - 2
      const hy2 = Math.round(o.y - 2.6 * S - life * 0.7) - 2
      HEART_SPRITE.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          const qx = hx + c
          const qy = hy2 + r
          if (line[c] === 'X' && qx >= 0 && qy >= 0 && qx < W && qy < H) out[qy * W + qx] = HEART
        }
      })
    }
  }

  // Расходящееся кольцо там, куда кликнули
  if (o.isPointed && isMoving) {
    const rr = 1 + ((o.tick * 0.5) % 5)
    for (let a = 0; a < 28; a++) {
      const qx = Math.floor(o.tx + Math.cos((a / 28) * Math.PI * 2) * rr)
      const qy = Math.floor(o.ty + 1.6 * S + Math.sin((a / 28) * Math.PI * 2) * rr * 0.6)
      if (qx >= 0 && qy >= 0 && qx < W && qy < H && out[qy * W + qx] === EMPTY) out[qy * W + qx] = TARGET
    }
  }

  // Чернильное пятно поверх всего, 10 секунд
  if (o.ink !== null) paintInk(out, o.ink, W, H, S)

  return out
}

const Octopus: ClientModule<Props, Octo> = (props, surface) => {
  const { Box, Text } = surface.elements
  const W = Math.max(12, surface.columns)
  const rowsUsable = Math.max(8, surface.rows - 1 - TOP_ROWS)
  const H = rowsUsable * 2
  const S = scaleFor(W, H)
  const clampX = (v: number) => Math.min(Math.max(v, 1.5 * S), W - 1.5 * S)
  const clampY = (v: number) => Math.min(Math.max(v, 2.8 * S), H - 2.6 * S)
  const start: Octo = {
    x: W / 2, y: H * 0.6, tx: W / 2, ty: H * 0.6, tick: 0, phase: 0, tilt: 0, rest: 30,
    isPointed: false, pet: 0, scared: 0, stroke: 0, ink: null, press: null, hover: null, draft: '',
  }

  if (surface.state === undefined) {
    surface.setState(start)

    surface.every(TICK_MS, () => {
      const o = surface.state
      if (o === undefined) return
      const next = { ...o, tick: o.tick + 1, pet: Math.max(0, o.pet - 1), scared: Math.max(0, o.scared - 1) }
      next.stroke = Math.max(0, o.stroke - 0.4)
      if (o.ink !== null) next.ink = o.ink.ttl <= 1 ? null : { ...o.ink, ttl: o.ink.ttl - 1 }
      const ddx = o.tx - o.x
      const ddy = o.ty - o.y
      const dist = Math.hypot(ddx, ddy)

      if (dist > 0.6) {
        // Испуганный осьминог удирает реактивно — втрое быстрее
        const top = o.scared > 0 ? 3.2 : 1.3
        const speed = Math.min(top, dist * 0.18 + 0.25)
        next.x = o.x + (ddx / dist) * speed
        next.y = o.y + (ddy / dist) * speed
        next.phase = o.phase + 0.55
      } else {
        next.isPointed = false
        next.phase = o.phase + (o.pet > 0 ? 0.3 : 0.16)
        // Пока гладят — сидит смирно
        next.rest = o.pet > 0 ? Math.max(o.rest, 20) : o.rest - 1
        if (next.rest <= 0) {
          next.tx = Math.random() * W
          next.ty = Math.random() * H
          next.rest = 60 + Math.floor(Math.random() * 90)
        }
      }
      const wantTilt = dist > 0.6 ? Math.max(-0.16, Math.min(0.16, ddx / 40)) : 0
      next.tilt = o.tilt + (wantTilt - o.tilt) * 0.15
      next.x = clampX(next.x)
      next.y = clampY(next.y)
      next.tx = clampX(next.tx)
      next.ty = clampY(next.ty)
      surface.setState(next)
    })

    // Болтовня: после клика по панели клавиши приходят сюда, Enter отправляет фразу
    surface.onKey(e => {
      const o = surface.state
      if (o === undefined || e.ctrl || e.meta) return
      if (e.key === 'return') {
        if (o.draft.trim() !== '') surface.post({ talk: o.draft })
        surface.setState({ ...o, draft: '' })
      } else if (e.key === 'backspace' || e.key === 'delete') {
        surface.setState({ ...o, draft: Array.from(o.draft).slice(0, -1).join('') })
      } else if (Array.from(e.key).length === 1) {
        surface.setState({ ...o, draft: (o.draft + e.key).slice(0, 200) })
      } else if (e.key === 'space') {
        surface.setState({ ...o, draft: o.draft + ' ' })
      }
    })

    surface.onPointer(e => {
      const o = surface.state
      if (o === undefined) return
      const x = e.fine?.x ?? e.x + 0.5
      const y = ((e.fine?.y ?? e.y + 0.5) - TOP_ROWS) * 2
      const isOn = isOnBody(o, x, y, S)

      if (e.type === 'down') {
        if (isOn) {
          surface.setState({ ...o, press: { x, y, moved: 0, isOnBody: true }, hover: { x, y } })
        } else {
          surface.setState({ ...o, press: null, tx: clampX(x), ty: clampY(y + 1.2 * S), rest: 50, isPointed: true })
        }

        return
      }

      if (e.type === 'move') {
        // Гладить: водить мышкой по осьминогу, с кнопкой или без
        const last = o.press ?? o.hover
        const step = last === null ? 0 : Math.hypot(x - last.x, y - last.y)
        const press = o.press === null ? null : { ...o.press, x, y, moved: o.press.moved + step }
        const stroke = isOn ? o.stroke + step : o.stroke
        surface.setState({
          ...o,
          press,
          hover: { x, y },
          stroke: Math.min(stroke, 30),
          pet: isOn && stroke > 6 && o.scared === 0 ? 40 : o.pet,
        })

        return
      }

      if (e.type === 'up') {
        const press = o.press
        if (press !== null && press.isOnBody && press.moved < 2) {
          // Клик по осьминогу: чернила и бегство
          const away = Math.random() * Math.PI * 2
          surface.setState({
            ...o,
            press: null,
            pet: 0,
            stroke: 0,
            scared: 30,
            ink: { x: o.x, y: o.y - 0.8 * S, ttl: INK_TICKS, seed: Math.random() * 10 },
            tx: clampX(o.x + Math.cos(away) * W),
            ty: clampY(o.y + Math.sin(away) * H),
            rest: 80,
            isPointed: false,
          })
        } else {
          surface.setState({ ...o, press: null })
        }

        return
      }

      if (e.type === 'leave') surface.setState({ ...o, hover: null })
    })
  }

  const px = paint(surface.state ?? start, props.isBusy, W, H)

  const rows = []
  for (let r = 0; r < rowsUsable; r++) {
    const runs = []
    let c = 0
    while (c < W) {
      const top = px[2 * r * W + c]
      const bottom = px[(2 * r + 1) * W + c]
      let end = c + 1
      while (end < W && px[2 * r * W + end] === top && px[(2 * r + 1) * W + end] === bottom) end++
      const n = end - c
      if (top === EMPTY && bottom === EMPTY) {
        runs.push(<Text key={`${c}`}>{' '.repeat(n)}</Text>)
      } else if (bottom === EMPTY) {
        runs.push(<Text key={`${c}`} color={hex(top)}>{'▀'.repeat(n)}</Text>)
      } else if (top === EMPTY) {
        runs.push(<Text key={`${c}`} color={hex(bottom)}>{'▄'.repeat(n)}</Text>)
      } else {
        runs.push(
          <Text key={`${c}`} color={hex(top)} backgroundColor={hex(bottom)}>
            {'▀'.repeat(n)}
          </Text>,
        )
      }
      c = end
    }
    rows.push(
      <Box key={`r${r}`} flexDirection="row" height={1}>
        {runs}
      </Box>,
    )
  }

  const o = surface.state ?? start
  const speech = props.isThinking
    ? ['…', '.…', '..…'][Math.floor(o.tick / 4) % 3]
    : o.ink !== null && o.ink.ttl > INK_TICKS - 25
      ? 'Ай! Пш-ш-ш!'
      : o.pet > 0 && props.say === ''
        ? 'Мур-р-р… то есть буль-буль ♥'
        : props.say

  return (
    <Box flexDirection="column" width={W}>
      <Box height={TOP_ROWS - 1} width={W} overflow="hidden">
        {speech === '' ? (
          <Text dimColor>Привет! Кликни в панель и печатай — поболтаем.</Text>
        ) : (
          <Text color="cyan" wrap="wrap">
            🐙 {speech}
          </Text>
        )}
      </Box>
      <Text color="yellow" wrap="truncate-start">
        ✎ {o.draft}
        {o.tick % 10 < 5 ? '▏' : ' '}
      </Text>
      {rows}
      <Text dimColor wrap="truncate">v0.2 · клик по мне — чернила · води мышкой — гладить · Enter — сказать</Text>
    </Box>
  )
}

export default Octopus
