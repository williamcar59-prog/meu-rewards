// App principal: navegação + lembrete diário

import { useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from './store'
import {
  IconChart,
  IconGift,
  IconHome,
  IconSettings,
  IconWallet,
} from './components/Icons'
import { SummaryPage } from './pages/Summary'
import { AccountsPage } from './pages/Accounts'
import { RedeemsPage } from './pages/Redeems'
import { SettingsPage } from './pages/Settings'
import { earnSumToday } from './utils/calc'
import { showNotification } from './utils/notify'
import { todayISO } from './utils/dates'

type Page = 'summary' | 'accounts' | 'stats' | 'redeems' | 'settings'

const NAV: { id: Page; label: string; icon: (p: { size?: number; className?: string }) => JSX.Element }[] = [
  { id: 'summary', label: 'Resumo', icon: IconHome },
  { id: 'accounts', label: 'Contas', icon: IconWallet },
  { id: 'stats', label: 'Estatísticas', icon: IconChart },
  { id: 'redeems', label: 'Resgates', icon: IconGift },
  { id: 'settings', label: 'Configurações', icon: IconSettings },
]

function Shell() {
  const { ready } = useStore()
  const [page, setPage] = useState<Page>('summary')

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <img src="./icon.svg" alt="" />
          Meu Rewards
        </div>
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <Icon size={19} className="nav-icon" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <main className="main">
        {!ready ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            {page === 'summary' && <SummaryPage onGoAccounts={() => setPage('accounts')} />}
            {page === 'accounts' && <AccountsPage />}
            {page === 'stats' && <StatsOverview />}
            {page === 'redeems' && <RedeemsPage />}
            {page === 'settings' && <SettingsPage />}
          </>
        )}
      </main>
      <ReminderChecker />
    </div>
  )
}

// ---------------------------------------------------------------- Estatísticas (todas as contas)

import { StatsOverviewPage } from './pages/StatsOverview'

function StatsOverview() {
  return <StatsOverviewPage />
}

// ---------------------------------------------------------------- Lembrete

function ReminderChecker() {
  const { data } = useStore()
  const notifiedRef = useRef<string | null>(null)

  useEffect(() => {
    const check = () => {
      if (!data.settings.notifyEnabled) return
      const now = new Date()
      if (now.getHours() < data.settings.notifyHour) return

      const today = todayISO()
      if (notifiedRef.current === today) return

      // se alguma conta tem tarefas do dia e nada foi registrado hoje, avisa
      const pending = data.accounts.some((acc) => {
        const hasDaily = acc.tasks.some((t) => t.enabled && t.frequency === 'daily')
        if (!hasDaily) return false
        return earnSumToday(data, acc.id) === 0
      })

      if (pending) {
        showNotification(
          'Meu Rewards 🔥',
          'Você ainda não registrou os pontos de hoje. Não perca seu streak!',
        )
        notifiedRef.current = today
      } else {
        notifiedRef.current = today // tudo feito — não repete
      }
    }

    check()
    const timer = window.setInterval(check, 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [data])

  return null
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
