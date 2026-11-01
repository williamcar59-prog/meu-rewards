// Página: Contas — lista de contas + detalhe com abas (Checklist, Carteira, Meta, Estatísticas)

import { useState } from 'react'
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
import { Account, Task } from '../types'
import {
  GamePassPlan,
  PLAN_LABELS,
  TaskGroup,
  builtinGroup,
  groupLabel,
  maxDailyPoints,
} from '../data/rewardsTable'
import {
  avgDailyEarn,
  balanceOf,
  balanceSeries,
  categoryEarns,
  cycleDayFor,
  earnSumMonth,
  earnSumToday,
  earnSumWeek,
  goalForecast,
  redeemSummary,
  streakOf,
  taskPoints,
} from '../utils/calc'
import { addDays, fmtDate, todayISO } from '../utils/dates'
import { Empty, Field, fmtPoints, Modal, Progress, StatCard } from '../components/ui'
import { IconCheck, IconFlame, IconPlus, IconTarget, IconTrash } from '../components/Icons'

type Tab = 'checklist' | 'wallet' | 'goal' | 'stats'

export function AccountsPage() {
  const { data, addAccount } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const selected = data.accounts.find((a) => a.id === selectedId) ?? null

  const handleAdd = (
    name: string,
    region: string,
    plan: GamePassPlan,
    openingBalance: number,
    openingStreak: number,
  ) => {
    const acc = addAccount(name, region, plan, openingBalance, openingStreak)
    setSelectedId(acc.id)
    setShowAdd(false)
  }

  if (data.accounts.length === 0 && !showAdd) {
    return (
      <div>
        <h1 className="page-title">Contas</h1>
        <div className="card">
          <Empty
            icon={<IconTarget size={44} />}
            title="Nenhuma conta ainda"
            text="Adicione sua conta do Microsoft Rewards para começar."
          />
          <div style={{ textAlign: 'center' }}>
            <button className="btn primary" onClick={() => setShowAdd(true)}>
              <IconPlus size={16} /> Adicionar conta
            </button>
          </div>
        </div>
        {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      </div>
    )
  }

  if (selected) {
    return <AccountDetail account={selected} onBack={() => setSelectedId(null)} />
  }

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Contas</h1>
          <p className="page-sub">Selecione uma conta para gerenciar</p>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          <IconPlus size={16} /> Nova conta
        </button>
      </div>

      <div className="grid grid-3">
        {data.accounts.map((acc) => {
          const streak = streakOf(data, acc.id)
          return (
            <button
              key={acc.id}
              className="card"
              style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
              onClick={() => setSelectedId(acc.id)}
            >
              <div className="flex-between">
                <h3 className="mt-0 mb-0" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="account-dot" style={{ background: acc.color }} />
                  {acc.name}
                </h3>
                <span className="muted">{acc.region}</span>
              </div>
              <div className="stat-value" style={{ marginTop: 10 }}>
                {fmtPoints(balanceOf(data, acc.id))}
              </div>
              <div className="muted">
                pontos · {PLAN_LABELS[acc.plan]}
                {streak.current > 0 && <> · 🔥 {streak.current}</>}
              </div>
            </button>
          )
        })}
      </div>

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  )
}

// ---------------------------------------------------------------- Conta

