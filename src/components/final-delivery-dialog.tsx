'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Upload, Loader2, Copy, Check, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/lib/types'

interface Props {
  album: Album
  existingFinalPaths: string[]
  open: boolean
  onClose: () => void
  onDeliveryCreated?: (token: string) => void
}

export default function FinalDeliveryDialog({ album, existingFinalPaths, open, onClose, onDeliveryCreated }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFiles([])
      setPreviews([])
      setDeliveryToken(null)
      setProgress(0)
    }
  }, [open])

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  async function handleUpload() {
    setUploading(true)
    setProgress(0)

    const supabase = createClient()

    // Busca TODAS as fotos do ensaio inicial
    const { data: allPhotos } = await supabase
      .from('photos')
      .select('id, storage_path, filename, order_index')
      .eq('album_id', album.id)
      .order('order_index')

    const existingPathSet = new Set(existingFinalPaths)

    // Conta quantas entradas já existem para continuar o order_index
    const { count: currentCount } = await supabase
      .from('final_photos')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', album.id)

    const entries: { storage_path: string; filename: string; order_index: number }[] = []
    let nextOrder = currentCount ?? 0

    // Todas as fotos do ensaio inicial que ainda não estão no final entram automaticamente
    for (const photo of allPhotos ?? []) {
      if (!existingPathSet.has(photo.storage_path)) {
        entries.push({ storage_path: photo.storage_path, filename: photo.filename, order_index: nextOrder++ })
      }
    }

    // Fotos editadas enviadas pela fotógrafa
    const totalFiles = files.length
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `finals/${album.id}/${unique}`

      const { error } = await supabase.storage.from('albums').upload(path, file)
      if (!error) {
        entries.push({ storage_path: path, filename: file.name, order_index: nextOrder++ })
      }
      setProgress(Math.round(((i + 1) / Math.max(totalFiles, 1)) * 100))
    }

    if (entries.length > 0) {
      await supabase.from('final_photos').insert(
        entries.map((p) => ({ ...p, album_id: album.id }))
      )
    }

    // Garante delivery_token no álbum
    const { data: albumData } = await supabase
      .from('albums')
      .select('delivery_token')
      .eq('id', album.id)
      .single()

    let token = albumData?.delivery_token ?? null

    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      await supabase.from('albums').update({ delivery_token: token }).eq('id', album.id)
    }

    setDeliveryToken(token)
    if (token) onDeliveryCreated?.(token)
    setUploading(false)
    toast.success(`Ensaio final publicado com ${entries.length} foto${entries.length !== 1 ? 's' : ''}.`)
  }

  function handleCopyLink() {
    if (!deliveryToken) return
    const url = `${window.location.origin}/entrega/${deliveryToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!uploading ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-[95vw] sm:max-w-xl bg-[#FAF8F6] border border-[#E8E4E0] rounded-md shadow-sm flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E0] shrink-0">
          <div>
            <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
              Ensaio final
            </h2>
            <p className="text-xs text-[#6B6460] mt-0.5">
              Todas as fotos do ensaio inicial entram automaticamente. Adicione as editadas abaixo.
            </p>
          </div>
          {!uploading && (
            <button onClick={onClose} className="text-[#6B6460] hover:text-[#0D0D0D]">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
          {!deliveryToken && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-[#E8E4E0] rounded hover:border-[#6B1F35]/50 hover:bg-[#F2EDE8]/50 transition-colors disabled:opacity-50"
              >
                <ImagePlus size={22} className="text-[#6B6460]" />
                <span className="text-sm text-[#6B6460]">
                  {files.length > 0
                    ? `${files.length} foto${files.length !== 1 ? 's' : ''} editada${files.length !== 1 ? 's' : ''} — clique para trocar`
                    : 'Clique para adicionar fotos editadas (opcional)'}
                </span>
                <span className="text-xs text-[#6B6460]/60">JPG, PNG — múltiplos arquivos</span>
              </button>
            </div>
          )}

          {files.length > 0 && !deliveryToken && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previews.map((url, i) => (
                <div key={i} className="aspect-square rounded overflow-hidden bg-[#F2EDE8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={files[i]?.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="h-1.5 bg-[#E8E4E0] rounded overflow-hidden">
                <div className="h-full bg-[#6B1F35] transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-[#6B6460] text-center">Enviando {progress}%…</p>
            </div>
          )}

          {deliveryToken && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3">
                <Check size={15} />
                <span className="text-sm">Ensaio final publicado com sucesso!</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs tracking-widest uppercase text-[#6B6460]">Link para a cliente</p>
                <div className="flex items-center gap-2 p-3 bg-[#F2EDE8] rounded border border-[#E8E4E0]">
                  <span className="text-xs text-[#0D0D0D] flex-1 truncate font-mono">
                    {window.location.origin}/entrega/{deliveryToken}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1.5 text-xs text-[#6B1F35] hover:text-[#3D1020] transition-colors"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B6460]">
                  A cliente pode visualizar e baixar todas as fotos por este link.
                </p>
              </div>
            </div>
          )}
        </div>

        {!deliveryToken && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E0] shrink-0">
            {!uploading && (
              <button onClick={onClose} className="px-4 py-2 text-xs text-[#6B6460] border border-[#E8E4E0] rounded hover:bg-[#F2EDE8] transition-colors">
                Cancelar
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-2 bg-[#6B1F35] text-white text-xs rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60"
            >
              {uploading
                ? <><Loader2 size={13} className="animate-spin" />Publicando…</>
                : <><Upload size={13} />Publicar ensaio final</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
