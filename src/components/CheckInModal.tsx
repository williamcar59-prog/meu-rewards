// Modal de check-in diário: registra o saldo do dia e as peças ganhas

import { useState } from 'react'
import { useStore } from '../store'
import { currentBalance } from '../utils/calc'
import { todayISO } from '../utils/dates'
import { Field, Modal } from './ui'

export function CheckInModal({
  accountId,
  date,
  estimated,
  onClose,
}: {
  accountId: string
  date: string
  /** Saldo ESTIMADO para dias em aberto (check-in esquecido) */
  estimated?: number
  onClose: () => void
}) {
  const { data, upsertCheckIn } = useStore()
  const existing = data.checkIns.find((c) => c.accountId === accountId && c.date === date)
  const account = data.accounts.find((a) => a.id === accountId)

  const [balance, setBalance] = useState(
    existing
      ? String(existing.balance)
      : estimated !== undefined
        ? String(estimated)
        : String(currentBalance(data, accountId)),
  )
  const [pieces, setPieces] = useState(existing ? String(existing.pieces ?? 0) : '0')

  const isToday = date === todayISO()
  const isEstimate = !existing && estimated !== undefined

  const submit = () => {
    const b = Number(balance)
    if (!Number.isFinite(b) || b < 0) return
    upsertCheckIn(accountId, date, b, Number(pieces) || 0)
    onClose()
  }

  return (
    <Modal
      title={`Check-in${isToday ? ' de hoje' : ` — ${date.split('-').reverse().join('/')}`}${
        account ? ` · ${account.name}` : ''
      }`}
      onClose={onClose}
    >
      <Field label={isToday ? 'Saldo atual (pontos)' : 'Saldo do dia (pontos)'}>
        <input
          type="number"
          min={0}
          value={balance}
          autoFocus
          onChange={(e) => setBalance(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      {isEstimate && (
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--warning)',
          }}
        >
          ⚠ Dia em aberto — este valor é uma estimativa entre os check-ins vizinhos. Confirme e
          ajuste se o saldo real for diferente.
        </p>
      )}
      <Field label={isToday ? 'Peças de quebra-cabeça ganhas hoje' : 'Peças de quebra-cabeça ganhas no dia'}>
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
