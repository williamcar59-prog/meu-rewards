// Página: Resgates — histórico em pontos

import { useStore } from '../store'
import { redeemSummary } from '../utils/calc'
import { fmtPoints, StatCard, Empty } from '../components/ui'
import { fmtDate } from '../utils/dates'
import { IconGift } from '../components/Icons'

export function RedeemsPage() {
  const { data } = useStore()

  const redeems = data.entries
    .filter((e) => e.type === 'redeem')
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const total = redeemSummary(data, null)

  return (
    <div>
      <h1 className="page-title">Resgates</h1>
      <p className="page-sub">Histórico de recompensas resgatadas em todas as contas</p>

      <div className="grid grid-3">
        <StatCard
          label="Total resgatado"
          value={fmtPoints(total.totalPoints)}
          sub="pontos"
        />
        <StatCard label="Quantidade" value={`${total.count}`} sub="resgate(s)" />
        <StatCard label="Média por resgate" value={total.count > 0 ? fmtPoints(total.totalPoints / total.count) : '—'} sub="pontos" />
      </div>

      <div className="card section-gap" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {redeems.length === 0 ? (
          <Empty
            icon={<IconGift size={44} />}
            title="Nenhum resgate registrado"
            text="Quando você resgatar uma recompensa, registre na Carteira da conta."
          />
        ) : (
          redeems.map((e) => {
            const acc = data.accounts.find((a) => a.id === e.accountId)
            return (
              <div key={e.id} className="entry">
                <span className="entry-points neg">−{fmtPoints(e.points)}</span>
                <span className="entry-label">
                  <strong>{e.label}</strong>
                  {acc && (
                    <>
                      {' '}
                      <span className="muted">· {acc.name}</span>
                    </>
                  )}
                </span>
                <span className="entry-date">{fmtDate(e.date)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
