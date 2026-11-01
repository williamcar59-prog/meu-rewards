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
import { avgDailyEarn, balanceSeries, categoryEarns, monthlyEarns, redeemSummary } from '../utils/calc'
import { addDays } from '../utils/dates'
import { fmtPoints, StatCard } from '../components/ui'

export function StatsOverviewPage() {
  const { data } = useStore()

  const series = balanceSeries(data, null).slice(-60)
  const cats = categoryEarns(data, null, addDays(today(), -30))
  const monthly = monthlyEarns(data, null, 6)
  const redeems = redeemSummary(data, null)

  const avg7 =
    data.accounts.reduce((s, a) => s + avgDailyEarn(data, a.id, 7), 0)
  const avg30 =
    data.accounts.reduce((s, a) => s + avgDailyEarn(data, a.id, 30), 0)

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
        <StatCard label="Média diária (7 dias)" value={`${avg7.toFixed(1)}`} sub="pontos/dia somando contas" />
        <StatCard label="Média diária (30 dias)" value={`${avg30.toFixed(1)}`} sub="pontos/dia somando contas" />
        <StatCard label="Categorias (30 dias)" value={`${cats.length}`} sub="fontes de pontos distintas" />
        <StatCard label="Resgates" value={`${redeems.count}`} sub={`${fmtPoints(redeems.totalPoints)} pts no total`} />
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
              <YAxis
                stroke={textStyle}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtPoints(v)}
              />
              <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Saldo']} />
              <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Sem dados suficientes ainda.</p>
        )}
      </div>

      <div className="grid grid-2 section-gap" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Ganhos por mês (somado)</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke={textStyle}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtPoints(v)}
              />
              <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']} />
              <Bar dataKey="value" fill="var(--success)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Ganhos por categoria (30 dias)</h3>
          {cats.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={cats} layout="vertical" margin={{ top: 4, right: 12, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke={textStyle} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={textStyle}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']} />
                <Bar dataKey="value" fill="var(--accent)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">Registre pontos por categoria para ver o gráfico.</p>
          )}
        </div>
      </div>

      <div className="card section-gap">
        <h3>Saldo por conta</h3>
        {data.accounts.map((acc) => {
          const s = balanceSeries(data, acc.id)
          const last = s.length > 0 ? s[s.length - 1].total : 0
          return (
            <div key={acc.id} className="entry">
              <span className="account-dot" style={{ background: acc.color }} />
              <span className="entry-label">{acc.name}</span>
              <span className="entry-date">
                média 7 dias: {avgDailyEarn(data, acc.id, 7).toFixed(1)} pts/dia
              </span>
              <span className="entry-points pos">{fmtPoints(last)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
