'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/lib/types'

interface Props {
  album: Album
  open: boolean
  onClose: () => void
  onSaved: (updated: Album) => void
}

const inputCls =
  'w-full px-4 py-2.5 border border-[#E8E4E0] rounded text-sm bg-white focus:outline-none focus:border-[#6B1F35] transition-colors'

export default function EditAlbumDialog({ album, open, onClose, onSaved }: Props) {
  const [name, setName] = useState(album.name)
  const [clientName, setClientName] = useState(album.client_name)
  const [clientPhone, setClientPhone] = useState(album.client_phone ?? '')
  const [maxSelections, setMaxSelections] = useState(album.max_selections)
  const [expiresAt, setExpiresAt] = useState(
    album.expires_at ? album.expires_at.slice(0, 10) : ''
  )
  const [loading, setLoading] = useState(false)

  // Sincroniza se o album mudar
  useEffect(() => {
    setName(album.name)
    setClientName(album.client_name)
    setClientPhone(album.client_phone ?? '')
    setMaxSelections(album.max_selections)
    setExpiresAt(album.expires_at ? album.expires_at.slice(0, 10) : '')
  }, [album])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('albums')
      .update({
        name: name.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        max_selections: maxSelections,
        expires_at: expiresAt || null,
      })
      .eq('id', album.id)
      .select()
      .single()

    setLoading(false)

    if (error || !data) {
      toast.error('Não foi possível salvar as alterações.')
      return
    }

    toast.success('Álbum atualizado.')
    onSaved(data as Album)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#FAF8F6] border border-[#E8E4E0] rounded-md shadow-sm overflow-y-auto max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E0]">
          <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
            Editar álbum
          </h2>
          <button onClick={onClose} className="text-[#6B6460] hover:text-[#0D0D0D] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Nome do álbum" required>
            <input type="text" required value={name}
              onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Nome da cliente" required>
            <input type="text" required value={clientName}
              onChange={(e) => setClientName(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Telefone da cliente">
            <input type="tel" value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="opcional" className={inputCls} />
          </Field>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-4">
            <Field label="Mínimo de seleções" required>
              <input type="number" required min={1} value={maxSelections}
                onChange={(e) => setMaxSelections(Number(e.target.value))}
                className={inputCls} />
            </Field>

            <Field label="Expira em">
              <input type="date" value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs text-[#6B6460] border border-[#E8E4E0] rounded hover:bg-[#F2EDE8] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#6B1F35] text-white text-xs rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60">
              {loading && <Loader2 size={13} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
        {label}{required && <span className="text-[#6B1F35] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
