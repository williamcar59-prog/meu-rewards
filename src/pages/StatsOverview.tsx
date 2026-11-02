// Página: Estatísticas gerais (todas as contas)

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store'
import { balanceSeries, currentBalance, monthlyNetSeries, PIECE_GOAL, puzzleProgress, redeemSummary, totalBalance, totalMonthlyReport } from '../utils/calc'
import { fmtPoints, StatCard } from '../components/ui'

export function StatsOverviewPage() {
  const { data } = useStore()

  const now = new Date()
  const thisMonth = totalMonthlyReport(data, now.getFullYear(), now.getMonth() + 1)
  const series = balanceSeries(data, null).slice(-60)
  // mesma série, mas com o saldo visível apenas nos dias que houve resgate (ponto vermelho)
  const markSeries = series.map((p) => ({ ...p, mark: p.redeemed > 0 ? p.total : null }))
  const monthly = monthlyNetSeries(data, 6)
  const redeems = redeemSummary(data, null)
  const statsPuzzle = puzzleProgress(data, null)

  const textStyle = 'var(--text-secondary)'
  const tipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  }

  return (
    <div>
      <h1 className="page-title">Estatísticas</h1>
      <p className="page-sub">Desempenho consolidado de todas as contas</p>

      <div className="grid grid-4">
        <StatCard label="Ganho do mês" value={`+${fmtPoints(thisMonth.netEarned)}`} sub="líquido" />
        <StatCard label="Saldo total" value={fmtPoints(totalBalance(data))} sub="pontos" />
        <StatCard label="Resgates" value={`${redeems.count}`} sub={`${fmtPoints(redeems.totalPoints)} pts`} />
        <StatCard
          label="Peças 🧩"
          value={`${statsPuzzle.total}`}
          sub={`troféu ${statsPuzzle.filled}/${PIECE_GOAL} · ${statsPuzzle.completed} completo(s)`}
        />
      </div>

      <div className="card section-gap">
        <h3>Ganho líquido e resgates por mês (últimos 6)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtPoints(v)} />
            <Tooltip
              contentStyle={tipStyle}
              formatter={(v: number | string, name: string) => [fmtPoints(Number(v)), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" name="Ganho líquido" fill="var(--success)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="redeemed" name="Resgates" fill="var(--danger)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="muted" style={{ marginBottom: 0 }}>
          Verde = pontos obtidos no mês · Vermelho = pontos usados (resgatados)
        </p>
      </div>

      <div className="card section-gap">
        <h3>Evolução do saldo e resgates (60 dias)</h3>
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={markSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)}
                stroke={textStyle}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtPoints(v)} />
              <Tooltip contentStyle={tipStyle} formatter={(v: number | string, name: string) => [fmtPoints(Number(v)), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="total"
                name="Saldo"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mark"
                name="Resgate"
                stroke="none"
                connectNulls={false}
                dot={{ r: 5, fill: 'var(--danger)', stroke: 'var(--bg-card)', strokeWidth: 1.5 }}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Faça check-ins para ver a evolução do saldo.</p>
        )}
        <p className="muted" style={{ marginBottom: 0 }}>
          Os pontos vermelhos marcam os dias em que você usou pontos.
        </p>
      </div>

      <div className="card section-gap">
        <h3>Saldo por conta</h3>
        {data.accounts.map((acc) => (
          <div key={acc.id} className="entry">
            <span className="account-dot" style={{ background: acc.color }} />
            <span className="entry-label">{acc.name}</span>
            <span className="entry-points pos">{fmtPoints(currentBalance(data, acc.id))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
