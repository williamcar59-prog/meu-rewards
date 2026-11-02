// Página: Resgates — registrar onde usou os pontos e histórico

import { useState } from 'react'
import { useStore } from '../store'
import { Empty, Field, Modal, StatCard, fmtPoints } from '../components/ui'
import { IconGift, IconPlus, IconTrash } from '../components/Icons'
import { redeemSummary } from '../utils/calc'
import { fmtDate, todayISO } from '../utils/dates'

export function RedeemsPage() {
  const { data, addRedemption, deleteRedemption } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '')

  const account = data.accounts.find((a) => a.id === accountId) ?? data.accounts[0]
  const accId = account?.id

  const redeems = data.redemptions
    .filter((r) => r.accountId === accId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const total = redeemSummary(data, accId ?? null)

  if (data.accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Resgates</h1>
        <div className="card">
          <p className="muted">Crie uma conta em Configurações para registrar resgates.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Resgates</h1>
          <p className="page-sub">Escolha a conta e registre onde ela usou os pontos</p>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          <IconPlus size={16} /> Novo resgate
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

      <div className="grid grid-3 section-gap">
        <StatCard label="Total resgatado" value={fmtPoints(total.totalPoints)} sub="pontos" />
        <StatCard label="Quantidade" value={`${total.count}`} sub="resgate(s)" />
        <StatCard
          label="Média por resgate"
          value={total.count > 0 ? fmtPoints(total.totalPoints / total.count) : '—'}
          sub="pontos"
        />
      </div>

      <div className="card section-gap" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {redeems.length === 0 ? (
          <Empty
            icon={<IconGift size={44} />}
            title="Nenhum resgate registrado"
            text="Quando usar pontos, registre aqui em que gastou e quanto."
          />
        ) : (
          redeems.map((r) => (
            <div key={r.id} className="entry">
              <span className="entry-points neg">−{fmtPoints(r.points)}</span>
              <span className="entry-label">
                <strong>{r.usedFor}</strong>
              </span>
              <span className="entry-date">{fmtDate(r.date)}</span>
              <button
                className="btn icon-only small"
                title="Excluir"
                onClick={() => deleteRedemption(r.id)}
                style={{ color: 'var(--danger)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <RedeemModal
          initialAccountId={accId}
          onClose={() => setShowAdd(false)}
          onAdd={(id, points, usedFor, date) => {
            addRedemption(id, date, points, usedFor)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function RedeemModal({
  initialAccountId,
  onClose,
  onAdd,
}: {
  initialAccountId?: string
  onClose: () => void
  onAdd: (accountId: string, points: number, usedFor: string, date: string) => void
}) {
  const { data } = useStore()
  const [accountId, setAccountId] = useState(
    initialAccountId || data.accounts[0]?.id || '',
  )
  const [points, setPoints] = useState('')
  const [usedFor, setUsedFor] = useState('')
  const [date, setDate] = useState(todayISO())

  const submit = () => {
    const p = Number(points)
    if (!p || p <= 0 || !accountId) return
    onAdd(accountId, Math.round(p), usedFor, date)
  }

  return (
    <Modal title="Novo resgate" onClose={onClose}>
      <Field label="Conta">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Pontos usados">
        <input
          type="number"
          min={1}
          value={points}
          autoFocus
          onChange={(e) => setPoints(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <Field label="Em que usou (ex.: Game Pass, Gift Card)">
        <input
          type="text"
          value={usedFor}
          onChange={(e) => setUsedFor(e.target.value)}
          placeholder="Game Pass Ultimate"
        />
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
