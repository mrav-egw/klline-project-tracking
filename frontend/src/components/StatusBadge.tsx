import clsx from 'clsx'

interface StatusBadgeProps {
  paid: boolean
  labelTrue?: string
  labelFalse?: string
}

export function StatusBadge({ paid, labelTrue = 'Bezahlt', labelFalse = 'Offen' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      )}
    >
      {paid ? labelTrue : labelFalse}
    </span>
  )
}
