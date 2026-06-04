import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Página não encontrada',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-[11px] tracking-[0.25em] uppercase text-[#6B6460] mb-4">
          Erro 404
        </p>
        <h1
          className="text-5xl font-light text-[#0D0D0D] mb-4 leading-tight"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
        >
          Página não encontrada
        </h1>
        <div className="w-8 h-px bg-[#6B1F35] mx-auto mb-6" />
        <p className="text-sm text-[#6B6460] mb-8">
          O endereço que você tentou acessar não existe ou foi removido.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-[#6B1F35] text-white text-xs tracking-widest uppercase rounded hover:bg-[#3D1020] transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
