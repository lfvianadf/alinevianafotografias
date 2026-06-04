'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, Upload, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Photographer } from '@/lib/types'

// ─── Canvas watermark preview ─────────────────────────────────────────────────

function WatermarkCanvas({
  logoUrl,
  watermarkText,
}: {
  logoUrl: string | null
  watermarkText: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background placeholder representing a photo
    ctx.fillStyle = '#E8E4E0'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#C4B8B0'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('prévia da foto', W / 2, H / 2)

    function drawTiles(c: CanvasRenderingContext2D, img: HTMLImageElement | null) {
      c.save()
      c.translate(W / 2, H / 2)
      c.rotate(-25 * (Math.PI / 180))

      const tileW = 180
      const tileH = img ? 90 : 60
      const diagonal = Math.ceil(Math.sqrt(W * W + H * H))
      const halfCols = Math.ceil(diagonal / tileW) + 1
      const halfRows = Math.ceil(diagonal / tileH) + 1

      c.globalAlpha = 0.28
      c.fillStyle = '#0D0D0D'
      c.textAlign = 'center'
      c.textBaseline = 'top'

      for (let row = -halfRows; row <= halfRows; row++) {
        for (let col = -halfCols; col <= halfCols; col++) {
          const cx = col * tileW
          const cy = row * tileH
          let textY = cy + tileH / 2 - 7

          if (img && img.complete && img.naturalWidth > 0) {
            const maxW = 120
            const maxH = 60
            const aspect = img.naturalWidth / img.naturalHeight
            let lw = maxW
            let lh = lw / aspect
            if (lh > maxH) { lh = maxH; lw = lh * aspect }
            c.drawImage(img, cx - lw / 2, cy - lh / 2 - 8, lw, lh)
            textY = cy - lh / 2 - 8 + lh + 5
          }

          c.font = '13px Georgia, "Cormorant Garamond", serif'
          c.fillText(watermarkText || '© fotógrafa', cx, textY)
        }
      }
      c.restore()
    }

    if (logoUrl) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => drawTiles(ctx, img)
      img.onerror = () => drawTiles(ctx, null)
      img.src = logoUrl
    } else {
      drawTiles(ctx, null)
    }
  }, [logoUrl, watermarkText])

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={260}
      className="rounded border border-border w-full"
    />
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-md bg-white p-6 space-y-5">
      <h2
        className="text-xl font-light pb-4 border-b border-border"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-4 py-2.5 border border-[#E8E4E0] rounded text-sm bg-white focus:outline-none focus:border-[#6B1F35] transition-colors'

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveBtn({
  loading,
  children = 'Salvar',
}: {
  loading: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#6B1F35] text-white text-xs tracking-wide rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsClient() {
  const supabase = createClient()
  const [photographer, setPhotographer] = useState<Photographer | null>(null)

  // Profile
  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Watermark
  const [watermarkText, setWatermarkText] = useState('')
  const [savingWatermark, setSavingWatermark] = useState(false)

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setPhotographer(data)
        setName(data.name ?? '')
        setWatermarkText(data.watermark ?? '')
        setLogoUrl(data.logo_url ?? null)
      }
    }
    load()
  }, [])

  // ── Save profile name ───────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!photographer || !name.trim()) return
    setSavingProfile(true)
    const { error } = await supabase
      .from('photographers')
      .update({ name: name.trim() })
      .eq('id', photographer.id)
    setSavingProfile(false)
    if (error) {
      toast.error('Não foi possível salvar o nome.')
    } else {
      toast.success('Nome atualizado.')
    }
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !photographer) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A logo deve ter menos de 5 MB.')
      return
    }

    setUploadingLogo(true)
    const path = `${photographer.id}/logo.png`

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error('Erro ao enviar a logo.')
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    const { error: dbError } = await supabase
      .from('photographers')
      .update({ logo_url: data.publicUrl })
      .eq('id', photographer.id)

    if (dbError) {
      toast.error('Logo enviada, mas erro ao salvar no perfil.')
    } else {
      setLogoUrl(publicUrl)
      toast.success('Logo atualizada.')
    }
    setUploadingLogo(false)
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = ''
  }

  // ── Save watermark text ─────────────────────────────────────────────────────

  async function handleSaveWatermark(e: React.FormEvent) {
    e.preventDefault()
    if (!photographer) return
    setSavingWatermark(true)
    const { error } = await supabase
      .from('photographers')
      .update({ watermark: watermarkText.trim() })
      .eq('id', photographer.id)
    setSavingWatermark(false)
    if (error) {
      toast.error("Não foi possível salvar a marca d'água.")
    } else {
      toast.success("Marca d'água atualizada.")
    }
  }

  // ── Change password ─────────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    setSavingPwd(true)

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      toast.error('Sessão inválida. Faça login novamente.')
      setSavingPwd(false)
      return
    }

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (reAuthError) {
      toast.error('Senha atual incorreta.')
      setSavingPwd(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPwd(false)

    if (error) {
      toast.error('Não foi possível alterar a senha.')
    } else {
      toast.success('Senha alterada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="mb-8">
        <h1
          className="text-3xl font-light"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
        >
          Configurações
        </h1>
        <p className="text-sm text-[#6B6460] mt-1">
          Gerencie seu perfil, logo e marca d'água.
        </p>
      </div>

      {/* ── Profile ── */}
      <Section title="Perfil">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Field label="Nome">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end">
            <SaveBtn loading={savingProfile} />
          </div>
        </form>
      </Section>

      {/* ── Logo ── */}
      <Section title="Logo da fotógrafa">
        <p className="text-xs text-[#6B6460]">
          PNG com fundo transparente recomendado. Exibida sobre as fotos junto com o
          texto da marca d'água.
        </p>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 shrink-0 border border-border rounded bg-surface flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={80}
                height={80}
                className="object-contain p-2"
              />
            ) : (
              <span className="text-[11px] text-[#6B6460]">sem logo</span>
            )}
          </div>
          <div className="space-y-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded text-xs hover:bg-surface transition-colors disabled:opacity-60"
            >
              {uploadingLogo ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              {logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="text-[11px] text-[#6B6460]">PNG, WEBP ou SVG · máx. 5 MB</p>
          </div>
        </div>
      </Section>

      {/* ── Watermark ── */}
      <Section title={"Marca d'água"}>
        <form onSubmit={handleSaveWatermark} className="space-y-4">
          <Field label="Texto">
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="© seu estúdio"
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end">
            <SaveBtn loading={savingWatermark} />
          </div>
        </form>

        <div className="pt-2 space-y-2">
          <p className="text-[11px] tracking-widest uppercase text-[#6B6460]">
            Prévia ao vivo
          </p>
          <WatermarkCanvas logoUrl={logoUrl} watermarkText={watermarkText} />
          <p className="text-[11px] text-[#6B6460]">
            A prévia usa os valores atuais dos campos — salve para persistir.
          </p>
        </div>
      </Section>

      {/* ── Password ── */}
      <Section title="Alterar senha">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Senha atual">
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6460] hover:text-foreground"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="Nova senha">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={inputCls}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end">
            <SaveBtn loading={savingPwd}>Alterar senha</SaveBtn>
          </div>
        </form>
      </Section>
    </div>
  )
}
