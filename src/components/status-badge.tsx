import { AlbumStatus } from '@/lib/types'

const config: Record<AlbumStatus, { label: string; className: string }> = {
  aguardando: {
    label: 'Aguardando',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  selecionado: {
    label: 'Selecionado',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  entregue: {
    label: 'Entregue',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
}

export default function StatusBadge({ status }: { status: AlbumStatus }) {
  const { label, className } = config[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded border ${className}`}
    >
      {label}
    </span>
  )
}
