'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { registerAction } from './actions'
import { loginAction } from '../login/actions'

export default function CadastroClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await registerAction(formData)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setDone(true)

      const loginForm = new FormData()
      loginForm.set('email', formData.get('email') as string)
      loginForm.set('password', formData.get('password') as string)

      const loginResult = await loginAction(loginForm)

      if (loginResult?.error) {
        setError('Conta criada! Faça login para continuar.')
        setDone(false)
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Erro ao conectar. Verifique sua conexão e tente novamente.')
      setLoading(false)
      setDone(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3 bg-white border border-[#E8E4E0] rounded text-sm focus:outline-none focus:border-[#6B1F35] transition-colors placeholder:text-[#C4B8B0]'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] px-4 py-12">
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

        {done ? (
          <div className="text-center space-y-3">
            <Loader2 size={22} className="animate-spin text-[#6B1F35] mx-auto" />
            <p className="text-sm text-[#6B6460]">Entrando na sua conta…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
                Seu nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Ana Lima Fotografia"
                className={inputCls}
              />
            </div>

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
                placeholder="ana@fotografia.com"
                className={inputCls}
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
                autoComplete="new-password"
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-[11px] tracking-widest uppercase text-[#6B6460]">
                Confirmar senha
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                className={inputCls}
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
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#6B6460] mt-8">
          Já tem uma conta?{' '}
          <Link
            href="/login"
            className="text-[#6B1F35] hover:text-[#3D1020] transition-colors underline underline-offset-2"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
