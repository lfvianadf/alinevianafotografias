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

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch album + photographer via join
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select(
        `id, name, client_name, max_selections, status, expires_at, photographer_id,
         photographers!albums_photographer_id_fkey(watermark, logo_url)`
      )
      .eq('access_token', token)
      .single()

    if (albumError || !album) {
      return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
    }

    if (album.expires_at && new Date(album.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este álbum expirou.' }, { status: 410 })
    }

    // Fetch photos (storage_path never sent to client)
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path, filename, order_index')
      .eq('album_id', album.id)
      .order('order_index')

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        photos: [],
        album: buildAlbumPayload(album),
      })
    }

    // Generate signed URLs in parallel
    const signedResults = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(photo.storage_path, 1800)

        return {
          id: photo.id,
          filename: photo.filename,
          order_index: photo.order_index,
          signedUrl: data?.signedUrl ?? null,
        }
      })
    )

    // Busca seleções existentes
    const { data: existingSelections } = await supabase
      .from('selections')
      .select('photo_id')
      .eq('album_id', album.id)

    return NextResponse.json({
      photos: signedResults.filter((p) => p.signedUrl !== null),
      album: buildAlbumPayload(album),
      selectedPhotoIds: (existingSelections ?? []).map((s: { photo_id: string }) => s.photo_id),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

function buildAlbumPayload(album: {
  name: string
  client_name: string
  max_selections: number
  status: string
  photographers: unknown
}) {
  const pg = album.photographers as { watermark?: string; logo_url?: string } | null
  return {
    name: album.name,
    client_name: album.client_name,
    max_selections: album.max_selections,
    status: album.status,
    watermark: pg?.watermark ?? '© fotógrafa',
    logo_url: pg?.logo_url ?? null,
  }
}
