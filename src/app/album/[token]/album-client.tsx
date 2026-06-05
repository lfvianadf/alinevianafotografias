'use client'

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoItem = {
  id: string
  filename: string
  order_index: number
  signedUrl: string
}

type AlbumMeta = {
  name: string
  client_name: string
  max_selections: number
  status: string
  watermark: string
  logo_url: string | null
}

// ─── Watermark ────────────────────────────────────────────────────────────────

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  text: string,
  logoImg: HTMLImageElement | null
) {
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate(-25 * (Math.PI / 180))

  const tileW = 180
  const tileH = logoImg ? 90 : 60
  const diagonal = Math.ceil(Math.sqrt(W * W + H * H))
  const halfCols = Math.ceil(diagonal / tileW) + 1
  const halfRows = Math.ceil(diagonal / tileH) + 1

  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#0D0D0D'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  for (let row = -halfRows; row <= halfRows; row++) {
    for (let col = -halfCols; col <= halfCols; col++) {
      const cx = col * tileW
      const cy = row * tileH
      let textY = cy + tileH / 2 - 7

      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const maxW = 120, maxH = 60
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight
        let lw = maxW, lh = lw / aspect
        if (lh > maxH) { lh = maxH; lw = lh * aspect }
        ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2 - 8, lw, lh)
        textY = cy - lh / 2 - 8 + lh + 5
      }

      ctx.font = '13px Georgia, "Cormorant Garamond", serif'
      ctx.fillText(text || '© fotógrafa', cx, textY)
    }
  }
  ctx.restore()
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function LightboxCanvas({
  photo,
  watermark,
  logoImg,
}: {
  photo: PhotoItem
  watermark: string
  logoImg: HTMLImageElement | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Limita a 1920px para o lightbox (maior que o grid)
      const maxW = 1920
      const scale = Math.min(1, maxW / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      drawWatermark(ctx, canvas.width, canvas.height, watermark, logoImg)
      setLoaded(true)
    }
    img.src = photo.signedUrl
  }, [photo.signedUrl, watermark, logoImg])

  return (
    <div className="relative flex items-center justify-center min-w-[200px] min-h-[150px]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={[
          'max-h-[85vh] max-w-[85vw] rounded',
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  )
}

