'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Image
            src="/fbf4c6cd-1451-495d-9aa4-e398d3d5157a.png"
            alt="Aline Viana Fotografias"
            width={180}
            height={56}
            className="object-contain mx-auto mb-4"
            priority
          />
          <div className="w-8 h-px bg-[#6B1F35] mx-auto mt-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-white border border-[#E8E4E0] rounded text-sm focus:outline-none focus:border-[#6B1F35] transition-colors placeholder:text-[#C4B8B0]"
              placeholder="sua@fotografia.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-white border border-[#E8E4E0] rounded text-sm focus:outline-none focus:border-[#6B1F35] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#6B1F35] text-white text-xs tracking-widest uppercase rounded hover:bg-[#3D1020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B6460] mt-8">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="text-[#6B1F35] hover:text-[#3D1020] transition-colors underline underline-offset-2">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
