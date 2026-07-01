'use client'

import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { Download, Loader2 } from 'lucide-react'

type FinalPhotoItem = {
  id: string
  filename: string
  signedUrl: string
  edited: boolean
}

type DeliveryMeta = {
  album_name: string
  client_name: string
}

function PhotoGrid({ photos }: { photos: FinalPhotoItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((photo) => (
        <a
          key={photo.id}
          href={photo.signedUrl}
          download={photo.filename}
          className="group relative rounded overflow-hidden bg-[#F2EDE8] block"
        >
          <div className="aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.signedUrl}
              alt={photo.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow">
              <Download size={16} className="text-[#6B1F35]" />
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

export default function DeliveryClient({ token }: { token: string }) {
  const [photos, setPhotos] = useState<FinalPhotoItem[]>([])
  const [meta, setMeta] = useState<DeliveryMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/delivery/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Link inválido.'); setLoading(false); return }
      setPhotos(data.photos)
      setMeta(data.meta)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleDownloadAll() {
    setDownloading(true)
    const zip = new JSZip()
    for (const photo of photos) {
      const res = await fetch(photo.signedUrl)
      const blob = await res.blob()
      zip.file(photo.filename, blob)
    }
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta?.album_name ?? 'ensaio'}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-[#6B1F35]" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Link inválido
        </h1>
        <p className="text-sm text-[#6B6460]">{error}</p>
      </div>
    </div>
  )

  const editedPhotos = photos.filter((p) => p.edited)
  const originalPhotos = photos.filter((p) => !p.edited)

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <header className="border-b border-[#E8E4E0] bg-[#FAF8F6]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image.png"
              alt="Aline Viana Fotografias"
              className="h-10 object-contain"
            />
            <div className="border-l border-[#E8E4E0] pl-5">
              <p className="text-[11px] tracking-widest uppercase text-[#6B6460]">Ensaio final</p>
              <h1 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                {meta?.album_name}
              </h1>
              <p className="text-sm text-[#6B6460]">{meta?.client_name}</p>
            </div>
          </div>

          <button
            onClick={handleDownloadAll}
            disabled={downloading || photos.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] w-full sm:w-auto bg-[#6B1F35] text-white text-xs tracking-wide rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60 shrink-0"
          >
            {downloading
              ? <><Loader2 size={13} className="animate-spin" />Preparando…</>
              : <><Download size={13} />Baixar todas ({photos.length})</>
            }
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-12">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B6460]">Nenhuma foto disponível ainda.</p>
          </div>
        ) : (
          <>
            {editedPhotos.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-5">
                  <div>
                    <p className="text-[11px] tracking-widest uppercase text-[#6B1F35] font-medium">Editadas</p>
                    <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                      Fotos com edição ({editedPhotos.length})
                    </h2>
                  </div>
                  <div className="flex-1 h-px bg-[#6B1F35]/20" />
                </div>
                <PhotoGrid photos={editedPhotos} />
              </section>
            )}

            {originalPhotos.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-5">
                  <div>
                    <p className="text-[11px] tracking-widest uppercase text-[#6B6460] font-medium">Originais</p>
                    <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                      Fotos sem edição ({originalPhotos.length})
                    </h2>
                  </div>
                  <div className="flex-1 h-px bg-[#E8E4E0]" />
                </div>
                <PhotoGrid photos={originalPhotos} />
              </section>
            )}
          </>
        )}

        <p className="text-center text-xs text-[#6B6460]">
          Clique em cada foto para baixar individualmente, ou use o botão acima para baixar todas de uma vez.
        </p>
      </main>
    </div>
  )
}
