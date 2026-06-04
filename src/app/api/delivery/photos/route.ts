import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })

    const supabase = adminClient()

    const { data: album } = await supabase
      .from('albums')
      .select('id, name, client_name')
      .eq('delivery_token', token)
      .single()

    if (!album) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 })

    const { data: finalPhotos } = await supabase
      .from('final_photos')
      .select('id, storage_path, filename')
      .eq('album_id', album.id)
      .order('order_index')

    if (!finalPhotos || finalPhotos.length === 0) {
      return NextResponse.json({ photos: [], meta: { album_name: album.name, client_name: album.client_name } })
    }

    const photosWithUrls = await Promise.all(
      finalPhotos.map(async (photo) => {
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(photo.storage_path, 3600)
        return { id: photo.id, filename: photo.filename, signedUrl: data?.signedUrl ?? '' }
      })
    )

    return NextResponse.json({
      photos: photosWithUrls.filter((p) => p.signedUrl),
      meta: { album_name: album.name, client_name: album.client_name },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