function Lightbox({
  photos,
  index,
  watermark,
  logoImg,
  onClose,
  onPrev,
  onNext,
}: {
  photos: PhotoItem[]
  index: number
  watermark: string
  logoImg: HTMLImageElement | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white z-10">
        <X size={24} />
      </button>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 text-white/60 hover:text-white z-10 p-2"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <LightboxCanvas
          photo={photos[index]}
          watermark={watermark}
          logoImg={logoImg}
        />
      </div>

      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-3 text-white/60 hover:text-white z-10 p-2"
        >
          <ChevronRight size={32} />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

// Wrapper memoizado com callbacks estáveis (recebe index + id, sem closures inline)
const MemoPhoto = memo(function MemoPhoto(props: {
  photo: PhotoItem
  index: number
  isSelected: boolean
  isAtLimit: boolean
  onOpen: (index: number) => void
  onToggleSelect: (id: string) => void
  watermark: string
  logoImg: HTMLImageElement | null
  onSignedUrlExpired: (id: string) => void
}) {
  const open = useCallback(() => props.onOpen(props.index), [props.onOpen, props.index])
  const toggle = useCallback(() => props.onToggleSelect(props.photo.id), [props.onToggleSelect, props.photo.id])
  return (
    <PhotoCard
      photo={props.photo}
      isSelected={props.isSelected}
      isAtLimit={props.isAtLimit}
      onOpen={open}
      onToggleSelect={toggle}
      watermark={props.watermark}
      logoImg={props.logoImg}
      onSignedUrlExpired={props.onSignedUrlExpired}
    />
  )
})

const PhotoCard = memo(function PhotoCard({
  photo,
  isSelected,
  isAtLimit,
  onOpen,
  onToggleSelect,
  watermark,
  logoImg,
  onSignedUrlExpired,
}: {
  photo: PhotoItem
  isSelected: boolean
  isAtLimit: boolean
  onOpen: () => void
  onToggleSelect: () => void
  watermark: string
  logoImg: HTMLImageElement | null
  onSignedUrlExpired: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const drawnUrlRef = useRef<string | null>(null)       // evita re-draw desnecessário
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Já desenhado com essa URL — não refaz
    if (drawnUrlRef.current === photo.signedUrl && loaded) return

    setLoaded(false)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const maxW = 900
      const scale = Math.min(1, maxW / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      drawWatermark(ctx, canvas.width, canvas.height, watermark, logoImg)
      drawnUrlRef.current = photo.signedUrl
      setLoaded(true)
    }
    img.onerror = () => onSignedUrlExpired(photo.id)
    img.src = photo.signedUrl
  }, [photo.signedUrl, photo.id, watermark, logoImg, onSignedUrlExpired, loaded])

  useEffect(() => { paint() }, [paint])

  // Long press (mobile selection)
  function handleTouchStart() {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onToggleSelect()
      navigator.vibrate?.(40)
    }, 500)
  }

  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function handleClick() {
    if (didLongPress.current) return
    onOpen()
  }

  return (
    <div
      className={[
        'relative group rounded overflow-hidden cursor-pointer select-none',
        'transition-all duration-150',
        isSelected ? 'ring-2 ring-[#6B1F35] ring-offset-1' : '',
        isAtLimit && !isSelected ? 'opacity-50' : '',
      ].join(' ')}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {/* Container de proporção fixa — evita layout shift */}
      <div className="aspect-[4/3] relative bg-[#EDE8E3]">
        {/* Skeleton animado enquanto carrega */}
        {!loaded && (
          <div className="absolute inset-0 bg-[#EDE8E3] animate-pulse" />
        )}
        <canvas
          ref={canvasRef}
          className={[
            'absolute inset-0 w-full h-full object-cover rounded',
            'transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      </div>

      {/* Checkbox — desktop hover */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isAtLimit || isSelected) onToggleSelect() }}
        className={[
          'absolute top-2 left-2 z-10 rounded-full transition-all duration-150',
          'shadow-sm',
          isSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
        aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
      >
        {isSelected ? (
          <CheckCircle2 size={22} className="text-[#6B1F35] fill-white" />
        ) : (
          <div className="w-[22px] h-[22px] rounded-full border-2 border-white bg-black/30" />
        )}
      </button>

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-[#6B1F35]/10 pointer-events-none rounded" />
      )}
    </div>
  )
})

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ clientName }: { clientName: string }) {
  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#F2EDE8] flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-[#6B1F35]" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-light mb-3" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Seleção confirmada!
        </h1>
        <p className="text-sm text-[#6B6460] leading-relaxed">
          Obrigada, <strong className="text-[#0D0D0D]">{clientName}</strong>. Sua
          seleção foi enviada à fotógrafa. Em breve você receberá as fotos editadas.
        </p>
        <div className="w-8 h-px bg-[#6B1F35] mx-auto mt-6" />
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-light mb-3" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Álbum indisponível
        </h1>
        <p className="text-sm text-[#6B6460]">{message}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <div className="border-b border-[#E8E4E0] px-5 py-4 max-w-5xl mx-auto space-y-2">
        <div className="h-3 w-24 bg-[#F2EDE8] rounded animate-pulse" />
        <div className="h-7 w-56 bg-[#F2EDE8] rounded animate-pulse" />
      </div>
      <div className="max-w-5xl mx-auto px-5 pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-[#F2EDE8] rounded animate-pulse"
            style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AlbumClient({ token }: { token: string }) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [album, setAlbum] = useState<AlbumMeta | null>(null)
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [selections, setSelections] = useState<Set<string>>(new Set())
  const [hadPreviousSelection, setHadPreviousSelection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiredRef = useRef<Set<string>>(new Set())
  const isFirstFetch = useRef(true)
  const lsKey = `album-sel-${token}`

  const saveToStorage = useCallback((ids: Set<string>) => {
    try { localStorage.setItem(lsKey, JSON.stringify(Array.from(ids))) } catch { /* ignore */ }
  }, [lsKey])

  const clearStorage = useCallback(() => {
    try { localStorage.removeItem(lsKey) } catch { /* ignore */ }
  }, [lsKey])

  const fetchPhotos = useCallback(async () => {
    const isFirst = isFirstFetch.current
    try {
      const res = await fetch('/api/album/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (isFirst) { setError(data.error ?? 'Algo deu errado.'); setLoading(false) }
        return
      }

      setPhotos(data.photos)

      if (isFirst) {
        isFirstFetch.current = false
        setAlbum(data.album)
        setLoading(false)

        // Prioridade: localStorage (seleções em andamento) > banco (confirmadas)
        const saved = (() => {
          try { return JSON.parse(localStorage.getItem(lsKey) ?? 'null') } catch { return null }
        })()

        if (saved && Array.isArray(saved) && saved.length > 0) {
          setSelections(new Set(saved))
          // Se também há confirmadas no banco, mantém a flag mas não sobrescreve
          if (data.selectedPhotoIds?.length > 0) setHadPreviousSelection(true)
        } else if (data.selectedPhotoIds?.length > 0) {
          setSelections(new Set(data.selectedPhotoIds))
          setHadPreviousSelection(true)
        }

        if (data.album.logo_url) {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => setLogoImg(img)
          img.onerror = () => setLogoImg(null)
          img.src = data.album.logo_url
        }
      }

      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => fetchPhotos(), 5 * 60 * 60 * 1000)
    } catch {
      if (isFirst) { setError('Não foi possível carregar o álbum. Tente novamente.'); setLoading(false) }
    }
  }, [token, lsKey])

  useEffect(() => {
    fetchPhotos()
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [fetchPhotos])

  const handleSignedUrlExpired = useCallback((id: string) => {
    expiredRef.current.add(id)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => fetchPhotos(), 300)
  }, [fetchPhotos])

  const toggleSelection = useCallback((id: string) => {
    setSelections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveToStorage(next)
      return next
    })
  }, [saveToStorage])

  const handleOpen = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  async function handleConfirm() {
    if (!album || selections.size === 0) return
    setSubmitError('')
    setConfirming(true)

    try {
      const res = await fetch('/api/album/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, photo_ids: Array.from(selections) }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Erro ao confirmar.'); setConfirming(false); return }
      clearStorage()
      setDone(true)
    } catch {
      setSubmitError('Erro de rede. Tente novamente.')
      setConfirming(false)
    }
  }

  if (done && album) return <SuccessScreen clientName={album.client_name} />
  if (error) return <ErrorScreen message={error} />
  if (loading) return <LoadingSkeleton />
  if (!album) return <ErrorScreen message="Álbum não encontrado." />

  const metMinimum = selections.size >= album.max_selections

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      {/* Header */}
      <header className="border-b border-[#E8E4E0] bg-[#FAF8F6]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Image
              src="/fbf4c6cd-1451-495d-9aa4-e398d3d5157a.png"
              alt="Aline Viana Fotografias"
              width={100}
              height={32}
              className="object-contain shrink-0 w-[72px] sm:w-[100px]"
              priority
            />
            <div className="border-l border-[#E8E4E0] pl-3 sm:pl-5 min-w-0">
              <h1 className="text-lg sm:text-2xl font-light leading-tight truncate" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                {album.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#6B6460] truncate">{album.client_name}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-[#6B6460]">
              <span className={['font-semibold text-sm', metMinimum ? 'text-[#6B1F35]' : 'text-[#0D0D0D]'].join(' ')}>
                {selections.size}
              </span>
              <span className="text-[#6B6460]"> de {album.max_selections} mínimo</span>
            </p>
            <p className="text-[11px] text-[#6B6460]">selecionadas</p>
          </div>
        </div>
      </header>

      {/* Instruction / previous selection notice */}
      <div className="max-w-5xl mx-auto px-5 py-3 space-y-2">
        {hadPreviousSelection && (
          <div className="flex items-center gap-2 bg-[#6B1F35]/8 border border-[#6B1F35]/20 rounded px-3 py-2">
            <CheckCircle2 size={14} className="text-[#6B1F35] shrink-0" />
            <p className="text-xs text-[#6B1F35]">
              Você já enviou uma seleção. As fotos marcadas são as que você escolheu anteriormente — você pode alterá-las e confirmar novamente.
            </p>
          </div>
        )}
        <p className="text-xs text-[#6B6460]">
          Toque para visualizar ·{' '}
          <span className="sm:hidden">Segure para selecionar</span>
          <span className="hidden sm:inline">Clique no ✓ para selecionar</span>
          {' '}· Mínimo: {album.max_selections} fotos
        </p>
      </div>

      {/* Grid */}
      <main className="max-w-5xl mx-auto px-5 pb-36">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B6460] text-sm">Nenhuma foto disponível ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {photos.map((photo, i) => (
              <MemoPhoto
                key={photo.id}
                photo={photo}
                index={i}
                isSelected={selections.has(photo.id)}
                isAtLimit={false}
                onOpen={handleOpen}
                onToggleSelect={toggleSelection}
                watermark={album.watermark}
                logoImg={logoImg}
                onSignedUrlExpired={handleSignedUrlExpired}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#FAF8F6]/95 backdrop-blur-sm border-t border-[#E8E4E0]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[#6B6460]">
            {submitError
              ? <span className="text-red-600">{submitError}</span>
              : !metMinimum
                ? `Selecione pelo menos ${album.max_selections} foto${album.max_selections !== 1 ? 's' : ''} para confirmar.`
                : `${selections.size} foto${selections.size !== 1 ? 's' : ''} selecionada${selections.size !== 1 ? 's' : ''}.`}
          </p>
          <button
            onClick={handleConfirm}
            disabled={!metMinimum || confirming}
            className={[
              'w-full sm:w-auto px-8 py-3 rounded text-sm font-medium tracking-wide transition-all',
              metMinimum && !confirming
                ? 'bg-[#6B1F35] text-white hover:bg-[#3D1020]'
                : 'bg-[#E8E4E0] text-[#6B6460] cursor-not-allowed',
            'min-h-[44px]',
            ].join(' ')}
          >
            {confirming
              ? <span className="flex items-center gap-2 justify-center"><Loader2 size={14} className="animate-spin" />Confirmando…</span>
              : hadPreviousSelection ? 'Alterar seleção' : 'Confirmar seleção'}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          watermark={album.watermark}
          logoImg={logoImg}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i)}
          onNext={() => setLightboxIndex(i => i !== null && i < photos.length - 1 ? i + 1 : i)}
        />
      )}
    </div>
  )
}
