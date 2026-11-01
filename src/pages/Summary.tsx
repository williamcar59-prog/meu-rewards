// Página: Resumo Geral (todas as contas)

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store'
import {
  balanceSeries,
  balanceOf,
  earnSumMonth,
  earnSumToday,
  earnSumWeek,
  goalForecast,
  monthlyEarns,
  redeemSummary,
  streakOf,
  totalBalance,
} from '../utils/calc'
import { fmtDateShort, fmtPoints, StatCard } from '../components/ui'
import { PLAN_LABELS } from '../data/rewardsTable'
import { IconGift } from '../components/Icons'

export function SummaryPage({ onGoAccounts }: { onGoAccounts: () => void }) {
  const { data } = useStore()

  if (data.accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Resumo</h1>
        <div className="card">
          <div className="empty">
            <IconGift size={44} />
            <h3>Bem-vindo ao Meu Rewards!</h3>
            <p>Crie sua primeira conta de Rewards para começar a contabilizar seus pontos.</p>
            <button className="btn primary" onClick={onGoAccounts}>
              Criar conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  const total = totalBalance(data)
  const today = earnSumToday(data, null)
  const week = earnSumWeek(data, null)
  const month = earnSumMonth(data, null)
  const redeems = redeemSummary(data, null)

  const series = balanceSeries(data, null).slice(-30)
  const monthly = monthlyEarns(data, null, 6)

  return (
    <div>
      <h1 className="page-title">Resumo</h1>
      <p className="page-sub">Visão consolidada de todas as suas contas</p>

      <div className="grid grid-4">
        <StatCard
          label="Saldo total"
          value={fmtPoints(total)}
          sub="pontos somados"
        />
        <StatCard label="Ganho hoje" value={fmtPoints(today)} sub="pontos" />
        <StatCard label="Esta semana" value={fmtPoints(week)} sub="segunda a hoje" />
        <StatCard
          label="Este mês"
          value={fmtPoints(month)}
          sub={`resgatado: ${fmtPoints(redeems.totalPoints)} pts`}
        />
      </div>

      <div className="grid grid-2 section-gap">
        <div className="card">
          <h3>Saldo total — últimos 30 dias</h3>
          {series.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateShort}
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtPoints(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                  formatter={(v: number | string) => [fmtPoints(Number(v)), 'Saldo']}
                  labelFormatter={(l) => String(l).split('-').reverse().join('/')}
                />
                <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">Registre alguns lançamentos para ver o gráfico.</p>
          )}
        </div>

        <div className="card">
          <h3>Ganhos por mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtPoints(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
                formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']}
              />
              <Bar dataKey="value" fill="var(--success)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card section-gap">
        <h3>Contas</h3>
        {data.accounts.map((acc) => {
          const bal = balanceOf(data, acc.id)
          const fc = goalForecast(data, acc)
          const streak = streakOf(data, acc.id)
          return (
            <div key={acc.id} className="entry">
              <span className="account-dot" style={{ background: acc.color }} />
              <div className="entry-label">
                <strong>{acc.name}</strong>{' '}
                <span className="muted">
                  · {acc.region} · {PLAN_LABELS[acc.plan]} · {streak.current > 0 ? `🔥 ${streak.current} dias` : 'sem streak'}
                </span>
              </div>
              {fc && (
                <span className={`pill${fc.done ? ' green' : ''}`}>
                  {fc.done
                    ? 'Meta atingida! 🎉'
                    : `${Math.round(fc.progress * 100)}% · ${fmtPoints(fc.remaining)} pts faltam`}
                </span>
              )}
              <span className="entry-points pos">{fmtPoints(bal)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
