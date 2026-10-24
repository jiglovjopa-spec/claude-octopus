import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ChatLine, Mood, Move } from '../types'
import { octopusSvg } from './draw'

const PANE = 'octopus'
const TITLE = 'Осьминожка'
const SPEED = 110 // точек в секунду
const isBusy = atom({ plugin: 'octopus', key: 'isBusy' } as const, false)
const move = atom({ plugin: 'octopus', key: 'move' } as const, null as Move | null)
const chat = atom({ plugin: 'octopus', key: 'chat' } as const, [] as ChatLine[])
const isThinking = atom({ plugin: 'octopus', key: 'isThinking' } as const, false)
const mood = atom({ plugin: 'octopus', key: 'mood' } as const, {
  petUntil: 0,
  scaredUntil: 0,
  inkUntil: 0,
  inkAt: 0,
  inkX: 0,
  inkY: 0,
  inkSeed: 0,
} as Mood)
const INK_MS = 10000
const COMPASS = [
  ['↖', '↑', '↗'],
  ['←', '•', '→'],
  ['↙', '↓', '↘'],
]
const SPOTS = [0.15, 0.5, 0.85]
const SPOTS_Y = [0.25, 0.55, 0.85]

const PERSONA = [
  'Ты — Осьминожка, маленький пиксельный осьминог. Живёшь в панели рядом с чатом в приложении Claude,',
  'ползаешь по ней, пускаешь чернила, когда тебя тыкают, и розовеешь, когда гладят.',
  'Отвечай по-русски, как живой осьминог-питомец: тепло, игриво, с морскими и осьминожьими подробностями',
  '(восемь щупалец, присоски, три сердца, голубая кровь, умение менять цвет). Иногда «буль».',
  'Строго одно-два коротких предложения, не больше 150 символов. Без списков и разметки.',
].join(' ')

async function talk($: EngineInterface, text: string) {
  const said = text.trim()
  if (said === '' || (await read($, isThinking))) return
  const history = [...(await read($, chat)), { who: 'me' as const, text: said }].slice(-12)
  await update($, chat, () => history)
  await update($, isThinking, () => true)

  const prompt = history.map(l => `${l.who === 'me' ? 'Человек' : 'Осьминожка'}: ${l.text}`).join('\n') + '\nОсьминожка:'
  const result = await $.model.complete({ model: 'haiku', system: PERSONA, prompt, maxTokens: 120 })
  const answer = result.isAnswered ? result.text.trim().replace(/^Осьминожка:\s*/, '') : 'Буль… что-то я задумался. Скажи ещё раз?'

  await update($, chat, list => [...list, { who: 'octo' as const, text: answer }].slice(-12))
  await update($, isThinking, () => false)
}

// Поля, чтобы осьминог целиком помещался в панели
const PAD = { left: 70, right: 70, top: 100, bottom: 64 }

let size = { width: 320, height: 420 }
let arrival: { cancel: () => void } | null = null
let restUntil = 0
let hover: { fx: number; fy: number } | null = null
let stroke = 0

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

async function crawlTo($: EngineInterface, tx: number, ty: number, isPointed: boolean, speed = SPEED) {
  const now = await $.clock.now()
  const m = await read($, move)
  const from = m === null ? { fx: tx, fy: ty } : where(m, now)
  const cx = clampX(tx)
  const cy = clampY(ty)
  const dist = Math.hypot((cx - from.fx) * size.width, (cy - from.fy) * size.height)
  const ms = Math.round((dist / speed) * 1000)

  await update($, move, () => ({ fx: from.fx, fy: from.fy, tx: cx, ty: cy, t0: now, ms, isPointed }))
  restUntil = now + ms + 4000 + Math.random() * 8000

  arrival?.cancel()
  // По прибытии перерисовать: щупальца успокаиваются, метка цели исчезает
  arrival = $.clock.after(ms + 60, () => {
    void update($, move, v => (v === null ? v : { ...v, fx: v.tx, fy: v.ty, ms: 0 }))
  })
}

