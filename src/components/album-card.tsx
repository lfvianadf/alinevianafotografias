'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Images } from 'lucide-react'
import { AlbumWithCounts } from '@/lib/types'
import { formatDate, buildClientAlbumUrl } from '@/lib/utils'
import StatusBadge from './status-badge'

export default function AlbumCard({ album }: { album: AlbumWithCounts }) {
  const [copied, setCopied] = useState(false)

  const photosCount = album.photos?.[0]?.count ?? 0
  const selectionsCount = album.selections?.[0]?.count ?? 0

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    const url = buildClientAlbumUrl(window.location.origin, album.access_token)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link
      href={`/dashboard/albums/${album.id}`}
      className="group block border border-border rounded-md bg-white hover:border-accent/40 hover:shadow-subtle transition-all p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-light leading-tight truncate group-hover:text-accent transition-colors">
            {album.name}
          </h3>
          <p className="text-xs text-muted mt-0.5 truncate">{album.client_name}</p>
        </div>
        <StatusBadge status={album.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Images size={12} />
          {photosCount} foto{photosCount !== 1 ? 's' : ''}
        </span>
        {selectionsCount > 0 && (
          <span className="text-accent font-medium">
            {selectionsCount}/{album.max_selections} selecionadas
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[11px] text-muted">{formatDate(album.created_at)}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted hover:text-accent transition-colors"
        >
          {copied ? (
            <>
              <Check size={11} className="text-green-600" />
              <span className="text-green-600">Copiado</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              Link da cliente
            </>
          )}
        </button>
      </div>
    </Link>
  )
}
