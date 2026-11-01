// Página: Resgates — histórico em R$ e valor do ponto

import { useStore } from '../store'
import { pointValueBRL, redeemSummary } from '../utils/calc'
import { fmtBRL, fmtPoints, StatCard, Empty } from '../components/ui'
import { fmtDate } from '../utils/dates'
import { IconGift } from '../components/Icons'

export function RedeemsPage() {
  const { data } = useStore()

  const redeems = data.entries
    .filter((e) => e.type === 'redeem')
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const total = redeemSummary(data, null)
  const perPoint = pointValueBRL(data)

  return (
    <div>
      <h1 className="page-title">Resgates</h1>
      <p className="page-sub">Histórico de recompensas resgatadas em todas as contas</p>

      <div className="grid grid-3">
        <StatCard
          label="Total resgatado"
          value={fmtPoints(total.totalPoints)}
          sub={`${total.count} resgate(s)`}
        />
        <StatCard label="Valor total" value={fmtBRL(total.totalValue)} sub="convertido em BRL" />
        <StatCard
          label="Valor médio do ponto"
          value={perPoint !== null ? perPoint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }) : '—'}
          sub={perPoint !== null ? 'por ponto resgatado' : 'registre um resgate com valor'}
        />
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
            const rate = acc?.currency === 'USD' ? data.settings.usdBrlRate : 1
            return (
              <div key={e.id} className="entry">
                <span className="entry-points neg">−{fmtPoints(e.points)}</span>
                <span className="entry-label">
                  <strong>{e.label}</strong>
                  {acc && (
                    <>
                      {' '}
                      <span className="muted">
                        · {acc.name}
                        {acc.currency === 'USD' && ` (US$ ${e.value?.toFixed(2)} → ${fmtBRL((e.value ?? 0) * rate)})`}
                      </span>
                    </>
                  )}
                </span>
                {acc?.currency === 'BRL' && e.value !== undefined && (
                  <span className="entry-date">{fmtBRL(e.value)}</span>
                )}
                <span className="entry-date">{fmtDate(e.date)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