// Где осьминог сейчас, в долях панели
async function position($: EngineInterface) {
  const now = await $.clock.now()
  const m = await read($, move)
  const here = m === null ? { fx: 0.5, fy: 0.6 } : where(m, now)

  return { now, fx: clampX(here.fx), fy: clampY(here.fy) }
}

// Попадает ли точка в осьминога: голова над точкой (x, y), щупальца под ней
function isOnBody(here: { fx: number; fy: number }, fx: number, fy: number) {
  const dx = (fx - here.fx) * size.width
  const dy = (fy - here.fy) * size.height

  return Math.abs(dx) < 50 && dy > -80 && dy < 55
}

// Перерисовать, когда настроение (ласка, испуг, чернила) истечёт
function redrawAt($: EngineInterface, ms: number) {
  $.clock.after(ms + 50, () => {
    void update($, mood, v => ({ ...v }))
  })
}

async function pointer($: EngineInterface, type: string, fx: number, fy: number) {
  const here = await position($)
  const isOn = isOnBody(here, fx, fy)

  if (type === 'tap' && !isOn) {
    await crawlTo($, fx, fy + 30 / size.height, true)

    return
  }

  if (type === 'move') {
    const step = hover === null ? 0 : Math.hypot((fx - hover.fx) * size.width, (fy - hover.fy) * size.height)
    hover = { fx, fy }
    stroke = isOn ? Math.min(400, stroke + step) : Math.max(0, stroke - 10)
    const m = await read($, mood)
    // Поводил мышкой по осьминогу — погладил
    if (isOn && stroke > 60 && here.now >= m.scaredUntil && here.now >= m.petUntil - 2500) await pet($)

    return
  }

  if (type === 'tap') await poke($)
}

// Погладили: 3 секунды розовеет, жмурится и сидит смирно
async function pet($: EngineInterface) {
  const now = await $.clock.now()
  const m = await read($, mood)
  if (now < m.scaredUntil) return
  await update($, mood, v => ({ ...v, petUntil: now + 3000 }))
  restUntil = Math.max(restUntil, now + 6000)
  redrawAt($, 3000)
}

