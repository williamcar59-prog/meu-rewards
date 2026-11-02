// Página: Estatísticas — desempenho de uma conta selecionada (sem total consolidado)

import { useState } from 'react'
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
import {
  balanceSeries,
  currentBalance,
  monthlyNetSeries,
  monthlyReport,
  PIECE_GOAL,
  puzzleProgress,
  redeemSummary,
} from '../utils/calc'
import { fmtPoints, StatCard } from '../components/ui'

export function StatsOverviewPage() {
  const { data } = useStore()
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '')

  if (data.accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Estatísticas</h1>
        <div className="card">
          <p className="muted">Crie uma conta em Configurações para ver as estatísticas.</p>
        </div>
      </div>
    )
  }

  const account = data.accounts.find((a) => a.id === accountId) ?? data.accounts[0]
  const accId = account.id

  const now = new Date()
  const month = monthlyReport(data, accId, now.getFullYear(), now.getMonth() + 1)
  const series = balanceSeries(data, accId).slice(-60)
  // mesma série, mas com o saldo visível apenas nos dias que houve resgate (ponto vermelho)
  const markSeries = series.map((p) => ({ ...p, mark: p.redeemed > 0 ? p.total : null }))
  const monthly = monthlyNetSeries(data, accId, 6)
  const redeems = redeemSummary(data, accId)
  const puzzle = puzzleProgress(data, accId)
  const bal = currentBalance(data, accId)

  const textStyle = 'var(--text-secondary)'
  const tipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  }

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Estatísticas</h1>
          <p className="page-sub">Escolha a conta para ver o desempenho dela</p>
        </div>
      </div>

      {data.accounts.length > 1 && (
        <div className="tabs" style={{ marginTop: 8 }}>
          {data.accounts.map((a) => (
            <button
              key={a.id}
              className={`tab${a.id === accId ? ' active' : ''}`}
              onClick={() => setAccountId(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-4 section-gap">
        <StatCard label="Ganho do mês" value={`+${fmtPoints(month.netEarned)}`} sub="líquido" />
        <StatCard label="Saldo" value={fmtPoints(bal)} sub="pontos" />
        <StatCard label="Resgates" value={`${redeems.count}`} sub={`${fmtPoints(redeems.totalPoints)} pts`} />
        <StatCard
          label="Peças 🧩"
          value={`${puzzle.total}`}
          sub={`troféu ${puzzle.filled}/${PIECE_GOAL} · ${puzzle.completed} completo(s)`}
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
    </div>
  )
}
