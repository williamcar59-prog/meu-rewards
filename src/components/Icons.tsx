// Ícones inline (estilo Fluent) — sem dependências externas

interface IconProps {
  size?: number
  className?: string
}

function svg(path: React.ReactNode, { size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export const IconHome = (p: IconProps) =>
  svg(
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>,
    p,
  )

export const IconWallet = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </>,
    p,
  )

export const IconChart = (p: IconProps) =>
  svg(
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>,
    p,
  )

export const IconGift = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8h14v-8" />
      <path d="M12 8v12" />
      <path d="M12 8s-1.5-4-4-4a2 2 0 0 0 0 4Z" />
      <path d="M12 8s1.5-4 4-4a2 2 0 0 1 0 4Z" />
    </>,
    p,
  )

export const IconSettings = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
    p,
  )

export const IconCheck = (p: IconProps) => svg(<path d="m5 12.5 5 5L19 7" />, p)

export const IconPlus = (p: IconProps) =>
  svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>,
    p,
  )

export const IconTrash = (p: IconProps) =>
  svg(
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>,
    p,
  )

export const IconFlame = (p: IconProps) =>
  svg(
    <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C9 10 10 11 11 11c0-3 1-6 1-8Z" />,
    p,
  )

export const IconTarget = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>,
    p,
  )

export const IconCoin = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.2 0 3 6 1.5 6 4.6 0 1.3-1.3 2.2-3 2.2a3.4 3.4 0 0 1-3-1.5" />
    </>,
    p,
  )

export const IconCalendar = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
      <circle cx="8" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </>,
    p,
  )

export const IconPuzzle = (p: IconProps) =>
  svg(
    <>
      <path d="M10 3.5a2 2 0 1 1 4 0H18a1 1 0 0 1 1 1v3.5a2 2 0 1 1 0 4V17a1 1 0 0 1-1 1h-4.5a2 2 0 1 0-4 0H5a1 1 0 0 1-1-1v-3.5a2 2 0 1 0 0-4V4.5a1 1 0 0 1 1-1h5z" />
    </>,
    p,
  )

export const IconChevron = ({
  size = 20,
  className,
  dir = 'right',
}: IconProps & { dir?: 'left' | 'right' }) => {
  const d = dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'
  return svg(<path d={d} />, { size, className })
}
