// App principal: navegação + lembrete diário de check-in

import { useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from './store'
import {
  IconCalendar,
  IconChart,
  IconGift,
  IconHome,
  IconSettings,
} from './components/Icons'
import { SummaryPage } from './pages/Summary'
import { CalendarPage } from './pages/Calendar'
import { StatsOverviewPage } from './pages/StatsOverview'
import { RedeemsPage } from './pages/Redeems'
import { SettingsPage } from './pages/Settings'
import { checkedInOn } from './utils/calc'
import { showNotification } from './utils/notify'
import { todayISO } from './utils/dates'

type Page = 'summary' | 'calendar' | 'stats' | 'redeems' | 'settings'

const NAV: { id: Page; label: string; icon: (p: { size?: number; className?: string }) => JSX.Element }[] = [
  { id: 'summary', label: 'Resumo', icon: IconHome },
  { id: 'calendar', label: 'Calendário', icon: IconCalendar },
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
            {page === 'summary' && <SummaryPage onGoAccounts={() => setPage('settings')} />}
            {page === 'calendar' && <CalendarPage />}
            {page === 'stats' && <StatsOverviewPage />}
            {page === 'redeems' && <RedeemsPage />}
            {page === 'settings' && <SettingsPage />}
          </>
        )}
      </main>
      <ReminderChecker />
    </div>
  )
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

      // avisa se alguma conta ainda não fez check-in hoje
      const pending = data.accounts.some((acc) => !checkedInOn(data, acc.id, today))

      if (pending) {
        showNotification('Meu Rewards 🔥', 'Você ainda não fez o check-in de hoje. Não perca a sequência!')
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
