// Página: Configurações — contas, aparência, lembretes, sync e backup

import { useRef, useState } from 'react'
import { useStore } from '../store'
import { Account, AppData } from '../types'
import { GamePassPlan, PLAN_LABELS } from '../data/rewardsTable'
import { Field, Modal } from '../components/ui'
import { IconPlus, IconTrash } from '../components/Icons'
import {
  notifyPermission,
  notifySupported,
  requestNotifyPermission,
  showNotification,
} from '../utils/notify'
import { fsApiSupported } from '../utils/storage'

export function SettingsPage() {
  const { data, setSettings } = useStore()

  return (
    <div>
      <h1 className="page-title">Configurações</h1>
      <p className="page-sub">Contas, aparência, lembretes e backup</p>

      <AccountsSection />
      <AppearanceSection data={data} setSettings={setSettings} />
      <NotifySection data={data} setSettings={setSettings} />
      <DataSection />
    </div>
  )
}

// ---------------------------------------------------------------- Contas

function AccountsSection() {
  const { data, updateAccount, deleteAccount, addAccount } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  return (
    <div className="card section-gap">
      <div className="flex-between">
        <h3 className="mt-0 mb-0">Contas</h3>
        <button className="btn small primary" onClick={() => setShowAdd(true)}>
          <IconPlus size={14} /> Nova conta
        </button>
      </div>

      {data.accounts.length === 0 && <p className="muted">Nenhuma conta cadastrada.</p>}

      {data.accounts.map((acc) => (
        <div key={acc.id} className="entry">
          <span className="account-dot" style={{ background: acc.color }} />
          <span className="entry-label">
            <strong>{acc.name}</strong>
            <span className="muted">
              {' '}
              · {acc.region} · {PLAN_LABELS[acc.plan]}
            </span>
          </span>
          <button className="btn small" onClick={() => setEditing(acc)}>
            Editar
          </button>
          <button
            className="btn small danger"
            title="Excluir conta"
            onClick={() => {
              if (
                confirm(`Excluir "${acc.name}"? Isso apaga todos os check-ins e resgates. Não dá para desfazer.`)
              ) {
                deleteAccount(acc.id)
              }
            }}
          >
            <IconTrash size={14} />
          </button>
        </div>
      ))}

      {showAdd && (
        <AddSimpleAccountModal
          onClose={() => setShowAdd(false)}
          onAdd={(name, region, plan, openingBalance, openingStreak) => {
            addAccount(name, region, plan, openingBalance, openingStreak)
            setShowAdd(false)
          }}
        />
      )}
      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateAccount(editing.id, patch)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function PlanField({ plan, setPlan }: { plan: GamePassPlan; setPlan: (p: GamePassPlan) => void }) {
  return (
    <Field label="Plano do Game Pass">
      <select value={plan} onChange={(e) => setPlan(e.target.value as GamePassPlan)}>
        <option value="NONE">Sem Game Pass</option>
        <option value="ESSENTIAL">Game Pass Essential</option>
        <option value="PREMIUM">Game Pass Premium</option>
        <option value="ULTIMATE">Game Pass Ultimate</option>
      </select>
    </Field>
  )
}

function AddSimpleAccountModal({
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

  const submit = () =>
    name.trim() && onAdd(name.trim(), region, plan, Number(balance) || 0, Number(streak) || 0)

  return (
    <Modal title="Nova conta" onClose={onClose}>
      <Field label="Nome da conta">
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
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
      <PlanField plan={plan} setPlan={setPlan} />
      <div className="grid grid-2" style={{ gap: 12 }}>
        <Field label="Saldo atual (pontos)">
          <input type="number" min={0} value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Sequência atual (dias)">
          <input type="number" min={0} value={streak} onChange={(e) => setStreak(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <p className="muted">Conta existente? Informe o saldo e a sequência atuais.</p>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>
          Criar
        </button>
      </div>
    </Modal>
  )
}

function EditAccountModal({
  account,
  onClose,
  onSave,
}: {
  account: Account
  onClose: () => void
  onSave: (patch: Partial<Account>) => void
}) {
  const [name, setName] = useState(account.name)
  const [region, setRegion] = useState(account.region)
  const [plan, setPlan] = useState<GamePassPlan>(account.plan)
  const [balance, setBalance] = useState(String(account.openingBalance))
  const [streak, setStreak] = useState(String(account.openingStreak))
  const [color, setColor] = useState(account.color)

  const submit = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      region,
      plan,
      openingBalance: Math.max(0, Number(balance) || 0),
      openingStreak: Math.max(0, Number(streak) || 0),
      color,
    })
  }

  return (
    <Modal title={`Editar — ${account.name}`} onClose={onClose}>
      <Field label="Nome da conta">
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Região">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>Brasil</option>
          <option>EUA</option>
          <option>Outro</option>
        </select>
      </Field>
      <PlanField plan={plan} setPlan={setPlan} />
      <div className="grid grid-2" style={{ gap: 12 }}>
        <Field label="Saldo de abertura (pontos)">
          <input type="number" min={0} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <Field label="Sequência de abertura (dias)">
          <input type="number" min={0} value={streak} onChange={(e) => setStreak(e.target.value)} />
        </Field>
      </div>
      <Field label="Cor da conta">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 40 }} />
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>
          Salvar
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Aparência

function AppearanceSection({
  data,
  setSettings,
}: {
  data: AppData
  setSettings: (p: Partial<AppData['settings']>) => void
}) {
  return (
    <div className="card section-gap">
      <h3>Aparência</h3>
      <div className="row" style={{ maxWidth: 380 }}>
        <button
          className={`btn${data.settings.theme === 'light' ? ' primary' : ''}`}
          onClick={() => setSettings({ theme: 'light' })}
        >
          ☀️ Claro
        </button>
        <button
          className={`btn${data.settings.theme === 'dark' ? ' primary' : ''}`}
          onClick={() => setSettings({ theme: 'dark' })}
        >
          🌙 Escuro
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Notificações

function NotifySection({
  data,
  setSettings,
}: {
  data: AppData
  setSettings: (p: Partial<AppData['settings']>) => void
}) {
  const permission = notifyPermission()

  return (
    <div className="card section-gap">
      <h3>Lembretes</h3>
      {!notifySupported() ? (
        <p className="muted">Seu navegador não suporta notificações.</p>
      ) : (
        <>
          <p className="muted">
            Aviso no horário definido caso você ainda não tenha feito o check-in de hoje — perfeito
            para não perder a sequência. (O app precisa estar aberto ou instalado.)
          </p>
          <div className="row" style={{ maxWidth: 420, alignItems: 'end' }}>
            <button
              className={`btn${data.settings.notifyEnabled ? ' primary' : ''}`}
              onClick={async () => {
                if (!data.settings.notifyEnabled) {
                  const granted = await requestNotifyPermission()
                  if (!granted) {
                    alert('Permissão de notificação negada. Ative nas configurações do navegador/Windows.')
                    return
                  }
                  setSettings({ notifyEnabled: true })
                  showNotification(
                    'Meu Rewards ✅',
                    'Lembretes ativados! Te aviso se você esquecer o check-in do dia.',
                  )
                } else {
                  setSettings({ notifyEnabled: false })
                }
              }}
            >
              {data.settings.notifyEnabled ? 'Lembretes ativados' : 'Ativar lembretes'}
            </button>
            {permission === 'denied' && (
              <span className="pill warning">Permissão bloqueada no navegador</span>
            )}
          </div>
          {data.settings.notifyEnabled && (
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <Field label="Horário do lembrete">
                <input
                  type="time"
                  value={`${String(data.settings.notifyHour).padStart(2, '0')}:00`}
                  onChange={(e) => setSettings({ notifyHour: Number(e.target.value.split(':')[0]) })}
                />
              </Field>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Dados / Sync / Backup

function DataSection() {
  const { data, importData, syncFileName, syncError, connectSyncFile, disconnectSyncFile, syncNow } =
    useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rewards-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!parsed.accounts) throw new Error('formato inválido')
        if (confirm('Importar vai SUBSTITUIR os dados atuais. Continuar?')) {
          importData(parsed)
        }
      } catch {
        alert('Arquivo inválido.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="card section-gap">
      <h3>Dados e backup</h3>

      <div style={{ marginBottom: 16 }}>
        <strong>Sincronização com OneDrive</strong>
        <p className="muted">
          Conecte um arquivo <code>.json</code> dentro da pasta do OneDrive (ex.:{' '}
          <code>PROJETOS\REWARDS\rewards-data.json</code>) e o app grava nele automaticamente a cada
          alteração. Assim os dados ficam disponíveis no seu PC e celular. Requer Edge ou Chrome.{' '}
          <strong>Nota:</strong> use em um aparelho por vez — o último salvamento vence.
        </p>
        {!fsApiSupported() ? (
          <span className="pill warning">Seu navegador não suporta a sincronização de arquivo</span>
        ) : (
          <div className="row" style={{ flex: 'none', gap: 8 }}>
            <button className="btn primary" onClick={() => void connectSyncFile()}>
              {syncFileName ? 'Trocar arquivo' : 'Conectar arquivo'}
            </button>
            {syncFileName && (
              <>
                <button className="btn" onClick={() => void syncNow()}>
                  Sincronizar agora
                </button>
                <button className="btn danger" onClick={() => void disconnectSyncFile()}>
                  Desconectar
                </button>
              </>
            )}
          </div>
        )}
        {syncFileName && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Conectado a: <strong>{syncFileName}</strong>
            {syncError && <span style={{ color: 'var(--danger)' }}> · erro: {syncError}</span>}
          </p>
        )}
      </div>

      <div>
        <strong>Exportar / importar backup</strong>
        <p className="muted">Exporte um arquivo .json de backup ou restaure de um backup anterior.</p>
        <div className="row" style={{ flex: 'none', gap: 8 }}>
          <button className="btn" onClick={exportFile}>
            Exportar backup
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Importar backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importFile(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
