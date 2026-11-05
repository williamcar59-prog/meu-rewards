// Escala da interface (Configurações → tamanho do texto)
// Guardada por aparelho — cada celular e cada navegador fica do jeito do
// seu dono. Mesmo desenho do projeto Card Games.
//
// `zoom` e não `transform`: o conteúdo reflui como se a tela fosse
// maior/menor, em vez de só crescer e vazar para os lados.
//
// O valor é lido e aplicado em `main.tsx` ANTES do primeiro render —
// senão a tela abriria no tamanho errado e pularia em seguida.

export const ESCALA_MIN = 80
export const ESCALA_MAX = 150
export const ESCALA_PADRAO = 100

const CHAVE = 'meu-rewards_escala'

/** Lê o que ficou salvo. Valor fora da faixa (ou guardado corrompido)
 *  vira o padrão — um número rasgado não pode travar o app em 0%. */
export function lerEscala(): number {
  let v = 0
  try {
    v = Number(localStorage.getItem(CHAVE))
  } catch {
    v = 0 // sem localStorage (modo privado) — seguimos no padrão
  }
  if (!(v >= ESCALA_MIN && v <= ESCALA_MAX)) return ESCALA_PADRAO
  return v
}

/** Aplica na hora, sem gravar. Devolve o valor realmente aplicado,
 *  já limitado aos extremos — é o que a interface deve mostrar. */
export function aplicarEscala(v: number): number {
  const n = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Number(v) || ESCALA_PADRAO))
  document.documentElement.style.zoom = String(n / 100)
  return n
}

/** Aplica e grava. O `try` existe porque o armazenamento pode estar cheio
 *  ou bloqueado: o app continua funcionando, só não lembra do tamanho. */
export function salvarEscala(v: number): number {
  const n = aplicarEscala(v)
  try {
    localStorage.setItem(CHAVE, String(n))
  } catch {
    /* sem espaço — vale só até fechar a aba */
  }
  return n
}