function AccountDetail({ account, onBack }: { account: Account; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('checklist')
  const { data } = useStore()
  const streak = streakOf(data, account.id)

  return (
    <div>
      <button className="btn small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Todas as contas
      </button>
      <div className="flex-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="account-dot" style={{ background: account.color, width: 14, height: 14 }} />
            {account.name}
          </h1>
          <p className="page-sub">
            {account.region} · {PLAN_LABELS[account.plan]} · saldo {fmtPoints(balanceOf(data, account.id))} pontos
            {streak.current > 0 && <> · 🔥 {streak.current} dias</>}
          </p>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['checklist', 'Checklist'],
            ['wallet', 'Carteira'],
            ['goal', 'Meta'],
            ['stats', 'Estatísticas'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'checklist' && <ChecklistTab account={account} />}
      {tab === 'wallet' && <WalletTab account={account} />}
      {tab === 'goal' && <GoalTab account={account} />}
      {tab === 'stats' && <StatsTab account={account} />}
    </div>
  )
}

// ---------------------------------------------------------------- Checklist

const GROUP_ORDER: (TaskGroup | 'custom')[] = ['xbox', 'bing', 'weekly', 'custom']

function groupOf(task: Task): TaskGroup | 'custom' {
  return task.builtin ? (builtinGroup(task.builtin) ?? 'custom') : 'custom'
}

function ChecklistTab({ account }: { account: Account }) {
  const { data, toggleTask } = useStore()
  const [date, setDate] = useState(todayISO())

  const enabled = account.tasks.filter((t) => t.enabled)
  const streak = streakOf(data, account.id)
  const cycleDay = cycleDayFor(data, account.id, date)
  const plan = account.plan

  const isDone = (task: Task) =>
    data.entries.some(
      (e) =>
        e.accountId === account.id &&
        e.taskId === task.id &&
        e.date === date &&
        e.source === 'checklist',
    )

  const pts = (task: Task) => taskPoints(task, plan, cycleDay)

  const doneToday = data.entries
    .filter((e) => e.accountId === account.id && e.date === date && e.type === 'earn')
    .reduce((s, e) => s + e.points, 0)

  const dayPotential = maxDailyPoints(enabled, plan, cycleDay)

  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    tasks: enabled.filter((t) => groupOf(t) === g),
  })).filter((s) => s.tasks.length > 0)

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="flex-between">
          <h3 className="mt-0 mb-0">Tarefas do dia</h3>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value || todayISO())}
            style={{ width: 'auto' }}
          />
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {fmtDate(date)} · dia <strong>{cycleDay}</strong> do ciclo · registrado{' '}
          <strong>+{fmtPoints(doneToday)}</strong> de {fmtPoints(dayPotential)} possíveis
        </p>
        {cycleDay === 7 && (
          <p className="muted" style={{ marginTop: -6 }}>
            🎉 Dia 7 — os bônuns do Bing valem muito mais hoje!
          </p>
        )}

        {enabled.length === 0 ? (
          <Empty title="Sem tarefas" text="Edite as tarefas desta conta em Configurações." />
        ) : (
          byGroup.map((sec) => (
            <div key={sec.group}>
              <h3 style={{ marginTop: 14 }}>
                {sec.group === 'custom' ? 'Personalizadas' : groupLabel(sec.group as TaskGroup)}
              </h3>
              {sec.tasks.map((task) => {
                const done = isDone(task)
                return (
                  <button
                    key={task.id}
                    className={`check-item${done ? ' done' : ''}`}
                    onClick={() => toggleTask(account.id, task, date)}
                  >
                    <span className="check-box">{done && <IconCheck size={14} />}</span>
                    {task.name}
                    <span className="check-points">+{fmtPoints(pts(task))}</span>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div>
        <div className="grid">
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--warning)', display: 'inline-block' }}>
              <IconFlame size={36} />
            </span>
            <div className="stat-value" style={{ fontSize: 40 }}>
              {streak.current}
            </div>
            <div className="muted">dias de sequência{!streak.todayDone && ' (falta hoje!)'}</div>
            <div style={{ marginTop: 8 }}>
              <span className="pill">Recorde: {streak.best} dias</span>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ fontSize: 40 }}>
              {cycleDay}/7
            </div>
            <div className="muted">dia do ciclo atual</div>
            <div style={{ marginTop: 8 }}>
              <span className="pill">{PLAN_LABELS[plan]}</span>
            </div>
          </div>

          <div className="card">
            <h3>Resumo do período</h3>
            <PeriodSummary account={account} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PeriodSummary({ account }: { account: Account }) {
  const { data } = useStore()
  return (
    <div className="grid grid-3">
      <div>
        <div className="stat-label">Hoje</div>
        <strong>{fmtPoints(earnSumToday(data, account.id))}</strong>
      </div>
      <div>
        <div className="stat-label">Semana</div>
        <strong>{fmtPoints(earnSumWeek(data, account.id))}</strong>
      </div>
      <div>
        <div className="stat-label">Mês</div>
        <strong>{fmtPoints(earnSumMonth(data, account.id))}</strong>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Carteira

function WalletTab({ account }: { account: Account }) {
  const { data, addEntry, deleteEntry } = useStore()
  const [showEarn, setShowEarn] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)

  const entries = data.entries
    .filter((e) => e.accountId === account.id)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 60)

  const redeems = redeemSummary(data, account.id)

  return (
    <div>
      <div className="grid grid-3">
        <StatCard label="Saldo atual" value={fmtPoints(balanceOf(data, account.id))} sub="pontos" />
        <StatCard
          label="Total resgatado"
          value={fmtPoints(redeems.totalPoints)}
          sub={`${redeems.count} resgate(s)`}
        />
        <StatCard label="Ganhos no mês" value={fmtPoints(earnSumMonth(data, account.id))} sub="pontos" />
      </div>

      <div className="flex-between section-gap">
        <h3 className="mt-0 mb-0">Lançamentos</h3>
        <div className="row" style={{ flex: 'none' }}>
          <button className="btn small primary" onClick={() => setShowEarn(true)}>
            <IconPlus size={14} /> Ganho
          </button>
          <button className="btn small" onClick={() => setShowRedeem(true)}>
            <IconPlus size={14} /> Resgate
          </button>
        </div>
      </div>

      <div className="card section-gap" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {entries.length === 0 ? (
          <Empty title="Nenhum lançamento" text="Registre seus primeiros pontos." />
        ) : (
          entries.map((e) => (
            <div key={e.id} className="entry">
              <span className={`entry-points ${e.type === 'earn' ? 'pos' : 'neg'}`}>
                {e.type === 'earn' ? '+' : '−'}
                {fmtPoints(e.points)}
              </span>
              <span className="entry-label">
                {e.label}
                {e.source === 'checklist' && <span className="muted"> · checklist</span>}
              </span>
              <span className="entry-date">{fmtDate(e.date)}</span>
              <button
                className="btn icon-only small"
                title="Excluir"
                onClick={() => deleteEntry(e.id)}
                style={{ color: 'var(--danger)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {showEarn && (
        <EarnModal
          account={account}
          onClose={() => setShowEarn(false)}
          onAdd={(points, label, date) => {
            addEntry({
              accountId: account.id,
              type: 'earn',
              points,
              label,
              date,
              source: 'manual',
            })
            setShowEarn(false)
          }}
        />
      )}
      {showRedeem && (
        <RedeemModal
          account={account}
          onClose={() => setShowRedeem(false)}
          onAdd={(points, label, date) => {
            addEntry({
              accountId: account.id,
              type: 'redeem',
              points,
              label,
              date,
              source: 'manual',
            })
            setShowRedeem(false)
          }}
        />
      )}
    </div>
  )
}

function EarnModal({
  account,
  onClose,
  onAdd,
}: {
  account: Account
  onClose: () => void
  onAdd: (points: number, label: string, date: string) => void
}) {
  const [points, setPoints] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(todayISO())

  const submit = () => {
    const p = Number(points)
    if (!p || p <= 0) return
    onAdd(Math.round(p), label.trim() || 'Outros pontos', date)
  }

  return (
    <Modal title={`Registrar ganho — ${account.name}`} onClose={onClose}>
      <Field label="Pontos ganhos">
        <input
          type="number"
          min={1}
          value={points}
          autoFocus
          onChange={(e) => setPoints(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <Field label="Categoria (ex.: Pesquisa PC, Check-in)">
        <input
          type="text"
          list={`cats-${account.id}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Outros pontos"
        />
        <datalist id={`cats-${account.id}`}>
          {[...new Set(account.tasks.map((t) => t.name))].map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>
      <Field label="Data">
        <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!Number(points)}>
          Adicionar
        </button>
      </div>
    </Modal>
  )
}

function RedeemModal({
  account,
  onClose,
  onAdd,
}: {
  account: Account
  onClose: () => void
  onAdd: (points: number, label: string, date: string) => void
}) {
  const [points, setPoints] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(todayISO())

  const submit = () => {
    const p = Number(points)
    if (!p || p <= 0) return
    onAdd(Math.round(p), label.trim() || 'Recompensa', date)
  }

  return (
    <Modal title={`Registrar resgate — ${account.name}`} onClose={onClose}>
      <Field label="Pontos gastos">
        <input
          type="number"
          min={1}
          value={points}
          autoFocus
          onChange={(e) => setPoints(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <Field label="Recompensa (ex.: Game Pass Ultimate, Gift Card)">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Field label="Data">
        <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!Number(points)}>
          Registrar
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Meta

function GoalTab({ account }: { account: Account }) {
  const { data, updateAccount } = useStore()
  const [editing, setEditing] = useState(false)
  const fc = goalForecast(data, account)
  const bal = balanceOf(data, account.id)

  if (!account.goal || editing) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h3>{account.goal ? 'Editar meta' : 'Definir meta de resgate'}</h3>
        <GoalForm
          initial={account.goal}
          onSave={(name, targetPoints) => {
            updateAccount(account.id, { goal: { name, targetPoints } })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="flex-between">
            <h3 className="mt-0 mb-0" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <IconTarget size={18} /> {account.goal.name}
            </h3>
            <button className="btn small" onClick={() => setEditing(true)}>
              Editar
            </button>
          </div>

          <div className="stat-value" style={{ margin: '14px 0 6px' }}>
            {fmtPoints(bal)} <span className="muted" style={{ fontSize: 16 }}>/ {fmtPoints(fc!.targetPoints)}</span>
          </div>
          <Progress value={fc!.progress} green={fc!.done} />
          <p style={{ marginBottom: 0 }}>
            {fc!.done ? (
              <span className="pill green">🎉 Meta atingida! Pode resgatar.</span>
            ) : (
              <>Faltam <strong>{fmtPoints(fc!.remaining)} pontos</strong></>
            )}
          </p>
        </div>

        <div className="card">
          <h3>Previsão</h3>
          {fc!.etaDate ? (
            <>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {fmtDate(fc!.etaDate!)}
              </div>
              <p className="muted">
                ~{fc!.etaDays} dias · pelo ritmo médio dos últimos 7 dias ({fc!.avg7.toFixed(1)} pts/dia)
              </p>
              <div className="muted">Ritmo de 30 dias: {fc!.avg30.toFixed(1)} pts/dia</div>
            </>
          ) : (
            <p className="muted">
              Sem ganhos registrados nos últimos 7 dias — registre pontos para calcular a previsão.
            </p>
          )}
        </div>
      </div>

      <div className="card section-gap">
        <h3>Ritmo para atingir a meta</h3>
        <RhythmBars account={account} remaining={fc!.remaining} />
      </div>
    </div>
  )
}

function RhythmBars({ account, remaining }: { account: Account; remaining: number }) {
  const { data } = useStore()
  const avg7 = avgDailyEarn(data, account.id, 7)
  const avg30 = avgDailyEarn(data, account.id, 30)

  const rows = [
    { label: 'Ritmo ideal (média 30 dias)', days: avg30 > 0 ? Math.ceil(remaining / avg30) : null },
    { label: 'Ritmo atual (média 7 dias)', days: avg7 > 0 ? Math.ceil(remaining / avg7) : null },
    { label: 'Ritmo máximo (todos os dias ativos)', days: Math.ceil(remaining / 200) },
  ]

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{r.label}</td>
            <td
              style={{
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                textAlign: 'right',
                fontWeight: 600,
              }}
            >
              {r.days === null ? '—' : `${r.days} dias`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; targetPoints: number } | null
  onSave: (name: string, targetPoints: number) => void
  onCancel: () => void
}) {
  const presets = [
    { name: 'Game Pass Ultimate (1 mês)', points: 10500 },
    { name: 'Game Pass Premium (1 mês)', points: 7000 },
    { name: 'Game Pass Essential (1 mês)', points: 5000 },
    { name: 'Doação (Cruz Vermelha)', points: 1000 },
  ]
  const [name, setName] = useState(initial?.name ?? '')
  const [points, setPoints] = useState(initial ? String(initial.targetPoints) : '')

  const submit = () => {
    const p = Number(points)
    if (!name.trim() || !p || p <= 0) return
    onSave(name.trim(), Math.round(p))
  }

  return (
    <>
      <Field label="Nome da recompensa">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Game Pass Ultimate"
        />
      </Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '-6px 0 12px' }}>
        {presets.map((p) => (
          <button
            key={p.name}
            className="btn small"
            onClick={() => {
              setName(p.name)
              setPoints(String(p.points))
            }}
          >
            {p.name} · {fmtPoints(p.points)}
          </button>
        ))}
      </div>
      <Field label="Pontos necessários">
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Ex.: 10500"
        />
      </Field>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        {initial && (
          <button className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn primary" onClick={submit} disabled={!name.trim() || !Number(points)}>
          Salvar meta
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Estatísticas

function StatsTab({ account }: { account: Account }) {
  const { data } = useStore()
  const series = balanceSeries(data, account.id).slice(-30)
  const cats = categoryEarns(data, account.id, addDays(todayISO(), -30))
  const streak = streakOf(data, account.id)

  const themeText = 'var(--text-secondary)'
  const tipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  }

  return (
    <div>
      <div className="grid grid-3">
        <StatCard
          label="Média diária (7 dias)"
          value={`${avgDailyEarn(data, account.id, 7).toFixed(1)}`}
          sub="pontos/dia"
        />
        <StatCard
          label="Média diária (30 dias)"
          value={`${avgDailyEarn(data, account.id, 30).toFixed(1)}`}
          sub="pontos/dia"
        />
        <StatCard label="Sequência recorde" value={`${streak.best}`} sub="dias completos" />
      </div>

      <div className="grid grid-2 section-gap" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Evolução do saldo (30 dias)</h3>
          {series.length > 1 ? (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)}
                  stroke={themeText}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={themeText}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtPoints(v)}
                />
                <Tooltip
                  contentStyle={tipStyle}
                  formatter={(v: number | string) => [fmtPoints(Number(v)), 'Saldo']}
                />
                <Line type="monotone" dataKey="total" stroke={account.color} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">Sem dados suficientes ainda.</p>
          )}
        </div>

        <div className="card">
          <h3>Ganhos por categoria (30 dias)</h3>
          {cats.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={cats} layout="vertical" margin={{ top: 4, right: 12, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke={themeText} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={themeText}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']} />
                <Bar dataKey="value" fill={account.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">Registre pontos por categoria para ver o gráfico.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Modal de nova conta

function AddAccountModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (
    name: string,
    region: string,
    plan: GamePassPlan,
    openingBalance: number,
    openingStreak: number,
  ) => void
}) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState('Brasil')
  const [plan, setPlan] = useState<GamePassPlan>('NONE')
  const [balance, setBalance] = useState('')
  const [streak, setStreak] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onAdd(
      name.trim(),
      region,
      plan,
      Number(balance) || 0,
      Number(streak) || 0,
    )
  }

  return (
    <Modal title="Nova conta de Rewards" onClose={onClose}>
      <Field label="Nome da conta">
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ex.: Conta principal"
        />
      </Field>
      <Field label="Região">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>Brasil</option>
          <option>EUA</option>
          <option>Outro</option>
        </select>
      </Field>
      <Field label="Plano do Game Pass">
        <select value={plan} onChange={(e) => setPlan(e.target.value as GamePassPlan)}>
          <option value="NONE">Sem Game Pass</option>
          <option value="ESSENTIAL">Game Pass Essential</option>
          <option value="PREMIUM">Game Pass Premium</option>
          <option value="ULTIMATE">Game Pass Ultimate</option>
        </select>
      </Field>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <Field label="Saldo atual (pontos)">
          <input
            type="number"
            min={0}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Sequência atual (dias)">
          <input
            type="number"
            min={0}
            value={streak}
            onChange={(e) => setStreak(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>
      <p className="muted">
        Conta existente? Informe o saldo e a sequência atuais. O plano define os pontos do app Xbox
        e dos bônus semanais.
      </p>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>
          Criar conta
        </button>
      </div>
    </Modal>
  )
}
