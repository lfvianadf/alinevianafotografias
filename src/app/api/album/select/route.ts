import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role: página da cliente não tem auth, precisa bypassar RLS
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { token, photo_ids } = await request.json()

    if (!token || !Array.isArray(photo_ids) || photo_ids.length === 0) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const supabase = adminClient()

    const { data: album, error } = await supabase
      .from('albums')
      .select('id, max_selections, expires_at, status')
      .eq('access_token', token)
      .single()

    if (error || !album) {
      return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
    }

    if (album.expires_at && new Date(album.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este álbum expirou.' }, { status: 410 })
    }

    if (album.status === 'entregue') {
      return NextResponse.json(
        { error: 'Este álbum já foi entregue e não aceita novas seleções.' },
        { status: 409 }
      )
    }

    if (photo_ids.length < album.max_selections) {
      return NextResponse.json(
        { error: `Selecione pelo menos ${album.max_selections} fotos para confirmar.` },
        { status: 422 }
      )
    }

    // Valida que todos os photo_ids pertencem a este álbum
    const { data: validPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('album_id', album.id)
      .in('id', photo_ids)

    if (!validPhotos || validPhotos.length !== photo_ids.length) {
      return NextResponse.json({ error: 'Fotos inválidas.' }, { status: 422 })
    }

    // Substitui seleções atomicamente
    await supabase.from('selections').delete().eq('album_id', album.id)

    const { error: insertError } = await supabase.from('selections').insert(
      photo_ids.map((photo_id: string) => ({ album_id: album.id, photo_id }))
    )

    if (insertError) {
      console.error('[select] insertError:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabase
      .from('albums')
      .update({ status: 'selecionado' })
      .eq('id', album.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
