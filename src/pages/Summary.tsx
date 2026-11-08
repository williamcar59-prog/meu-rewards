// Página: Resumo — um cartão por conta (sem total consolidado)

import { useState } from 'react'
import { useStore } from '../store'
import { CheckInModal } from '../components/CheckInModal'
import { IconCheck, IconGift, IconPlus } from '../components/Icons'
import { fmtPoints } from '../components/ui'
import {
  currentBalance,
  monthlyReport,
  PIECE_REWARD,
  puzzleProgress,
  redeemSummary,
  streakOf,
} from '../utils/calc'
import { todayISO } from '../utils/dates'
import { PLAN_LABELS } from '../data/rewardsTable'
import { Account } from '../types'

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

  const today = todayISO()

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Resumo</h1>
          <p className="page-sub">Suas contas — cada uma com seu saldo, mês e sequência</p>
        </div>
        <button className="btn" onClick={onGoAccounts}>
          <IconPlus size={16} /> Nova conta
        </button>
      </div>

      {data.accounts.map((acc) => (
        <AccountCard key={acc.id} account={acc} onCheckIn={() => setCheckInFor(acc.id)} />
      ))}

      <p className="muted section-gap">
        Abra <strong>Calendário</strong> para ver o relatório do mês e o histórico de check-ins.
      </p>

      {checkInFor && (
        <CheckInModal accountId={checkInFor} date={today} onClose={() => setCheckInFor(null)} />
      )}
    </div>
  )
}

function AccountCard({
  account,
  onCheckIn,
}: {
  account: Account
  onCheckIn: () => void
}) {
  const { data } = useStore()
  const now = new Date()
  const bal = currentBalance(data, account.id)
  const month = monthlyReport(data, account.id, now.getFullYear(), now.getMonth() + 1)
  const redeems = redeemSummary(data, account.id)
  const puzzle = puzzleProgress(data, account.id)
  const streak = streakOf(data, account.id)

  return (
    <div className="card section-gap">
      <div className="flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span className="account-dot" style={{ background: account.color }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{account.name}</div>
            <div className="muted">
              {account.region} · {PLAN_LABELS[account.plan]}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <span className="pill">🔥 {streak.current} dias</span>
          {streak.todayDone ? (
            <span className="pill green">✓ Hoje</span>
          ) : (
            <button className="btn small primary" onClick={onCheckIn}>
              <IconCheck size={14} /> Check-in
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Saldo</div>
          <div className="stat-value">{fmtPoints(bal)}</div>
          <div className="stat-sub">pontos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ganho do mês</div>
          <div
            className="stat-value"
            style={{ color: month.netEarned >= 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            {month.netEarned >= 0 ? '+' : ''}
            {fmtPoints(month.netEarned)}
          </div>
          <div className="stat-sub">líquido</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resgates</div>
          <div className="stat-value">{fmtPoints(redeems.totalPoints)}</div>
          <div className="stat-sub">{redeems.count} resgate(s)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Peças 🧩</div>
          <div className="stat-value">{puzzle.filled}</div>
          <div className="stat-sub">
            {puzzle.completed > 0
              ? `${puzzle.completed} troféu(s) · +${fmtPoints(puzzle.completed * PIECE_REWARD)} pts`
              : `faltam ${puzzle.toNext} p/ troféu`}
          </div>
        </div>
      </div>
    </div>
  )
}
