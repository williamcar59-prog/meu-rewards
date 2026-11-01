// Notificações do navegador (lembretes de streak)

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function notifyPermission(): NotificationPermission | 'unsupported' {
  if (!notifySupported()) return 'unsupported'
  return Notification.permission
}

export function showNotification(title: string, body: string): void {
  if (!notifySupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: './icon.svg',
      tag: 'rewards-reminder',
    })
  } catch {
    // ignore
  }
}
