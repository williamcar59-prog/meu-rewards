// Tabela de pontuação oficial do Microsoft Rewards
// Fonte: TABELA_PONTUAÇÃO_REWARDS.xlsx
//
// - Tarefas do app Xbox e bônus semanais variam pelo PLANO do Game Pass.
// - Tarefas do app Bing variam pelo DIA do ciclo de 7 dias (sequência).

export type GamePassPlan = 'ESSENTIAL' | 'PREMIUM' | 'ULTIMATE' | 'NONE'

export const PLAN_LABELS: Record<GamePassPlan, string> = {
  ESSENTIAL: 'Game Pass Essential',
  PREMIUM: 'Game Pass Premium',
  ULTIMATE: 'Game Pass Ultimate',
  NONE: 'Sem Game Pass',
}

/** Ordem das colunas [Essential, Premium, Ultimate] na planilha */
type PlanTriple = [number, number, number]

export type TaskGroup = 'xbox' | 'bing' | 'weekly'

export interface BuiltinTaskDef {
  id: string
  name: string
  group: TaskGroup
  frequency: 'daily' | 'weekly'
}

// ----- pontos por plano (Xbox e bônus semanais) -----
const XBOX_POINTS: Record<string, PlanTriple> = {
  'xbox.jewel': [5, 5, 10],
  'xbox.pc': [10, 10, 20],
  'xbox.console': [10, 10, 20],
  'xbox.use_app': [8, 8, 16],
  'xbox.gamepass_game': [0, 10, 20],
}

const WEEKLY_POINTS: Record<string, PlanTriple> = {
  'weekly.pc': [110, 130, 260],
  'weekly.console': [110, 130, 260],
  'weekly.gamepass': [0, 350, 700],
}

// ----- pontos por dia do ciclo (Bing) — índice 0..6 = dia 1..7 -----
const BING_POINTS: Record<string, number[]> = {
  'bing.checkin': [5, 5, 5, 5, 5, 15, 50],
  'bing.search1': [3, 3, 3, 3, 3, 3, 100],
  'bing.dailyset': [0, 0, 0, 0, 0, 0, 100],
  'bing.visual': [5, 5, 5, 5, 5, 5, 100],
  'bing.defined': [30, 30, 30, 30, 30, 30, 30],
  'bing.search_to_earn': [60, 60, 60, 60, 60, 60, 60],
  'bing.read_to_earn': [30, 30, 30, 30, 30, 30, 30],
}

/** Catálogo completo de tarefas oficiais (ids estáveis) */
export const BUILTIN_TASKS: BuiltinTaskDef[] = [
  { id: 'xbox.jewel', name: 'Jewel', group: 'xbox', frequency: 'daily' },
  { id: 'xbox.pc', name: 'PC', group: 'xbox', frequency: 'daily' },
  { id: 'xbox.console', name: 'Console', group: 'xbox', frequency: 'daily' },
  { id: 'xbox.use_app', name: 'Usar aplicativo Xbox', group: 'xbox', frequency: 'daily' },
  { id: 'xbox.gamepass_game', name: 'Jogo do Xbox Game Pass', group: 'xbox', frequency: 'daily' },
  { id: 'bing.checkin', name: 'Check-in', group: 'bing', frequency: 'daily' },
  { id: 'bing.search1', name: 'Pesquisar 1 vez', group: 'bing', frequency: 'daily' },
  { id: 'bing.dailyset', name: 'Série de conjunto diário', group: 'bing', frequency: 'daily' },
  { id: 'bing.visual', name: 'Pesquisa visual', group: 'bing', frequency: 'daily' },
  { id: 'bing.defined', name: 'Definido diariamente', group: 'bing', frequency: 'daily' },
  { id: 'bing.search_to_earn', name: 'Pesquisar para ganhar', group: 'bing', frequency: 'daily' },
  { id: 'bing.read_to_earn', name: 'Ler para ganhar', group: 'bing', frequency: 'daily' },
  { id: 'weekly.pc', name: 'Bônus semanal PC', group: 'weekly', frequency: 'weekly' },
  { id: 'weekly.console', name: 'Bônus semanal Console', group: 'weekly', frequency: 'weekly' },
  { id: 'weekly.gamepass', name: 'Bônus semanal Game Pass', group: 'weekly', frequency: 'weekly' },
]

const GROUP_LABELS: Record<TaskGroup, string> = {
  xbox: 'App Xbox',
  bing: 'App Bing',
  weekly: 'Bônus semanais',
}

export function groupLabel(group: TaskGroup): string {
  return GROUP_LABELS[group]
}

export function builtinGroup(builtinId: string): TaskGroup | null {
  const def = BUILTIN_TASKS.find((b) => b.id === builtinId)
  return def ? def.group : null
}

function planIndex(plan: GamePassPlan): number {
  if (plan === 'ULTIMATE') return 2
  if (plan === 'PREMIUM') return 1
  return 0 // ESSENTIAL e NONE usam a coluna base
}

/** Pontos de uma tarefa oficial dado o plano e o dia do ciclo (1..7) */
export function builtinPoints(builtinId: string, plan: GamePassPlan, cycleDay: number): number {
  if (XBOX_POINTS[builtinId]) return XBOX_POINTS[builtinId][planIndex(plan)]
  if (WEEKLY_POINTS[builtinId]) return WEEKLY_POINTS[builtinId][planIndex(plan)]
  if (BING_POINTS[builtinId]) {
    const arr = BING_POINTS[builtinId]
    const day = Math.min(Math.max(cycleDay, 1), 7)
    return arr[day - 1]
  }
  return 0
}

/** Soma máxima teórica do dia (tarefas diárias) para o plano/dia dados */
export function maxDailyPoints(
  tasks: { builtin?: string; points: number; frequency: string; enabled: boolean }[],
  plan: GamePassPlan,
  cycleDay: number,
): number {
  let total = 0
  for (const t of tasks) {
    if (!t.enabled || t.frequency !== 'daily') continue
    total += t.builtin
      ? builtinPoints(t.builtin, plan, cycleDay)
      : t.points
  }
  return total
}
