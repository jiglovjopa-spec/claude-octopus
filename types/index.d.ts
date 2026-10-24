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

// Настроение осьминога: до каких моментов (мс) его гладят, он напуган и висят чернила
export type Mood = {
  petUntil: number
  scaredUntil: number
  inkUntil: number
  inkAt: number
  inkX: number
  inkY: number
  inkSeed: number
}

// Реплика в болтовне с осьминожкой
export type ChatLine = { who: 'me' | 'octo'; text: string }

declare module 'claude-code' {
  interface PluginState {
    octopus: { isBusy: boolean; move: Move | null; chat: ChatLine[]; isThinking: boolean; mood: Mood }
  }
}
