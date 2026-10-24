import type { ClientModule } from 'claude-code'

// Прозрачный слой поверх рисунка: ловит клик и отдаёт его долями ширины и высоты
const Pointer: ClientModule<null, true> = (_props, surface) => {
  const { Box } = surface.elements

  if (surface.state === undefined) {
    surface.setState(true)
    surface.onPointer(e => {
      if (e.type !== 'down' || surface.columns === 0 || surface.rows === 0) return
      surface.post({
        fx: ((e.fine?.x ?? e.x + 0.5)) / surface.columns,
        fy: ((e.fine?.y ?? e.y + 0.5)) / surface.rows,
      })
    })
  }

  return <Box width={surface.columns} height={surface.rows} />
}

export default Pointer
