'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Photographer } from '@/lib/types'

export default function DashboardHeader({
  photographer,
}: {
  photographer: Photographer | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const nav = [
    { href: '/dashboard', label: 'Álbuns' },
    { href: '/dashboard/settings', label: 'Configurações' },
  ]

  return (
    <header className="border-b border-[#E8E4E0] bg-[#FAF8F6]/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <Image
              src="/fbf4c6cd-1451-495d-9aa4-e398d3d5157a.png"
              alt="Aline Viana Fotografias"
              width={130}
              height={40}
              className="object-contain w-[100px] sm:w-[130px]"
              priority
            />
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  pathname === item.href
                    ? 'bg-[#F2EDE8] text-[#0D0D0D]'
                    : 'text-[#6B6460] hover:text-[#0D0D0D]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {photographer && (
            <span className="hidden sm:block text-xs text-[#6B6460]">
              {photographer.name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B6460] hover:text-[#0D0D0D] transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>

          <button
            className="sm:hidden text-[#6B6460]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-[#E8E4E0] bg-[#FAF8F6] px-6 py-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 text-sm rounded transition-colors ${
                pathname === item.href
                  ? 'bg-[#F2EDE8] text-[#0D0D0D]'
                  : 'text-[#6B6460] hover:text-[#0D0D0D]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B6460] w-full text-left"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </header>
  )
}
