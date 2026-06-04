'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateAlbumData } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const empty: CreateAlbumData = {
  name: '',
  client_name: '',
  client_email: '',
  max_selections: 20,
  expires_at: null,
}

export default function CreateAlbumDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateAlbumData>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof CreateAlbumData>(key: K, value: CreateAlbumData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('albums').insert({
      photographer_id: user.id,
      name: form.name,
      client_name: form.client_name,
      client_email: form.client_email || null,
      max_selections: form.max_selections,
      expires_at: form.expires_at || null,
    })

    if (err) {
      setError('Erro ao criar álbum. Tente novamente.')
      setLoading(false)
      return
    }

    setForm(empty)
    setLoading(false)
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-background border border-border rounded-md shadow-subtle">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-2xl font-light">Novo álbum</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Nome do álbum" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ensaio Gestante — Junho"
              className="field-input"
            />
          </Field>

          <Field label="Nome da cliente" required>
            <input
              type="text"
              required
              value={form.client_name}
              onChange={(e) => set('client_name', e.target.value)}
              placeholder="Ana Beatriz"
              className="field-input"
            />
          </Field>

          <Field label="Email da cliente">
            <input
              type="email"
              value={form.client_email}
              onChange={(e) => set('client_email', e.target.value)}
              placeholder="ana@email.com"
              className="field-input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Limite de seleções" required>
              <input
                type="number"
                required
                min={1}
                value={form.max_selections}
                onChange={(e) => set('max_selections', Number(e.target.value))}
                className="field-input"
              />
            </Field>

            <Field label="Expira em">
              <input
                type="date"
                value={form.expires_at ?? ''}
                onChange={(e) => set('expires_at', e.target.value || null)}
                className="field-input"
              />
            </Field>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-muted hover:text-foreground border border-border rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-accent text-white text-xs tracking-wide rounded hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Criar álbum
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          padding: 0.625rem 1rem;
          border: 1px solid #E8E4E0;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: #6B1F35;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs tracking-widest uppercase text-muted">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
