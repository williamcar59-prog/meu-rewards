// Página: Resumo geral — saldos, ganho do mês e check-in rápido

import { useState } from 'react'
import { useStore } from '../store'
import { CheckInModal } from '../components/CheckInModal'
import { IconCheck, IconGift } from '../components/Icons'
import { fmtPoints, StatCard } from '../components/ui'
import {
  checkedInOn,
  currentBalance,
  PIECE_GOAL,
  puzzleProgress,
  redeemSummary,
  streakOf,
  totalBalance,
  totalMonthlyReport,
} from '../utils/calc'
import { todayISO } from '../utils/dates'
import { PLAN_LABELS } from '../data/rewardsTable'

export function SummaryPage({ onGoAccounts }: { onGoAccounts: () => void }) {
  const { data } = useStore()
  const [checkInFor, setCheckInFor] = useState<string | null>(null)

  if (data.accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Resumo</h1>
        <div className="card">
          <div className="empty">
            <IconGift size={44} />
            <h3>Bem-vindo ao Meu Rewards!</h3>
            <p>Crie sua primeira conta para começar a registrar o saldo todos os dias.</p>
            <button className="btn primary" onClick={onGoAccounts}>
              Criar conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  const now = new Date()
  const month = totalMonthlyReport(data, now.getFullYear(), now.getMonth() + 1)
  const redeems = redeemSummary(data, null)
  const puzzle = puzzleProgress(data, null)
  const today = todayISO()

  return (
    <div>
      <h1 className="page-title">Resumo</h1>
      <p className="page-sub">Visão consolidada de todas as suas contas</p>

      <div className="grid grid-4">
        <StatCard label="Saldo total" value={fmtPoints(totalBalance(data))} sub="pontos somados" />
        <StatCard
          label="Ganho do mês"
          value={`+${fmtPoints(month.netEarned)}`}
          sub="líquido, mesmo resgatando"
        />
        <StatCard label="Resgatado" value={fmtPoints(redeems.totalPoints)} sub={`${redeems.count} resgate(s)`} />
        <StatCard
          label="Peças 🧩"
          value={`${puzzle.total}`}
          sub={`troféu ${puzzle.filled}/${PIECE_GOAL} · ${puzzle.completed} completo(s)`}
        />
      </div>

      <div className="card section-gap">
        <h3>Contas</h3>
        {data.accounts.map((acc) => {
          const doneToday = checkedInOn(data, acc.id, today)
          const streak = streakOf(data, acc.id)
          return (
            <div key={acc.id} className="entry">
              <span className="account-dot" style={{ background: acc.color }} />
              <span className="entry-label">
                <strong>{acc.name}</strong>
                <span className="muted">
                  {' '}
                  · {PLAN_LABELS[acc.plan]}
                  {streak.current > 0 && <> · 🔥 {streak.current} dias</>}
                </span>
              </span>
              <span className="entry-points pos">{fmtPoints(currentBalance(data, acc.id))}</span>
              {doneToday ? (
                <span className="pill green">✓ Hoje</span>
              ) : (
                <button className="btn small primary" onClick={() => setCheckInFor(acc.id)}>
                  <IconCheck size={14} /> Check-in
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="muted">
        Abra <strong>Calendário</strong> para ver o relatório do mês e o histórico de check-ins.
      </p>

      {checkInFor && (
        <CheckInModal accountId={checkInFor} date={today} onClose={() => setCheckInFor(null)} />
      )}
    </div>
  )
}
