'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Upload, Loader2, Images, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      <StepDot n={1} label="Informações" active={current === 1} done={current > 1} />
      <div className={`flex-1 h-px mx-3 transition-colors ${current > 1 ? 'bg-[#6B1F35]' : 'bg-[#E8E4E0]'}`} />
      <StepDot n={2} label="Fotos" active={current === 2} done={false} />
    </div>
  )
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        done ? 'bg-[#6B1F35] text-white' : active ? 'bg-[#6B1F35] text-white' : 'bg-[#F2EDE8] text-[#6B6460]'
      }`}>
        {done ? <Check size={14} /> : n}
      </div>
      <span className={`text-[11px] tracking-wide ${active || done ? 'text-[#6B1F35]' : 'text-[#6B6460]'}`}>
        {label}
      </span>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

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

const inputCls = 'w-full px-4 py-3 border border-[#E8E4E0] rounded text-sm bg-white focus:outline-none focus:border-[#6B1F35] transition-colors placeholder:text-[#C4B8B0]'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewAlbumPage() {
  const router = useRouter()
  const supabase = createClient()

  // Step control
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 — info
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [maxSelections, setMaxSelections] = useState(20)
  const [expiresAt, setExpiresAt] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Created album id (after step 1)
  const [albumId, setAlbumId] = useState<string | null>(null)

  // Step 2 — upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: create album ────────────────────────────────────────────────────

  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault()
    setSavingInfo(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada.'); setSavingInfo(false); return }

    const { data, error } = await supabase
      .from('albums')
      .insert({
        photographer_id: user.id,
        name: name.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        max_selections: maxSelections,
        expires_at: expiresAt || null,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Erro ao criar álbum.')
      setSavingInfo(false)
      return
    }

    setAlbumId(data.id)
    setSavingInfo(false)
    setStep(2)
  }

  // ── Step 2: file selection ──────────────────────────────────────────────────

  function handleFilesSelected(files: FileList | File[]) {
    const arr = Array.from(files)
    if (arr.length === 0) return
    previews.forEach((u) => URL.revokeObjectURL(u))
    const urls = arr.map((f) => URL.createObjectURL(f))
    setPendingFiles(arr)
    setPreviews(urls)
  }

  // ── Step 2: upload ──────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!albumId || pendingFiles.length === 0) {
      // Pular — vai direto pro álbum
      router.push(`/dashboard/albums/${albumId}`)
      return
    }

    setUploading(true)
    setProgress(0)

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${albumId}/${unique}`

      const { error: storageErr } = await supabase.storage.from('albums').upload(path, file)
      if (!storageErr) {
        await supabase.from('photos').insert({
          album_id: albumId,
          storage_path: path,
          filename: file.name,
          order_index: i,
        })
      }
      setProgress(Math.round(((i + 1) / pendingFiles.length) * 100))
    }

    setUploading(false)
    toast.success('Álbum criado com sucesso!')
    router.push(`/dashboard/albums/${albumId}`)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-0 sm:px-0">
      {/* Back */}
      <button
        onClick={() => step === 1 ? router.back() : setStep(1)}
        className="flex items-center gap-1.5 text-xs text-[#6B6460] hover:text-[#0D0D0D] transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        {step === 1 ? 'Voltar' : 'Informações'}
      </button>

      <h1
        className="text-4xl font-light mb-2"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        Novo álbum
      </h1>
      <p className="text-sm text-[#6B6460] mb-8">
        {step === 1 ? 'Preencha os dados do ensaio.' : 'Adicione as fotos agora ou depois.'}
      </p>

      <Steps current={step} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleCreateAlbum} className="space-y-5">
          <Field label="Nome do álbum" required>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ensaio Gestante — Junho"
              className={inputCls}
            />
          </Field>

          <Field label="Nome da cliente" required>
            <input
              type="text" required value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ana Beatriz"
              className={inputCls}
            />
          </Field>

          <Field label="Telefone da cliente">
            <input
              type="tel" value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 91234-5678"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mínimo de seleções" required>
              <input
                type="number" required min={1} value={maxSelections}
                onChange={(e) => setMaxSelections(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Expira em">
              <input
                type="date" value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="flex items-center gap-2 px-7 py-3 bg-[#6B1F35] text-white text-xs tracking-wide rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60"
            >
              {savingInfo ? <Loader2 size={14} className="animate-spin" /> : null}
              Continuar
              {!savingInfo && <ArrowRight size={14} />}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFilesSelected(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
              isDragOver ? 'border-[#6B1F35] bg-[#6B1F35]/5' : 'border-[#E8E4E0] hover:border-[#6B1F35]/50 hover:bg-[#F2EDE8]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            />
            {pendingFiles.length > 0 ? (
              <div className="space-y-1">
                <Images size={22} className="text-[#6B1F35] mx-auto" />
                <p className="text-sm text-[#0D0D0D]">
                  {pendingFiles.length} foto{pendingFiles.length !== 1 ? 's' : ''} selecionada{pendingFiles.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-[#6B6460]">Clique para trocar</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={22} className="text-[#6B6460] mx-auto" />
                <p className="text-sm text-[#0D0D0D]">
                  Arraste fotos aqui ou <span className="text-[#6B1F35]">clique para selecionar</span>
                </p>
                <p className="text-xs text-[#6B6460]">JPG, PNG, WEBP — múltiplos arquivos</p>
              </div>
            )}
          </div>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {previews.map((url, i) => (
                <div key={i} className="aspect-square rounded overflow-hidden bg-[#F2EDE8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="h-1.5 bg-[#E8E4E0] rounded overflow-hidden">
                <div className="h-full bg-[#6B1F35] transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-center text-[#6B6460]">Enviando {progress}%…</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/albums/${albumId}`)}
              disabled={uploading}
              className="text-xs text-[#6B6460] hover:text-[#0D0D0D] transition-colors disabled:opacity-40"
            >
              Adicionar fotos depois
            </button>

            <button
              onClick={handleUpload}
              disabled={uploading || pendingFiles.length === 0}
              className="flex items-center gap-2 px-7 py-3 bg-[#6B1F35] text-white text-xs tracking-wide rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" />Enviando…</>
                : <>Criar álbum <ArrowRight size={14} /></>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
