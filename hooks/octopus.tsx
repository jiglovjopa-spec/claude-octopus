import type { ClientModule } from 'claude-code'

// Пиксельный осьминог для терминала: каждая клетка — два пикселя полублоком «▀»
type Props = { isBusy: boolean }
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
}

const EMPTY = -1
const STEPS = 12
const ORDER = [0, 7, 1, 6, 2, 5, 3, 4]

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

export function paint(o: Octo, isBusy: boolean, W: number, H: number): Int32Array {
  const px = new Int32Array(W * H).fill(EMPTY)
  const S = scaleFor(W, H)
  const isMoving = Math.hypot(o.tx - o.x, o.ty - o.y) > 0.6
  const breath = Math.sin(o.tick * 0.07)
  const bob = Math.sin(o.tick * (isMoving ? 0.6 : 0.18)) * 0.05
  const cos = Math.cos(o.tilt)
  const sin = Math.sin(o.tilt)
  const arms = ORDER.map(i => arm(i, o.phase, isMoving))
  const look = isMoving ? Math.sign(o.tx - o.x) * 0.35 : 0
  const isBlink = o.tick % 55 < 2

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

        // Глаза по бокам у основания мантии, зрачки горизонтальные
        for (const ex of [-0.44, 0.44]) {
          const ddx = (u - ex) * S
          const ddy = (v + 0.5) * S
          const er = eyeR * S
          const d = Math.hypot(ddx, ddy)
          if (d >= er + 0.4) continue
          if (isBlink) {
            color = Math.abs(ddy) < 0.6 ? EYE_RING : skin(0.45)
          } else if (d > er - 0.6) {
            color = EYE_RING
          } else if (Math.abs(ddy) < 0.55 && Math.abs(ddx - look * er) < er * 0.55) {
            color = PUPIL
          } else if (Math.abs(ddx + er * 0.35) < 0.6 && Math.abs(ddy + er * 0.45) < 0.6) {
            color = 0xffffff
          } else {
            color = EYE_WHITE
          }
        }
      }

      px[py * W + pxx] = color
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
  if (isBusy) {
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

  // Расходящееся кольцо там, куда кликнули
  if (o.isPointed && isMoving) {
    const rr = 1 + ((o.tick * 0.5) % 5)
    for (let a = 0; a < 28; a++) {
      const qx = Math.floor(o.tx + Math.cos((a / 28) * Math.PI * 2) * rr)
      const qy = Math.floor(o.ty + 1.6 * S + Math.sin((a / 28) * Math.PI * 2) * rr * 0.6)
      if (qx >= 0 && qy >= 0 && qx < W && qy < H && out[qy * W + qx] === EMPTY) out[qy * W + qx] = TARGET
    }
  }

  return out
}

const Octopus: ClientModule<Props, Octo> = (props, surface) => {
  const { Box, Text } = surface.elements
  const W = Math.max(12, surface.columns)
  const rowsUsable = Math.max(8, surface.rows - 1)
  const H = rowsUsable * 2
  const S = scaleFor(W, H)
  const clampX = (v: number) => Math.min(Math.max(v, 1.5 * S), W - 1.5 * S)
  const clampY = (v: number) => Math.min(Math.max(v, 2.8 * S), H - 2.6 * S)
  const start: Octo = { x: W / 2, y: H * 0.6, tx: W / 2, ty: H * 0.6, tick: 0, phase: 0, tilt: 0, rest: 30, isPointed: false }

  if (surface.state === undefined) {
    surface.setState(start)

    surface.every(90, () => {
      const o = surface.state
      if (o === undefined) return
      const next = { ...o, tick: o.tick + 1 }
      const ddx = o.tx - o.x
      const ddy = o.ty - o.y
      const dist = Math.hypot(ddx, ddy)

      if (dist > 0.6) {
        const speed = Math.min(1.3, dist * 0.18 + 0.25)
        next.x = o.x + (ddx / dist) * speed
        next.y = o.y + (ddy / dist) * speed
        next.phase = o.phase + 0.55
      } else {
        next.isPointed = false
        next.phase = o.phase + 0.16
        next.rest = o.rest - 1
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

    surface.onPointer(e => {
      if (e.type !== 'down') return
      const o = surface.state
      if (o === undefined) return
      const cx = e.fine?.x ?? e.x + 0.5
      const cy = (e.fine?.y ?? e.y + 0.5) * 2
      // Цель — голова под курсором
      surface.setState({ ...o, tx: clampX(cx), ty: clampY(cy + 1.2 * S), rest: 50, isPointed: true })
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

  return (
    <Box flexDirection="column" width={W}>
      {rows}
      <Text dimColor>кликни — приползу</Text>
    </Box>
  )
}

export default Octopus
