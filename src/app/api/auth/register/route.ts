import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypassa RLS, usado apenas server-side
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { user_id, name, email } = await request.json()

    if (!user_id || !name || !email) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin.from('photographers').insert({
      id: user_id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      watermark: `© ${name.trim()}`,
    })

    if (error) {
      // Se o perfil já existe (race condition), não é erro crítico
      if (error.code === '23505') {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
