'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import JSZip from 'jszip'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
  GripVertical,
  Loader2,
  Copy,
  Check,
  Pencil,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Album, Photo, Selection, AlbumStatus } from '@/lib/types'
import { formatDate, buildClientAlbumUrl } from '@/lib/utils'
import StatusBadge from '@/components/status-badge'
import EditAlbumDialog from '@/components/edit-album-dialog'
import UploadPreviewDialog from '@/components/upload-preview-dialog'
import FinalDeliveryDialog from '@/components/final-delivery-dialog'

// ─── Sortable Photo Card ────────────────────────────────────────────────────

type PhotoWithUrl = Photo & { signedUrl: string }
type FinalPhotoWithUrl = { id: string; storage_path: string; filename: string; signedUrl: string }

function SortablePhoto({
  photo,
  isSelected,
  onDelete,
}: {
  photo: PhotoWithUrl
  isSelected: boolean
  onDelete: (photo: Photo) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id })
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`relative group rounded border bg-white overflow-hidden ${
        isSelected ? 'ring-2 ring-[#6B1F35]' : 'border-[#E8E4E0]'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1"
      >
        <GripVertical size={14} className="text-[#6B6460]" />
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 size={18} className="text-[#6B1F35] fill-white" />
        </div>
      )}

      {/* Proporção fixa: skeleton sempre ocupa espaço, imagem faz fade-in */}
      <div className="aspect-square bg-[#F2EDE8] overflow-hidden relative">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-[#EDE8E3] animate-pulse" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.signedUrl}
          alt={photo.filename}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      </div>

      <div className="p-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted truncate flex-1">{photo.filename}</span>
        <button
          onClick={() => onDelete(photo)}
          className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Link Card ────────────────────────────────────────────────────────────────

function LinkCard({ label, description, url, accent }: {
  label: string
  description: string
  url: string
  accent?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`border rounded-md p-4 space-y-2 ${accent ? 'border-[#6B1F35]/30 bg-[#6B1F35]/5' : 'border-[#E8E4E0] bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] tracking-widest uppercase font-medium ${accent ? 'text-[#6B1F35]' : 'text-[#6B6460]'}`}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs transition-colors shrink-0 ${accent ? 'text-[#6B1F35] hover:text-[#3D1020]' : 'text-[#6B6460] hover:text-[#0D0D0D]'}`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-[11px] text-[#6B6460]">{description}</p>
      <p className="text-xs text-[#0D0D0D] font-mono truncate bg-[#F2EDE8] rounded px-2 py-1">
        {url}
      </p>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.id as string

  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [selections, setSelections] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [finalOpen, setFinalOpen] = useState(false)
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null)
  const [hasDelivery, setHasDelivery] = useState(false)
  const [finalPhotos, setFinalPhotos] = useState<FinalPhotoWithUrl[]>([])
  const [deletingFinalId, setDeletingFinalId] = useState<string | null>(null)
  const [copiedDelivery, setCopiedDelivery] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [hasMorePhotos, setHasMorePhotos] = useState(false)
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photosSentinelRef = useRef<HTMLDivElement>(null)
  const loadingMorePhotosRef = useRef(false)
  const hasMorePhotosRef = useRef(false)
  const totalPhotosRef = useRef(0)
  const photosCountRef = useRef(0)

  const PHOTO_BATCH = 10

  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => { photosCountRef.current = photos.length }, [photos.length])

  const loadPhotosBatch = useCallback(async (offset: number) => {
    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .order('order_index')
      .range(offset, offset + PHOTO_BATCH - 1)

    if (!photosData || photosData.length === 0) {
      setHasMorePhotos(false)
      hasMorePhotosRef.current = false
      return
    }

    const withUrls = await Promise.all(
      photosData.map(async (photo: Photo) => {
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, signedUrl: data?.signedUrl ?? '' }
      })
    )

    if (offset === 0) {
      setPhotos(withUrls)
    } else {
      setPhotos(prev => [...prev, ...withUrls])
    }

    const hasMore = offset + photosData.length < totalPhotosRef.current
    setHasMorePhotos(hasMore)
    hasMorePhotosRef.current = hasMore
  }, [albumId])

  const loadFinalPhotos = useCallback(async () => {
    const { data } = await supabase
      .from('final_photos')
      .select('id, storage_path, filename')
      .eq('album_id', albumId)
      .order('order_index')

    if (!data || data.length === 0) {
      setFinalPhotos([])
      setHasDelivery(false)
      return
    }

    const withUrls = await Promise.all(
      data.map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from('albums')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, signedUrl: signed?.signedUrl ?? '' }
      })
    )
    setFinalPhotos(withUrls)
    setHasDelivery(true)
  }, [albumId])

  const loadData = useCallback(async () => {
    const [albumRes, selectionsRes, countRes] = await Promise.all([
      supabase.from('albums').select('*').eq('id', albumId).single(),
      supabase.from('selections').select('*').eq('album_id', albumId),
      supabase.from('photos').select('*', { count: 'exact', head: true }).eq('album_id', albumId),
    ])

    if (albumRes.data) {
      setAlbum(albumRes.data)
      setDeliveryToken(albumRes.data.delivery_token ?? null)
    }
    await loadFinalPhotos()
    if (selectionsRes.data) {
      setSelections(new Set(selectionsRes.data.map((s: Selection) => s.photo_id)))
    }

    totalPhotosRef.current = countRes.count ?? 0
    await loadPhotosBatch(0)
    setLoading(false)
  }, [albumId, loadPhotosBatch, loadFinalPhotos])

  useEffect(() => { loadData() }, [loadData])

  // Infinite scroll para fotos
  useEffect(() => {
    if (loading) return
    const sentinel = photosSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMorePhotosRef.current || !hasMorePhotosRef.current) return
      loadingMorePhotosRef.current = true
      setLoadingMorePhotos(true)
      loadPhotosBatch(photosCountRef.current).finally(() => {
        loadingMorePhotosRef.current = false
        setLoadingMorePhotos(false)
      })
    }, { rootMargin: '400px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadPhotosBatch])

  function handleFilesSelected(files: FileList | File[]) {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return
    setPendingFiles(fileArray) // abre preview antes de subir
  }

  async function handleUploadFiles(fileArray: File[]) {
    if (fileArray.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    const uploaded: PhotoWithUrl[] = []

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const ext = file.name.split('.').pop()
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${albumId}/${unique}`

      const { error: storageError } = await supabase.storage
        .from('albums')
        .upload(path, file)

      if (storageError) continue

      const { data: photoData } = await supabase
        .from('photos')
        .insert({
          album_id: albumId,
          storage_path: path,
          filename: file.name,
          order_index: photos.length + uploaded.length,
        })
        .select()
        .single()

      if (photoData) {
        const { data: urlData } = await supabase.storage
          .from('albums')
          .createSignedUrl(photoData.storage_path, 3600)
        uploaded.push({ ...photoData, signedUrl: urlData?.signedUrl ?? '' })
      }
      setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100))
    }

    setPhotos((prev) => [...prev, ...uploaded])
    setUploading(false)
    setUploadProgress(0)
    setPendingFiles([]) // fecha o preview dialog
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} foto${uploaded.length !== 1 ? 's' : ''} enviada${uploaded.length !== 1 ? 's' : ''}.`)
    } else {
      toast.error('Nenhuma foto foi enviada. Verifique os arquivos e tente novamente.')
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex)
    setPhotos(reordered)

    await Promise.all(
      reordered.map((photo, index) =>
        supabase
          .from('photos')
          .update({ order_index: index })
          .eq('id', photo.id)
      )
    )
  }

  async function handleDeletePhoto(photo: Photo) {
    if (!confirm(`Remover "${photo.filename}"?`)) return

    const { error: storageErr } = await supabase.storage
      .from('albums')
      .remove([photo.storage_path])
    const { error: dbErr } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo.id)

    if (storageErr || dbErr) {
      toast.error('Não foi possível remover a foto.')
      return
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    setSelections((prev) => {
      const next = new Set(prev)
      next.delete(photo.id)
      return next
    })
    toast.success('Foto removida.')
  }

  async function handleDeleteFinalPhoto(photo: FinalPhotoWithUrl) {
    if (!confirm(`Remover "${photo.filename}" do ensaio final já publicado?`)) return
    setDeletingFinalId(photo.id)

    // Só remove do Storage as fotos enviadas na entrega (finals/); fotos reaproveitadas
    // do ensaio prévio continuam existindo lá, então não devem ser apagadas aqui.
    if (photo.storage_path.startsWith(`finals/${albumId}/`)) {
      await supabase.storage.from('albums').remove([photo.storage_path])
    }
    const { error } = await supabase.from('final_photos').delete().eq('id', photo.id)

    setDeletingFinalId(null)

    if (error) {
      toast.error('Não foi possível remover a foto.')
      return
    }

    setFinalPhotos((prev) => {
      const next = prev.filter((p) => p.id !== photo.id)
      if (next.length === 0) setHasDelivery(false)
      return next
    })
    toast.success('Foto removida do ensaio final.')
  }

  async function handleDownloadSelected() {
    const selected = photos.filter((p) => selections.has(p.id))
    if (selected.length === 0) return

    setDownloadingZip(true)
    const zip = new JSZip()

    for (const photo of selected) {
      const { data } = await supabase.storage
        .from('albums')
        .createSignedUrl(photo.storage_path, 3600)

      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl)
        const blob = await response.blob()
        zip.file(photo.filename, blob)
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${album?.name ?? 'fotos'}-selecionadas.zip`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadingZip(false)
    toast.success(`${selected.length} foto${selected.length !== 1 ? 's' : ''} baixada${selected.length !== 1 ? 's' : ''}.`)
  }

  async function handleDeleteAlbum() {
    if (!confirm('Excluir este álbum e todas as fotos? Esta ação não pode ser desfeita.')) return
    if (photos.length > 0) {
      await supabase.storage.from('albums').remove(photos.map((p) => p.storage_path))
    }
    const { error } = await supabase.from('albums').delete().eq('id', albumId)
    if (error) { toast.error('Não foi possível excluir o álbum.'); return }
    toast.success('Álbum excluído.')
    router.push('/dashboard')
  }

  async function handleChangeStatus(status: AlbumStatus) {
    const { error } = await supabase
      .from('albums')
      .update({ status })
      .eq('id', albumId)
    if (error) {
      toast.error('Não foi possível atualizar o status.')
      return
    }
    setAlbum((prev) => (prev ? { ...prev, status } : prev))
    toast.success('Status atualizado.')
  }

  function handleCopyLink() {
    if (!album) return
    const url = buildClientAlbumUrl(window.location.origin, album.access_token)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedPhotos = photos.filter((p) => selections.has(p.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  if (!album) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Álbum não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Voltar
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-light">{album.name}</h1>
              <StatusBadge status={album.status} />
            </div>
            <p className="text-sm text-muted">
              {album.client_name}
              {album.client_phone && ` · ${album.client_phone}`}
            </p>
            <p className="text-xs text-muted mt-1">
              Criado em {formatDate(album.created_at)} · Mínimo:{' '}
              {album.max_selections} fotos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#E8E4E0] rounded text-xs hover:bg-[#F2EDE8] transition-colors"
            >
              <Pencil size={13} />
              Editar
            </button>

            <button
              onClick={handleDeleteAlbum}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded text-xs hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={13} />
              Excluir
            </button>

            <button
              onClick={() => setFinalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] text-white text-xs rounded hover:bg-[#2a2a2a] transition-colors"
            >
              <Sparkles size={13} />
              {hasDelivery ? 'Remontar ensaio final' : 'Montar ensaio final'}
            </button>

            {album.status !== 'entregue' && (
              <button
                onClick={() => handleChangeStatus('entregue')}
                className="px-4 py-2 bg-accent text-white text-xs tracking-wide rounded hover:bg-accent-hover transition-colors"
              >
                Marcar como entregue
              </button>
            )}

            {album.status === 'selecionado' && selectedPhotos.length > 0 && (
              <button
                onClick={handleDownloadSelected}
                disabled={downloadingZip}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs rounded hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {downloadingZip ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Baixar selecionadas ({selectedPhotos.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Links section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LinkCard
          label="Link de seleção"
          description="Envie para a cliente escolher as fotos"
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/album/${album.access_token}`}
        />
        {hasDelivery && deliveryToken && (
          <LinkCard
            label="Link do ensaio final"
            description="Fotos editadas para a cliente baixar"
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/entrega/${deliveryToken}`}
            accent
          />
        )}
      </div>

      {/* Ensaio final — gerenciar fotos já publicadas */}
      {finalPhotos.length > 0 && (
        <div className="border border-border rounded-md p-6 bg-surface/40">
          <h2 className="font-display text-xl font-light mb-4">
            Fotos do ensaio final ({finalPhotos.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {finalPhotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded overflow-hidden border border-[#E8E4E0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.signedUrl} alt={photo.filename} className="w-full h-full object-cover" loading="lazy" />
                <button
                  onClick={() => handleDeleteFinalPhoto(photo)}
                  disabled={deletingFinalId === photo.id}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-60"
                  aria-label="Remover foto do ensaio final"
                >
                  {deletingFinalId === photo.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          handleFilesSelected(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50 hover:bg-surface/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        />
        {uploading ? (
          <div className="space-y-2">
            <Loader2 size={22} className="animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted">Enviando… {uploadProgress}%</p>
            <div className="w-48 h-1 bg-border rounded mx-auto overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={22} className="text-muted mx-auto" />
            <p className="text-sm text-foreground">
              Arraste fotos aqui ou <span className="text-accent">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted">JPG, PNG, WEBP — múltiplos arquivos</p>
          </div>
        )}
      </div>

      {/* Selections Panel — acima do grid */}
      {selectedPhotos.length > 0 && (
        <div className="border border-border rounded-md p-6 bg-surface/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-light">
              Selecionadas pela cliente ({selectedPhotos.length} · mínimo {album.max_selections})
            </h2>
            <button
              onClick={handleDownloadSelected}
              disabled={downloadingZip}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Baixar ZIP
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {selectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded overflow-hidden border border-[#6B1F35]/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.signedUrl}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
            ))}
          </div>
        </div>
      )}

      {selectedPhotos.length === 0 && photos.length > 0 && (
        <div className="text-center py-6 border border-dashed border-[#E8E4E0] rounded text-sm text-[#6B6460]">
          A cliente ainda não fez seleções.
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-light mb-4">
            Fotos ({totalPhotosRef.current > 0 ? totalPhotosRef.current : photos.length})
          </h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map((photo) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    isSelected={selections.has(photo.id)}
                    onDelete={handleDeletePhoto}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div ref={photosSentinelRef} className="flex justify-center py-4">
            {loadingMorePhotos && <Loader2 size={18} className="animate-spin text-muted" />}
          </div>
        </div>
      )}

      {album && (
        <EditAlbumDialog
          album={album}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setAlbum(updated)}
        />
      )}

      {album && (
        <FinalDeliveryDialog
          album={album}
          selectedPhotos={selectedPhotos}
          open={finalOpen}
          onClose={() => setFinalOpen(false)}
          onDeliveryCreated={(token) => { setDeliveryToken(token); loadFinalPhotos() }}
        />
      )}

      <UploadPreviewDialog
        files={pendingFiles}
        uploading={uploading}
        progress={uploadProgress}
        onConfirm={() => handleUploadFiles(pendingFiles)}
        onCancel={() => setPendingFiles([])}
      />
    </div>
  )
}
