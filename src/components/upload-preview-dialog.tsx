'use client'

import { useEffect, useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'

interface Props {
  files: File[]
  uploading: boolean
  progress: number
  onConfirm: () => void
  onCancel: () => void
}

export default function UploadPreviewDialog({
  files,
  uploading,
  progress,
  onConfirm,
  onCancel,
}: Props) {
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  if (files.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!uploading ? onCancel : undefined} />
      <div className="relative z-10 w-full max-w-[95vw] sm:max-w-2xl bg-[#FAF8F6] border border-[#E8E4E0] rounded-md shadow-sm flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E0] shrink-0">
          <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
            Confirmar upload
          </h2>
          {!uploading && (
            <button onClick={onCancel} className="text-[#6B6460] hover:text-[#0D0D0D]">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-4 shrink-0">
          <p className="text-sm text-[#6B6460]">
            {files.length} foto{files.length !== 1 ? 's' : ''} selecionada{files.length !== 1 ? 's' : ''} para upload. Confirme antes de enviar.
          </p>
        </div>

        {/* Preview grid */}
        <div className="px-6 pb-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="aspect-square rounded overflow-hidden bg-[#F2EDE8] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={files[i]?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1 py-0.5">
                  <p className="text-[10px] text-white truncate">{files[i]?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="px-6 py-3 border-t border-[#E8E4E0] shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-[#E8E4E0] rounded overflow-hidden">
                <div
                  className="h-full bg-[#6B1F35] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[#6B6460] shrink-0">{progress}%</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E0] shrink-0">
          {!uploading && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs text-[#6B6460] border border-[#E8E4E0] rounded hover:bg-[#F2EDE8] transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-[#6B1F35] text-white text-xs rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 size={13} className="animate-spin" />Enviando…</>
              : <><Upload size={13} />Confirmar upload</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
