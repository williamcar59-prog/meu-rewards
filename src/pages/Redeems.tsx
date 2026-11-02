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

  const redeems = data.redemptions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const total = redeemSummary(data, null)

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Resgates</h1>
          <p className="page-sub">Registre onde você usou os pontos</p>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          <IconPlus size={16} /> Novo resgate
        </button>
      </div>

      <div className="grid grid-3">
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
          redeems.map((r) => {
            const acc = data.accounts.find((a) => a.id === r.accountId)
            return (
              <div key={r.id} className="entry">
                <span className="entry-points neg">−{fmtPoints(r.points)}</span>
                <span className="entry-label">
                  <strong>{r.usedFor}</strong>
                  {acc && (
                    <>
                      {' '}
                      <span className="muted">· {acc.name}</span>
                    </>
                  )}
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
            )
          })
        )}
      </div>

      {showAdd && (
        <RedeemModal
          onClose={() => setShowAdd(false)}
          onAdd={(accountId, points, usedFor, date) => {
            addRedemption(accountId, date, points, usedFor)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function RedeemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (accountId: string, points: number, usedFor: string, date: string) => void
}) {
  const { data } = useStore()
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '')
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
