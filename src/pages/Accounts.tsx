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
  avgDailyEarn,
  balanceOf,
  balanceSeries,
  categoryEarns,
  earnSumMonth,
  earnSumToday,
  earnSumWeek,
  goalForecast,
  redeemSummary,
  streakOf,
} from '../utils/calc'
import { addDays, fmtDate, todayISO } from '../utils/dates'
import { Empty, Field, fmtBRL, fmtPoints, Modal, Progress, StatCard } from '../components/ui'
import { IconCheck, IconFlame, IconPlus, IconTarget, IconTrash } from '../components/Icons'

type Tab = 'checklist' | 'wallet' | 'goal' | 'stats'

export function AccountsPage() {
  const { data, addAccount } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const selected = data.accounts.find((a) => a.id === selectedId) ?? null

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
        {showAdd && (
          <AddAccountModal
            onClose={() => setShowAdd(false)}
            onAdd={(name, region, currency) => {
              const acc = addAccount(name, region, currency)
              setSelectedId(acc.id)
              setShowAdd(false)
            }}
          />
        )}
      </div>
    )
  }

  if (selected) {
    return (
      <AccountDetail
        account={selected}
        onBack={() => setSelectedId(null)}
      />
    )
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
        {data.accounts.map((acc) => (
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
            <div className="muted">pontos · {acc.currency === 'BRL' ? 'Brasil' : 'Internacional'}</div>
          </button>
        ))}
      </div>

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAdd={(name, region, currency) => {
            const acc = addAccount(name, region, currency)
            setSelectedId(acc.id)
            setShowAdd(false)
          }}
        />
      )}
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
            {account.region} · saldo {fmtPoints(balanceOf(data, account.id))} pontos
            {streak.current > 0 && <> · 🔥 {streak.current} dias seguidos</>}
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
          <button
            key={id}
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
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

function ChecklistTab({ account }: { account: Account }) {
  const { data, toggleTask } = useStore()
  const [date, setDate] = useState(todayISO())

  const daily = account.tasks.filter((t) => t.frequency === 'daily')
  const weekly = account.tasks.filter((t) => t.frequency === 'weekly')
  const monthly = account.tasks.filter((t) => t.frequency === 'monthly')
  const streak = streakOf(data, account.id)

  const isDone = (task: Task) =>
    data.entries.some(
      (e) =>
        e.accountId === account.id &&
        e.taskId === task.id &&
        e.date === date &&
        e.source === 'checklist',
    )

  const doneToday = data.entries
    .filter((e) => e.accountId === account.id && e.date === date && e.type === 'earn')
    .reduce((s, e) => s + e.points, 0)

  const taskList = (tasks: Task[], freqLabel: string) =>
    tasks.length > 0 && (
      <>
        <h3 style={{ marginTop: 14 }}>{freqLabel}</h3>
        {tasks.map((task) => {
          const done = isDone(task)
          return (
            <button
              key={task.id}
              className={`check-item${done ? ' done' : ''}`}
              onClick={() => toggleTask(account.id, task, date)}
            >
              <span className="check-box">{done && <IconCheck size={14} />}</span>
              {task.name}
              <span className="check-points">+{fmtPoints(task.points)}</span>
            </button>
          )
        })}
      </>
    )

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
          {fmtDate(date)} · total registrado:{' '}
          <strong>+{fmtPoints(doneToday)} pontos</strong>
        </p>

        {account.tasks.filter((t) => t.enabled).length === 0 ? (
          <Empty
            title="Sem tarefas"
            text="Edite as tarefas desta conta em Configurações."
          />
        ) : (
          <>
            {taskList(daily, 'Diárias')}
            {taskList(weekly, 'Semanais')}
            {taskList(monthly, 'Mensais')}
          </>
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
        <StatCard
          label="Valor resgatado"
          value={fmtBRL(redeems.totalValue)}
          sub="convertido em BRL"
        />
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
              {e.value !== undefined && e.type === 'redeem' && (
                <span className="entry-date">{fmtBRL(e.value)}</span>
              )}
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
          onAdd={(points, value, label, date) => {
            addEntry({
              accountId: account.id,
              type: 'redeem',
              points,
              value,
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
      <Field label="Categoria (ex.: Pesquisa PC, Daily Set)">
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
  onAdd: (points: number, value: number, label: string, date: string) => void
}) {
  const [points, setPoints] = useState('')
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(todayISO())

  const submit = () => {
    const p = Number(points)
    const v = Number(value)
    if (!p || p <= 0) return
    onAdd(
      Math.round(p),
      v > 0 ? v : 0,
      label.trim() || 'Recompensa',
      date,
    )
  }

  return (
    <Modal title={`Registrar resgate — ${account.name}`} onClose={onClose}>
      <Field label={`Pontos gastos${account.currency === 'USD' ? ' (USD)' : ''}`}>
        <input
          type="number"
          min={1}
          value={points}
          autoFocus
          onChange={(e) => setPoints(e.target.value)}
        />
      </Field>
      <Field label={`Valor recebido (${account.currency === 'USD' ? 'US$' : 'R$'})`}>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
        />
      </Field>
      <Field label="Recompensa (ex.: Gift Card R$30, Game Pass)">
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
      <>
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
      </>
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
              <>
                Faltam <strong>{fmtPoints(fc!.remaining)} pontos</strong>
              </>
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
                ~{fc!.etaDays} dias · pelo ritmo médio dos últimos 7 dias (
                {fc!.avg7.toFixed(1)} pts/dia)
              </p>
              <div className="muted">
                Ritmo de 30 dias: {fc!.avg30.toFixed(1)} pts/dia
              </div>
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
        <RhythmBars account={account} target={fc!.targetPoints} remaining={fc!.remaining} />
      </div>
    </div>
  )
}

function RhythmBars({
  account,
  remaining,
}: {
  account: Account
  target: number
  remaining: number
}) {
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
    { name: 'Gift Card R$30 (Microsoft)', points: 4600 },
    { name: 'Gift Card R$50 (Microsoft)', points: 7200 },
    { name: 'Game Pass Ultimate (1 mês)', points: 10500 },
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
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                  formatter={(v: number | string) => [fmtPoints(Number(v)), 'Saldo']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={account.color}
                  strokeWidth={2.5}
                  dot={false}
                />
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
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                  formatter={(v: number | string) => [fmtPoints(Number(v)), 'Pontos']}
                />
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
  onAdd: (name: string, region: string, currency: 'BRL' | 'USD') => void
}) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState('Brasil')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL')

  const submit = () => {
    if (!name.trim()) return
    onAdd(name.trim(), region, currency)
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
      <Field label="Moeda dos resgates">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}
        >
          <option value="BRL">Real (R$)</option>
          <option value="USD">Dólar (US$)</option>
        </select>
      </Field>
      <p className="muted">
        A conta já vem com tarefas padrão do checklist — você pode ajustá-las depois em
        Configurações.
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

