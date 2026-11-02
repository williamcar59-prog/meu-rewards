// Tipos e rótulos do plano do Game Pass.
// A pontuação passou a vir do check-in diário (saldo), então a tabela de
// tarefas não é mais usada — apenas o plano fica guardado como referência.

export type GamePassPlan = 'ESSENTIAL' | 'PREMIUM' | 'ULTIMATE' | 'NONE'

export const PLAN_LABELS: Record<GamePassPlan, string> = {
  ESSENTIAL: 'Game Pass Essential',
  PREMIUM: 'Game Pass Premium',
  ULTIMATE: 'Game Pass Ultimate',
  NONE: 'Sem Game Pass',
}
