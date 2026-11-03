// Página: Calendário — check-in diário + relatório mensal (fecha no dia 1, ciclo do Game Pass)

import { useState } from 'react'
import { useStore } from '../store'
import { CheckInModal } from '../components/CheckInModal'
import { PuzzleTrophy } from '../components/PuzzleTrophy'
import { IconCheck, IconChevron } from '../components/Icons'
import { fmtPoints, StatCard } from '../components/ui'
import {
  checkedInOn,
  currentBalance,
  dailyGain,
  monthLabelPt,
  monthlyReport,
  monthBounds,
  nextMonth,
  prevMonth,
  redemptionsBetween,
  redemptionsOn,
  streakOf,
} from '../utils/calc'
import { todayISO } from '../utils/dates'
import { PLAN_LABELS } from '../data/rewardsTable'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const pad = (n: number) => String(n).padStart(2, '0')

function buildGrid(year: number, month: number): (string | null)[] {
  const days = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay() // 0 = domingo
  const offset = (firstDow + 6) % 7 // segunda = 0
  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function CalendarPage() {
  const { data } = useStore()
  const now = new Date()
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [checkDate, setCheckDate] = useState<string | null>(null)

  if (data.accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Calendário</h1>
        <div className="card">
          <p className="muted">Crie uma conta em Configurações para começar a fazer check-in.</p>
        </div>
      </div>
    )
  }

  const account = data.accounts.find((a) => a.id === accountId) ?? data.accounts[0]
  const accId = account.id
  const today = todayISO()
  const { first: monthFirst, last: monthLast } = monthBounds(year, month)
  const report = monthlyReport(data, accId, year, month)
  const monthRedemptions = redemptionsBetween(data, accId, monthFirst, monthLast)
  const streak = streakOf(data, accId)
  const cells = buildGrid(year, month)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const canGoNext = !isCurrentMonth

  const goPrev = () => {
    const p = prevMonth(year, month)
    setYear(p.year)
    setMonth(p.month)
  }
  const goNext = () => {
    if (!canGoNext) return
    const n = nextMonth(year, month)
    setYear(n.year)
    setMonth(n.month)
  }

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-sub">
            Check-in diário e relatório do mês — o ciclo fecha no dia 1, quando o Game Pass renova.
          </p>
        </div>
        <button className="btn primary" onClick={() => setCheckDate(today)}>
          <IconCheck size={16} /> Check-in de hoje
        </button>
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

      <div className="grid grid-2 section-gap" style={{ alignItems: 'start' }}>
        {/* ---------------- Calendário ---------------- */}
        <div className="card">
          <div className="flex-between">
            <h3 className="mt-0 mb-0" style={{ textTransform: 'capitalize' }}>
              {monthLabelPt(year, month)}
            </h3>
            <div className="row" style={{ flex: 'none', gap: 6 }}>
              <button className="btn small" onClick={goPrev} aria-label="Mês anterior">
                <IconChevron size={14} dir="left" />
              </button>
              <button className="btn small" onClick={goNext} disabled={!canGoNext} aria-label="Próximo mês">
                <IconChevron size={14} dir="right" />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 12 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="muted" style={{ textAlign: 'center', fontSize: 11, fontWeight: 600 }}>
                {w}
              </div>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <div key={`e${i}`} />
              const done = checkedInOn(data, accId, iso)
              const future = iso > today
              const isToday = iso === today
              const check = data.checkIns.find((c) => c.accountId === accId && c.date === iso)
              const redeemed = redemptionsOn(data, accId, iso)
              const gain = dailyGain(data, accId, iso)
              return (
                <button
                  key={iso}
                  disabled={future}
                  onClick={() => setCheckDate(iso)}
                  title={
                    done
                      ? `Ganho do dia: ${gain !== null && gain >= 0 ? '+' : ''}${fmtPoints(gain ?? 0)} pts${
                          redeemed > 0 ? ` · Resgate de ${fmtPoints(redeemed)} pts` : ''
                        }`
                      : redeemed > 0
                        ? `Resgate de ${fmtPoints(redeemed)} pontos`
                        : undefined
                  }
                  style={{
                    border: `1px solid ${
                      redeemed > 0
                        ? 'var(--danger)'
                        : isToday
                          ? 'var(--accent)'
                          : 'var(--border)'
                    }`,
                    background: done
                      ? 'color-mix(in srgb, var(--success) 14%, transparent)'
                      : redeemed > 0
                        ? 'color-mix(in srgb, var(--danger) 10%, transparent)'
                        : 'var(--bg-card)',
                    borderRadius: 8,
                    padding: '6px 2px',
                    cursor: future ? 'default' : 'pointer',
                    opacity: future ? 0.4 : 1,
                    font: 'inherit',
                    color: 'inherit',
                    minHeight: 54,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500 }}>
                    {Number(iso.slice(8))}
                  </span>
                  {done && (
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1,
                        fontWeight: 700,
                        color:
                          (gain ?? 0) > 0
                            ? 'var(--success)'
                            : (gain ?? 0) < 0
                              ? 'var(--danger)'
                              : 'var(--text-secondary)',
                      }}
                    >
                      {(gain ?? 0) > 0 ? '+' : ''}
                      {fmtPoints(gain ?? 0)}
                    </span>
                  )}
                  {(check?.pieces ?? 0) > 0 && (
                    <span style={{ fontSize: 10, lineHeight: 1 }}>🧩 {check!.pieces}</span>
                  )}
                  {redeemed > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1,
                        fontWeight: 700,
                        color: 'var(--danger)',
                      }}
                    >
                      🎁 −{fmtPoints(redeemed)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div
            className="muted"
            style={{ marginTop: 10, marginBottom: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12 }}
          >
            <span>Verde = check-in feito</span>
            <span style={{ color: 'var(--success)' }}>±n = ganho do dia</span>
            <span>🧩 = peças do dia</span>
            <span style={{ color: 'var(--danger)' }}>🎁 = resgate</span>
          </div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Toque em um dia para registrar ou editar o check-in.
          </p>
        </div>

        {/* ---------------- Relatório mensal ---------------- */}
        <div>
          <div className="card">
            <div className="flex-between">
              <h3 className="mt-0 mb-0">Relatório do mês</h3>
              <span className="pill">{PLAN_LABELS[account.plan]}</span>
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0 6px' }}>
              <div className="muted" style={{ fontSize: 13 }}>
                Ganho líquido do mês
              </div>
              <div
                className="stat-value"
                style={{ fontSize: 42, color: report.netEarned >= 0 ? 'var(--success)' : 'var(--danger)' }}
              >
                {report.netEarned >= 0 ? '+' : ''}
                {fmtPoints(report.netEarned)}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                pontos obtidos mesmo resgatando
              </div>
            </div>

            <div className="grid grid-3">
              <div style={{ textAlign: 'center' }}>
                <div className="stat-label">Saldo inicial</div>
                <strong>{fmtPoints(report.startBalance)}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-label">Saldo final</div>
                <strong>{fmtPoints(report.endBalance)}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-label">Resgatado</div>
                <strong>{fmtPoints(report.redeemed)}</strong>
              </div>
            </div>

            <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
              {report.daysChecked} dia(s) com check-in · 🧩 {report.pieces} peça(s) no mês
            </p>

            {monthRedemptions.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="stat-label" style={{ marginBottom: 4 }}>
                  Resgates do mês
                </div>
                {monthRedemptions.map((r) => (
                  <div key={r.id} className="entry" style={{ padding: '6px 0' }}>
                    <span className="entry-points neg">−{fmtPoints(r.points)}</span>
                    <span className="entry-label">
                      <strong>{r.usedFor}</strong>
                    </span>
                    <span className="entry-date">
                      {r.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-gap">
            <PuzzleTrophy accountId={accId} />
          </div>

          <div className="grid grid-2 section-gap">
            <StatCard label="Saldo atual" value={fmtPoints(currentBalance(data, accId))} sub="pontos" />
            <StatCard
              label="Sequência"
              value={`${streak.current}`}
              sub={streak.todayDone ? 'dias 🔥' : 'dias (falta hoje!)'}
            />
          </div>

          <div className="card section-gap">
            <h3>Check-ins recentes</h3>
            <RecentCheckIns accountId={accId} />
          </div>
        </div>
      </div>

      {checkDate && (
        <CheckInModal accountId={accId} date={checkDate} onClose={() => setCheckDate(null)} />
      )}
    </div>
  )
}

function RecentCheckIns({ accountId }: { accountId: string }) {
  const { data, deleteCheckIn } = useStore()
  const list = data.checkIns
    .filter((c) => c.accountId === accountId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14)

  if (list.length === 0) {
    return <p className="muted">Nenhum check-in ainda. Registre o saldo do dia!</p>
  }

  return (
    <div>
      {list.map((c) => {
        const gain = dailyGain(data, accountId, c.date) ?? 0
        return (
          <div key={c.id} className="entry" title={`Saldo no dia: ${fmtPoints(c.balance)} pts`}>
            <span className={`entry-points ${gain >= 0 ? 'pos' : 'neg'}`}>
              {gain > 0 ? '+' : ''}
              {fmtPoints(gain)}
            </span>
            <span className="entry-label">
              {c.date.split('-').reverse().join('/')}
              {(c.pieces ?? 0) > 0 && <span className="muted"> · 🧩 {c.pieces}</span>}
            </span>
            <button
              className="btn icon-only small"
              title="Excluir"
              onClick={() => deleteCheckIn(c.id)}
              style={{ color: 'var(--danger)' }}
            >
              🗑
            </button>
          </div>
        )
      })}
    </div>
  )
}