// Ткнули: чернила на 10 секунд и бегство
async function poke($: EngineInterface) {
  const here = await position($)
  stroke = 0
  await update($, mood, () => ({
    petUntil: 0,
    scaredUntil: here.now + 3000,
    inkUntil: here.now + INK_MS,
    inkAt: here.now,
    inkX: here.fx,
    inkY: here.fy - 30 / size.height,
    inkSeed: Math.random() * 10,
  }))
  const away = Math.random() * Math.PI * 2
  await crawlTo($, here.fx + Math.cos(away), here.fy + Math.sin(away), false, SPEED * 3)
  restUntil = here.now + 12000
  redrawAt($, 3000)
  redrawAt($, INK_MS)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'octopus',
      description: 'Открыть панель с осьминожкой',
    })
    void $.ui.open({ id: PANE, title: TITLE })
    // После перезагрузки мода перерисовать уже открытую панель новым кодом
    $.ui.invalidate('ui.render')
    $.ui.toast('🐙 Осьминожка 0.2 загружен: поболтай, погладь, ткни — будут чернила')

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
    $.ui.invalidate('ui.render')

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
    const data = e.data as { type?: unknown; fx?: unknown; fy?: unknown; talk?: unknown }
    if (typeof data?.talk === 'string') {
      void talk($, data.talk)
    } else if (typeof data?.fx === 'number' && typeof data?.fy === 'number') {
      await pointer($, typeof data.type === 'string' ? data.type : 'down', data.fx, data.fy)
    }

    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const busy = await read($, isBusy)

    if (e.surface === 'terminal') {
      const { Client } = $.ui.resolve(e)
      // Высота самой панели, а не всего окна; текст набирается прямо в области осьминожки
      const body = e.props.scroll?.bodyRows ?? (e.viewport?.rows ?? 24) - 4
      const rows = Math.max(12, body - 1)
      const lines = await read($, chat)
      const last = lines[lines.length - 1]
      const say = last?.who === 'octo' ? last.text : ''
      const thinking = await read($, isThinking)

      return (
        <Client
          key="octopus-v4"
          module="./octopus.tsx"
          width="100%"
          height={rows}
          props={{ isBusy: busy, say, isThinking: thinking }}
        />
      )

    }

    const { Box, Svg, Text } = $.ui.resolve(e)
    // Размер самой панели; сверху остаётся место под реплику и поле ввода
    const cols = e.props.bodyColumns ?? e.viewport?.columns ?? 40
    const rows = (e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 24) - 11
    size = { width: Math.max(240, Math.round(cols * 7.8)), height: Math.max(280, Math.round(rows * 18)) }

    const now = await $.clock.now()
    const m = await read($, move)
    const md = await read($, mood)
    const here = m === null ? { fx: 0.5, fy: 0.6, p: 1 } : where(m, now)
    const isMoving = m !== null && m.ms > 0 && here.p < 1
    const target = isMoving && m !== null ? m : { tx: here.fx, ty: here.fy }
    const isHappy = now < md.petUntil && now >= md.scaredUntil
    const isScared = now < md.scaredUntil
    const hasInk = now < md.inkUntil

    const lines = await read($, chat)
    const last = lines[lines.length - 1]
    const thinking = await read($, isThinking)
    const say = thinking
      ? '…'
      : now - md.inkAt < 2500
        ? 'Ай! Пш-ш-ш! 💦'
        : isHappy
          ? 'Мур-р-р… то есть буль-буль ♥'
          : last?.who === 'octo'
            ? last.text
            : 'Привет! Поболтай со мной, погладь мышкой — только не тыкай, а то брызну чернилами.'

    const svg = octopusSvg({
      isInteractive: e.surface !== 'mobile',
      inkSeed: Math.floor(now / 60000) % 97,
      isHappy,
      isScared,
      ink: hasInk
        ? {
            x: md.inkX * size.width,
            y: md.inkY * size.height,
            seconds: (md.inkUntil - now) / 1000,
            seed: md.inkSeed,
            isFresh: now - md.inkAt < 400,
          }
        : null,
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

    // На десктопе рисунок интерактивный: сам откликается на наведение и нажатие (CSS, без скриптов)
    const isTouchable = e.surface !== 'mobile'
    const picture = (
      <Svg source={svg} alt="Осьминожка" width={size.width} height={size.height} isInteractive={isTouchable || undefined} />
    )
    const speech = (
      <Text color="cyan" wrap="wrap">
        🐙 {say}
      </Text>
    )

    if (e.surface === 'mobile') {
      return (
        <Box flexDirection="column">
          {speech}
          {picture}
        </Box>
      )
    }

    const { Input } = $.ui.resolve(e)
    const field = (
      <Input
        key={`talk-${lines.length}`}
        placeholder="Скажи осьминожке…"
        submitLabel="Сказать"
        onSubmit={value => talk($, value)}
      />
    )
    const { Button } = $.ui.resolve(e)
    // Кнопки на случай, если клики по рисунку не доходят
    // Компас: куда ползти — в ту часть панели, куда указывает стрелка
    const compass = COMPASS.map((line, row) => (
      <Box key={`go-${row}`} flexDirection="row" gap={1}>
        {line.map((arrow, col) => (
          <Button
            key={`go-${row}-${col}`}
            label={arrow}
            onPress={() => crawlTo($, SPOTS[col], SPOTS_Y[row], true)}
          />
        ))}
      </Box>
    ))
    const actions = (
      <Box flexDirection="row" gap={3}>
        <Box flexDirection="column" gap={1}>
          <Button key="poke" label="👉 Ткнуть" onPress={() => poke($)} />
          <Button key="pet" label="✋ Погладить" onPress={() => pet($)} />
        </Box>
        <Box flexDirection="column">{compass}</Box>
      </Box>
    )

    return (
      <Box flexDirection="column">
        {field}
        {actions}
        {speech}
        {picture}
      </Box>
    )
  })
}
