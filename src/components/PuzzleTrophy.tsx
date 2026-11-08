// Troféu de quebra-cabeça: imagem dividida em 4×3 blocos (12 peças).
// Cada peça ganha revela um bloco da imagem. Completar 12 = +1.000 pontos.

import { useStore } from '../store'
import { PIECE_GOAL, PIECE_REWARD, puzzleProgress } from '../utils/calc'
import { fmtPoints } from './ui'

const CELLS = 12

/** Troféu mini (sem fundo) — marca no calendário o dia em que o troféu fechou.
 *  Mesmas formas do TrophySvg, com cores chapadas para não colidir os IDs
 *  dos gradientes quando aparece várias vezes na mesma página. */
export function MiniTrophy({ size = 13 }: { size?: number }) {
  const w = Math.round(size * 1.15)
  return (
    <svg
      viewBox="88 62 224 195"
      width={w}
      height={size}
      style={{ display: 'inline-block', verticalAlign: '-2px' }}
      aria-hidden="true"
    >
      {/* alças */}
      <path
        d="M140 78 C104 78 92 100 99 120 C106 140 124 150 142 147"
        fill="none"
        stroke="#e8b93b"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M260 78 C296 78 308 100 301 120 C294 140 276 150 258 147"
        fill="none"
        stroke="#e8b93b"
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* copo */}
      <path
        d="M138 66 H262 V112 C262 154 236 182 200 182 C164 182 138 154 138 112 Z"
        fill="#f7c948"
      />
      <path d="M138 66 H262 V80 H138 Z" fill="#ffffff" opacity="0.35" />
      {/* estrela */}
      <polygon
        points="200,76 208.2,96.7 230.4,98.1 213.3,112.3 218.8,133.9 200,122 181.2,133.9 186.7,112.3 169.6,98.1 191.8,96.7"
        fill="#8a5a00"
        opacity="0.85"
      />
      {/* haste + base */}
      <path d="M191 182 h18 v26 h-18 z" fill="#f7c948" />
      <path d="M174 208 H226 L237 233 H163 Z" fill="#f7c948" />
      <rect x="150" y="233" width="100" height="20" rx="5" fill="#f7c948" />
      <rect x="150" y="233" width="100" height="7" rx="3.5" fill="#ffffff" opacity="0.3" />
    </svg>
  )
}

/** Troféu vetorial (viewBox 400×300 = proporção 4:3). */
function TrophySvg() {
  return (
    <svg
      className="trophy-img"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tp-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="45%" stopColor="#f7c948" />
          <stop offset="100%" stopColor="#d99b12" />
        </linearGradient>
        <linearGradient id="tp-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff6d5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff6d5" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tp-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#2b3f63" />
          <stop offset="100%" stopColor="#16233c" />
        </radialGradient>
      </defs>

      {/* fundo */}
      <rect width="400" height="300" fill="url(#tp-bg)" />
      <circle cx="200" cy="130" r="120" fill="#ffffff" opacity="0.05" />

      {/* alças */}
      <path
        d="M140 78 C104 78 92 100 99 120 C106 140 124 150 142 147"
        fill="none"
        stroke="url(#tp-gold)"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M260 78 C296 78 308 100 301 120 C294 140 276 150 258 147"
        fill="none"
        stroke="url(#tp-gold)"
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* copo */}
      <path
        d="M138 66 H262 V112 C262 154 236 182 200 182 C164 182 138 154 138 112 Z"
        fill="url(#tp-gold)"
      />
      <path
        d="M138 66 H262 V80 H138 Z"
        fill="#ffffff"
        opacity="0.35"
      />
      <path
        d="M150 74 C150 74 156 120 178 150"
        fill="none"
        stroke="url(#tp-shine)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* estrela */}
      <polygon
        points="200,76 208.2,96.7 230.4,98.1 213.3,112.3 218.8,133.9 200,122 181.2,133.9 186.7,112.3 169.6,98.1 191.8,96.7"
        fill="#8a5a00"
        opacity="0.85"
      />

      {/* haste */}
      <path d="M191 182 h18 v26 h-18 z" fill="url(#tp-gold)" />

      {/* base */}
      <path d="M174 208 H226 L237 233 H163 Z" fill="url(#tp-gold)" />
      <rect x="150" y="233" width="100" height="20" rx="5" fill="url(#tp-gold)" />
      <rect x="150" y="233" width="100" height="7" rx="3.5" fill="#ffffff" opacity="0.3" />
    </svg>
  )
}

export function PuzzleTrophy({ accountId }: { accountId: string }) {
  const { data } = useStore()
  const p = puzzleProgress(data, accountId)
  const account = data.accounts.find((a) => a.id === accountId)

  return (
    <div className="card">
      <div className="flex-between">
        <h3 className="mt-0 mb-0">Troféu de peças</h3>
        <span className="pill">
          🧩 {p.filled} / {PIECE_GOAL}
        </span>
      </div>

      <div className="trophy-wrap" role="img" aria-label={`${p.filled} de ${PIECE_GOAL} peças reveladas`}>
        <TrophySvg />
        <div className="trophy-grid">
          {Array.from({ length: CELLS }).map((_, i) => {
            const open = i < p.filled
            return (
              <div key={i} className={`trophy-cell${open ? ' open' : ' locked'}`}>
                {!open && <span className="trophy-lock">🧩</span>}
              </div>
            )
          })}
        </div>
        {p.isComplete && (
          <div className="trophy-badge">+{fmtPoints(PIECE_REWARD)}</div>
        )}
      </div>

      <div className="trophy-meta">
        {p.isComplete ? (
          <span className="pill green">
            Troféu completo! +{fmtPoints(PIECE_REWARD)} pontos
          </span>
        ) : (
          <span className="muted">
            Faltam <strong>{p.toNext}</strong> peça(s) para o troféu (+{fmtPoints(PIECE_REWARD)} pts)
          </span>
        )}
        {p.completed > 0 && (
          <span className="muted">
            {p.completed} troféu(s) já ganho(s) · +{fmtPoints(p.completed * PIECE_REWARD)} pts
          </span>
        )}
      </div>

      <p className="muted" style={{ marginBottom: 0 }}>
        Cada uma das 4 atividades do Bing dá 1 peça (até 4/semana). Se alguma bugar, conte a peça
        manualmente no check-in do dia{account ? ` de ${account.name}` : ''}.
      </p>
    </div>
  )
}
