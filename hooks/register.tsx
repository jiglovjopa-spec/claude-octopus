import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Move } from '../types'
import { octopusSvg } from './draw'

const PANE = 'octopus'
const TITLE = 'Осьминожка'
const SPEED = 110 // точек в секунду
const isBusy = atom({ plugin: 'octopus', key: 'isBusy' } as const, false)
const move = atom({ plugin: 'octopus', key: 'move' } as const, null as Move | null)

// Поля, чтобы осьминог целиком помещался в панели
const PAD = { left: 70, right: 70, top: 100, bottom: 64 }

let size = { width: 320, height: 420 }
let arrival: { cancel: () => void } | null = null
let restUntil = 0

function clampX(f: number) {
  return Math.min(Math.max(f, PAD.left / size.width), 1 - PAD.right / size.width)
}

function clampY(f: number) {
  return Math.min(Math.max(f, PAD.top / size.height), 1 - PAD.bottom / size.height)
}

function where(m: Move, now: number) {
  const p = m.ms <= 0 ? 1 : Math.min(1, Math.max(0, (now - m.t0) / m.ms))
  // Та же кривая, что у keySplines в SVG, приблизительно
  const e = p * p * (3 - 2 * p)

  return { fx: m.fx + (m.tx - m.fx) * e, fy: m.fy + (m.ty - m.fy) * e, p }
}

async function crawlTo($: EngineInterface, tx: number, ty: number, isPointed: boolean) {
  const now = await $.clock.now()
  const m = await read($, move)
  const from = m === null ? { fx: tx, fy: ty } : where(m, now)
  const cx = clampX(tx)
  const cy = clampY(ty)
  const dist = Math.hypot((cx - from.fx) * size.width, (cy - from.fy) * size.height)
  const ms = Math.round((dist / SPEED) * 1000)

  await update($, move, () => ({ fx: from.fx, fy: from.fy, tx: cx, ty: cy, t0: now, ms, isPointed }))
  restUntil = now + ms + 4000 + Math.random() * 8000

  arrival?.cancel()
  // По прибытии перерисовать: щупальца успокаиваются, метка цели исчезает
  arrival = $.clock.after(ms + 60, () => {
    void update($, move, v => (v === null ? v : { ...v, fx: v.tx, fy: v.ty, ms: 0 }))
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'octopus',
      description: 'Открыть панель с осьминожкой',
    })
    void $.ui.open({ id: PANE, title: TITLE })

    // Сам по себе бродит, если его не звать
    $.clock.every(1500, async () => {
      const now = await $.clock.now()
      const m = await read($, move)
      if (m !== null && m.ms > 0 && now < m.t0 + m.ms) return
      if (now < restUntil) return
      await crawlTo($, Math.random(), Math.random(), false)
    })

    return next(e)
  })

  on('command.run', { command: 'octopus' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Осьминожка приполз в панель.' }
  })

  // Пока Claude работает над ответом, над осьминожкой всплывают пузырьки
  on('prompt.submit', async ($, e, next) => {
    await update($, isBusy, () => true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, isBusy, () => false)

    return next(e)
  })

  on('ui.message', async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const data = e.data as { fx?: unknown; fy?: unknown }
    if (typeof data?.fx === 'number' && typeof data?.fy === 'number') {
      await crawlTo($, data.fx, data.fy, true)
    }

    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const busy = await read($, isBusy)

    if (e.surface === 'terminal') {
      const { Client } = $.ui.resolve(e)
      const rows = Math.max(12, (e.viewport?.rows ?? 24) - 3)

      return <Client key="octopus" module="./octopus.tsx" width="100%" height={rows} props={{ isBusy: busy }} />

    }

    const { Box, Svg } = $.ui.resolve(e)
    const cols = e.viewport?.columns ?? 40
    const rows = e.viewport?.rows ?? 24
    size = { width: Math.max(240, Math.round(cols * 7.8)), height: Math.max(300, Math.round((rows - 2) * 18)) }

    const now = await $.clock.now()
    const m = await read($, move)
    const here = m === null ? { fx: 0.5, fy: 0.6, p: 1 } : where(m, now)
    const isMoving = m !== null && m.ms > 0 && here.p < 1
    const target = isMoving && m !== null ? m : { tx: here.fx, ty: here.fy }

    const svg = octopusSvg({
      width: size.width,
      height: size.height,
      x: clampX(here.fx) * size.width,
      y: clampY(here.fy) * size.height,
      tx: target.tx * size.width,
      ty: target.ty * size.height,
      seconds: isMoving && m !== null ? (m.ms * (1 - here.p)) / 1000 : 0,
      isPointed: m?.isPointed ?? false,
      isBusy: busy,
    })

    const picture = <Svg source={svg} alt="Осьминожка" width={size.width} height={size.height} />

    if (e.surface !== 'desktop') return picture
    const { Client } = $.ui.resolve(e)

    return (
      <Box position="relative">
        {picture}
        <Box position="absolute" top={0} left={0} width="100%" height="100%">
          <Client key="pointer" module="./pointer.tsx" width="100%" height="100%" />
        </Box>
      </Box>
    )
  })
}
