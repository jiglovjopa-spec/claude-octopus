import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'octopus',
  component: 'Pane',
  requestId: 'octopus',
  surface: 'terminal',
  props: {
    title: 'Осьминожка',
    isFocused: false,
    bodyColumns: 44,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const CLIENT = { in: 'octopus-v4' }

test('с осьминожкой можно поболтать прямо в панели', async ($, on) => {
  on('command.register', () => ({ value: { command: 'octopus' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 0 }))
  on('clock.after', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Буль! Привет от всех трёх сердец.', usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(PANE)

  expect(await ui.find({ type: 'Text', text: /v0\.3/, ...CLIENT })).toBeTruthy()

  for (const key of ['п', 'р', 'и', 'в', 'е', 'т']) await ui.key({ key, ...CLIENT })
  expect(await ui.find({ type: 'Text', text: /привет/, ...CLIENT })).toBeTruthy()

  await ui.key({ key: 'return', ...CLIENT })
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /трёх сердец/, ...CLIENT })).toBeTruthy()
  await ui.unmount()
})

test('на десктопе: поле ввода, реплика, рисунок откликается на мышь', async ($, on) => {
  on('command.register', () => ({ value: { command: 'octopus' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'осьминог сидит на месте' }))
  on('clock.now', () => ({ value: 1_800_000_000_000 }))
  on('clock.after', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  expect(await ui.find({ type: 'Input', key: 'talk-0' })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Поболтай/ })).toBeTruthy()

  // Рисунок сам откликается на мышь: слой ласки по наведению, чернила по нажатию
  const svg = await ui.find({ type: 'Svg' })
  expect(svg?.props.isInteractive).toBe(true)
  const source = String(svg?.props.source)
  expect(source.includes('class="me"')).toBe(true)
  expect(source.includes('.me:active .inkfx')).toBe(true)
  await ui.unmount()
})

test('на десктопе: кнопки «Погладить» и «Ткнуть»', async ($, on) => {
  on('command.register', () => ({ value: { command: 'octopus' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'осьминог сидит на месте' }))
  on('clock.now', () => ({ value: 1_800_000_000_000 }))
  on('clock.after', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'pet' })
  expect(await ui.find({ type: 'Text', text: /Мур/ })).toBeTruthy()
  expect(JSON.stringify(await ui.drawn()).includes('#ff4f86')).toBe(true)

  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /Пш-ш-ш/ })).toBeTruthy()
  expect(JSON.stringify(await ui.drawn()).includes('url(#ink)')).toBe(true)
  await ui.unmount()
})

test('на десктопе: компас посылает осьминожку в угол', async ($, on) => {
  on('command.register', () => ({ value: { command: 'octopus' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'осьминог сидит на месте' }))
  on('clock.now', () => ({ value: 1_800_000_000_000 }))
  on('clock.after', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'go-2-2' })
  // Таймер прибытия в тесте срабатывает сразу: осьминог уже в правом нижнем углу
  const source = String((await ui.find({ type: 'Svg' }))?.props.source)
  const [, x, y] = source.match(/<g transform="translate\((\d+\.?\d*) (\d+\.?\d*)\)"><ellipse cy="52"/) ?? []
  expect(Number(x)).toBeGreaterThan(343 * 0.7)
  expect(Number(y)).toBeGreaterThan(200)
  await ui.unmount()
})

test('на десктопе: рыбка, очки за чтением, ракушка', async ($, on) => {
  on('command.register', () => ({ value: { command: 'octopus' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'осьминог сидит на месте' }))
  on('clock.now', () => ({ value: 1_800_000_000_000 }))
  on('clock.after', () => ({ deny: 'таймеры не срабатывают' }))
  on('ui.toast', () => ({ value: undefined }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const svg = async () => String((await ui.find({ type: 'Svg' }))?.props.source)

  await ui.press({ key: 'feed' })
  expect(await ui.find({ type: 'Text', text: /Рыбка/ })).toBeTruthy()
  expect((await svg()).includes('#4fb3e8')).toBe(true)

  await $.tool.call({ tool: 'Read', file_path: '/x' })
  expect((await svg()).includes('читаю')).toBe(true)

  await ui.press({ key: 'shell' })
  expect(await ui.find({ type: 'Text', text: /в домике/ })).toBeTruthy()
  expect((await svg()).includes('url(#shell)')).toBe(true)

  await ui.press({ key: 'camo' })
  expect(await ui.find({ type: 'Text', text: /не найдёшь/ })).toBeTruthy()
  await ui.unmount()
})
