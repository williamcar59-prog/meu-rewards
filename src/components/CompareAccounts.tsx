// Comparativo entre contas: médias, tabela lado a lado e gráficos (2+ contas)
// Só de visualização — nenhum número é consolidado nas outras páginas.

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
  balanceAt,
  currentBalance,
  monthlyReport,
  redeemSummary,
  streakOf,
} from '../utils/calc'
import { addDays, todayISO } from '../utils/dates'
import { fmtPoints, StatCard } from './ui'

const MONTHS = 6 // últimos N meses no gráfico de barras
const DAYS = 60 // janela do gráfico de saldo

const monthLabel = (y: number, m: number) => `${String(m).padStart(2, '0')}/${String(y).slice(2)}`

const tipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
}

export function CompareAccounts() {
  const { data } = useStore()
  const accounts = data.accounts
  const n = accounts.length
  if (n < 2) return null

  const now = new Date()

  // ---------------------------------------- linhas + médias (tabela/cards)
  const rows = accounts.map((a) => {
    const rep = monthlyReport(data, a.id, now.getFullYear(), now.getMonth() + 1)
    const st = streakOf(data, a.id)
    const rd = redeemSummary(data, a.id)
    return {
      acc: a,
      net: rep.netEarned,
      bal: currentBalance(data, a.id),
      streak: st.current,
      redeemed: rd.totalPoints,
    }
  })
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0)
  const avg = {
    bal: Math.round(sum((r) => r.bal) / n),
    net: Math.round(sum((r) => r.net) / n),
    streak: Math.round((sum((r) => r.streak) / n) * 10) / 10,
    redeemed: Math.round(sum((r) => r.redeemed) / n),
  }
  const leader = rows.reduce((m, r) => (r.net > m.net ? r : m), rows[0])
  const streakTxt = Number.isInteger(avg.streak)
    ? String(avg.streak)
    : avg.streak.toFixed(1).replace('.', ',')

  // ---------------------------------------- gráfico de barras: ganho líquido/mês por conta
  const barData: Record<string, number | string>[] = []
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const o: Record<string, number | string> = { month: monthLabel(d.getFullYear(), d.getMonth() + 1) }
    for (const a of accounts)
      o[a.id] = monthlyReport(data, a.id, d.getFullYear(), d.getMonth() + 1).netEarned
    barData.push(o)
  }

  // ---------------------------------------- gráfico de linhas: saldo/dia por conta + média
  const today = todayISO()
  const lineData: Record<string, number | string | null>[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const iso = addDays(today, -i)
    const o: Record<string, number | string | null> = { date: iso }
    let acc = 0
    let count = 0
    for (const a of accounts) {
      if (iso < a.createdAt) {
        o[a.id] = null // conta ainda não existe nesse dia
        continue
      }
      const v = balanceAt(data, a.id, iso)
      o[a.id] = v
      acc += v
      count++
    }
    o.avg = count > 0 ? Math.round(acc / count) : null
    lineData.push(o)
  }

  return (
    <div>
      {/* ---------------- Médias ---------------- */}
      <div className="grid grid-4 section-gap">
        <StatCard label="Média de saldo" value={fmtPoints(avg.bal)} sub={`pontos · ${n} contas`} />
        <StatCard label="Média no mês" value={`+${fmtPoints(avg.net)}`} sub="ganho líquido" />
        <StatCard label="Média de sequência" value={streakTxt} sub="dias 🔥" />
        <StatCard
          label="Líder do mês"
          value={`+${fmtPoints(leader.net)}`}
          sub={`🏆 ${leader.acc.name}`}
        />
      </div>

      {/* ---------------- Tabela lado a lado ---------------- */}
      <div className="card section-gap">
        <h3>Contas lado a lado</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Saldo</th>
                <th>Ganho do mês</th>
                <th>Sequência</th>
                <th>Resgatado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.acc.id}>
                  <td>
                    <span className="cmp-account">
                      <span className="account-dot" style={{ background: r.acc.color }} />
                      {r.acc.name}
                    </span>
                  </td>
                  <td>{fmtPoints(r.bal)}</td>
                  <td className={r.net >= 0 ? 'pos' : 'neg'}>
                    {r.net >= 0 ? '+' : ''}
                    {fmtPoints(r.net)}
                  </td>
                  <td>{r.streak} 🔥</td>
                  <td>{fmtPoints(r.redeemed)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Média</td>
                <td>{fmtPoints(avg.bal)}</td>
                <td>+{fmtPoints(avg.net)}</td>
                <td>{streakTxt} 🔥</td>
                <td>{fmtPoints(avg.redeemed)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: 10 }}>
          A linha <strong>Média</strong> é a média aritmética das {n} contas — serve para comparar
          quem está acima ou abaixo do grupo.
        </p>
      </div>

      {/* ---------------- Barras: ganho por mês ---------------- */}
      <div className="card section-gap">
        <h3>Ganho líquido por mês — contas comparadas (últimos {MONTHS})</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtPoints(v)} />
            <Tooltip
              contentStyle={tipStyle}
              formatter={(v: number | string, name: string) => [fmtPoints(Number(v)), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {accounts.map((a) => (
              <Bar key={a.id} dataKey={a.id} name={a.name} fill={a.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="muted" style={{ marginBottom: 0 }}>
          Cada cor é uma conta · meses sem dado aparecem como zero.
        </p>
      </div>

      {/* ---------------- Linhas: saldo + média ---------------- */}
      <div className="card section-gap">
        <h3>Evolução do saldo — contas e média ({DAYS} dias)</h3>
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={lineData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)}
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={9}
            />
            <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtPoints(v)} />
            <Tooltip
              contentStyle={tipStyle}
              formatter={(v, name) => [typeof v === 'number' ? fmtPoints(v) : String(v), name]}
              labelFormatter={(l) => String(l).split('-').reverse().join('/')}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {accounts.map((a) => (
              <Line
                key={a.id}
                dataKey={a.id}
                name={a.name}
                stroke={a.color}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
            ))}
            <Line
              dataKey="avg"
              name="Média"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="muted" style={{ marginBottom: 0 }}>
          Linha cinza tracejada = média das contas naquele dia.
        </p>
      </div>
    </div>
  )
}
