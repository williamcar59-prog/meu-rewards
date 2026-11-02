// Modal de check-in diário: registra o saldo do dia e as peças ganhas

import { useState } from 'react'
import { useStore } from '../store'
import { currentBalance } from '../utils/calc'
import { todayISO } from '../utils/dates'
import { Field, Modal } from './ui'

export function CheckInModal({
  accountId,
  date,
  onClose,
}: {
  accountId: string
  date: string
  onClose: () => void
}) {
  const { data, upsertCheckIn } = useStore()
  const existing = data.checkIns.find((c) => c.accountId === accountId && c.date === date)
  const account = data.accounts.find((a) => a.id === accountId)

  const [balance, setBalance] = useState(
    existing ? String(existing.balance) : String(currentBalance(data, accountId)),
  )
  const [pieces, setPieces] = useState(existing ? String(existing.pieces ?? 0) : '0')

  const submit = () => {
    const b = Number(balance)
    if (!Number.isFinite(b) || b < 0) return
    upsertCheckIn(accountId, date, b, Number(pieces) || 0)
    onClose()
  }

  const isToday = date === todayISO()

  return (
    <Modal
      title={`Check-in${isToday ? ' de hoje' : ` — ${date.split('-').reverse().join('/')}`}${
        account ? ` · ${account.name}` : ''
      }`}
      onClose={onClose}
    >
      <Field label="Saldo atual (pontos)">
        <input
          type="number"
          min={0}
          value={balance}
          autoFocus
          onChange={(e) => setBalance(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <Field label="Peças de quebra-cabeça ganhas hoje">
        <input
          type="number"
          min={0}
          max={4}
          value={pieces}
          onChange={(e) => setPieces(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <p className="muted">
        Registre o saldo que aparece no Microsoft Rewards. As peças vêm das 4 atividades do Bing
        (até 4 por semana) — se alguma bugar e não der a peça, conte manualmente aqui.
      </p>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!Number.isFinite(Number(balance))}>
          Salvar check-in
        </button>
      </div>
    </Modal>
  )
}
