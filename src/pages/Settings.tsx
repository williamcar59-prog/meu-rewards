// Página: Configurações — contas, tarefas, tema, notificações, sync e backup

import { useRef, useState } from 'react'
import { useStore } from '../store'
import { Account, AppData, Frequency, Task, uid } from '../types'
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

// ---------------------------------------------------------------- Contas e tarefas

function AccountsSection() {
  const { data, updateAccount, deleteAccount, addAccount } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editingTasks, setEditingTasks] = useState<Account | null>(null)

  return (
    <div className="card section-gap">
      <div className="flex-between">
        <h3 className="mt-0 mb-0">Contas e tarefas</h3>
        <button className="btn small primary" onClick={() => setShowAdd(true)}>
          <IconPlus size={14} /> Nova conta
        </button>
      </div>

      {data.accounts.length === 0 && <p className="muted">Nenhuma conta cadastrada.</p>}

      {data.accounts.map((acc) => (
        <div key={acc.id} className="entry">
          <span className="account-dot" style={{ background: acc.color }} />
          <span className="entry-label">
            <strong>{acc.name}</strong>{' '}
            <span className="muted">
              · {acc.region} · {acc.tasks.filter((t) => t.enabled).length} tarefas ativas
            </span>
          </span>
          <button className="btn small" onClick={() => setEditingTasks(acc)}>
            Editar tarefas
          </button>
          <button
            className="btn small"
            onClick={() => {
              const color = prompt('Cor da conta (hex):', acc.color)
              const region = prompt('Região:', acc.region)
              const patch: Partial<Account> = {}
              if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) patch.color = color
              if (region && region.trim()) patch.region = region.trim()
              if (Object.keys(patch).length > 0) updateAccount(acc.id, patch)
            }}
          >
            Editar
          </button>
          <button
            className="btn small danger"
            title="Excluir conta"
            onClick={() => {
              if (
                confirm(
                  `Excluir "${acc.name}"? Isso apaga TODOS os lançamentos da conta. Não dá para desfazer.`,
                )
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
          onAdd={(name, region) => {
            addAccount(name, region, region === 'EUA' ? 'USD' : 'BRL')
            setShowAdd(false)
          }}
        />
      )}
      {editingTasks && (
        <TasksModal
          account={editingTasks}
          onClose={() => setEditingTasks(null)}
          onSave={(tasks) => {
            updateAccount(editingTasks.id, { tasks })
            setEditingTasks(null)
          }}
        />
      )}
    </div>
  )
}

function AddSimpleAccountModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (name: string, region: string) => void
}) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState('Brasil')
  return (
    <Modal title="Nova conta" onClose={onClose}>
      <Field label="Nome da conta">
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Conta EUA"
        />
      </Field>
      <Field label="Região">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>Brasil</option>
          <option>EUA</option>
          <option>Outro</option>
        </select>
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => name.trim() && onAdd(name.trim(), region)}>
          Criar
        </button>
      </div>
    </Modal>
  )
}

function TasksModal({
  account,
  onClose,
  onSave,
}: {
  account: Account
  onClose: () => void
  onSave: (tasks: Task[]) => void
}) {
  const [tasks, setTasks] = useState<Task[]>(account.tasks)

  const patch = (id: string, p: Partial<Task>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))

  return (
    <Modal title={`Tarefas — ${account.name}`} onClose={onClose}>
      {tasks.map((t) => (
        <div key={t.id} className="entry">
          <input
            type="checkbox"
            checked={t.enabled}
            onChange={(e) => patch(t.id, { enabled: e.target.checked })}
            style={{ width: 'auto', flex: 'none' }}
          />
          <input
            type="text"
            value={t.name}
            onChange={(e) => patch(t.id, { name: e.target.value })}
            style={{ flex: 2 }}
          />
          <input
            type="number"
            min={0}
            value={t.points}
            onChange={(e) => patch(t.id, { points: Number(e.target.value) })}
            style={{ flex: '0 0 84px', textAlign: 'right' }}
          />
          <select
            value={t.frequency}
            onChange={(e) => patch(t.id, { frequency: e.target.value as Frequency })}
            style={{ flex: '0 0 110px' }}
          >
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          <button
            className="btn icon-only small"
            style={{ color: 'var(--danger)', flex: 'none' }}
            onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}
          >
            <IconTrash size={14} />
          </button>
        </div>
      ))}
      <button
        className="btn small"
        style={{ marginTop: 10 }}
        onClick={() =>
          setTasks((ts) => [
            ...ts,
            { id: uid(), name: 'Nova tarefa', points: 10, frequency: 'daily', enabled: true },
          ])
        }
      >
        <IconPlus size={14} /> Adicionar tarefa
      </button>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => onSave(tasks)}>
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
      <div style={{ marginTop: 14, maxWidth: 260 }}>
        <Field label="Cotação USD → BRL (para resgates em dólar)">
          <input
            type="number"
            step="0.01"
            min={0}
            value={data.settings.usdBrlRate}
            onChange={(e) => setSettings({ usdBrlRate: Number(e.target.value) || 0 })}
          />
        </Field>
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
            Aviso no horário definido caso você ainda não tenha registrado nenhuma tarefa do dia —
            perfeito para não perder o streak. (O app precisa estar aberto ou instalado.)
          </p>
          <div className="row" style={{ maxWidth: 420, alignItems: 'end' }}>
            <button
              className={`btn${data.settings.notifyEnabled ? ' primary' : ''}`}
              onClick={async () => {
                if (!data.settings.notifyEnabled) {
                  const granted = await requestNotifyPermission()
                  if (!granted) {
                    alert(
                      'Permissão de notificação negada. Ative nas configurações do navegador/Windows.',
                    )
                    return
                  }
                  setSettings({ notifyEnabled: true })
                  showNotification(
                    'Meu Rewards ✅',
                    'Lembretes ativados! Te aviso se você esquecer os pontos do dia.',
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
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!parsed.accounts || !parsed.entries) throw new Error('formato inválido')
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
          <code>PROJETOS\REWARDS\rewards-data.json</code>) e o app grava nele automaticamente a
          cada alteração. Assim os dados ficam disponíveis no seu PC e celular. Requer Edge ou
          Chrome. <strong>Nota:</strong> use em um aparelho por vez — o último salvamento vence.
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
        <p className="muted">
          Exporte um arquivo .json de backup ou restaure de um backup anterior.
        </p>
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

