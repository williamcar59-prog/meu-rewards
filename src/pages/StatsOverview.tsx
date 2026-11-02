// Página: Estatísticas gerais (todas as contas)

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store'
import { balanceSeries, currentBalance, monthlyNetSeries, piecesTotal, redeemSummary, totalBalance, totalMonthlyReport } from '../utils/calc'
import { fmtPoints, StatCard } from '../components/ui'

export function StatsOverviewPage() {
  const { data } = useStore()

  const now = new Date()
  const thisMonth = totalMonthlyReport(data, now.getFullYear(), now.getMonth() + 1)
  const series = balanceSeries(data, null).slice(-60)
  const monthly = monthlyNetSeries(data, 6)
  const redeems = redeemSummary(data, null)

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
        <StatCard label="Peças 🧩" value={`${piecesTotal(data, null)}`} sub="de quebra-cabeça" />
      </div>

      <div className="card section-gap">
        <h3>Ganho líquido por mês (últimos 6)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtPoints(v)} />
            <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']} />
            <Bar dataKey="value" fill="var(--success)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card section-gap">
        <h3>Evolução do saldo somado (60 dias)</h3>
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
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
              <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Saldo']} />
              <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Faça check-ins para ver a evolução do saldo.</p>
        )}
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
