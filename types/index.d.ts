// Путь осьминога в долях панели (0..1); t0 и ms — когда тронулся и сколько ползёт
export type Move = {
  fx: number
  fy: number
  tx: number
  ty: number
  t0: number
  ms: number
  isPointed: boolean
}

declare module 'claude-code' {
  interface PluginState {
    octopus: { isBusy: boolean; move: Move | null }
  }
}
