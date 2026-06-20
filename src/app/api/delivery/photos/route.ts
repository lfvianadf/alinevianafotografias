import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Reaproveita a mesma signed URL entre requisições para favorecer o cache HTTP
// do navegador da cliente em revisitas à página de entrega.
const SIGNED_URL_TTL = 24 * 60 * 60 // 24h
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

async function getCachedSignedUrl(supabase: ReturnType<typeof adminClient>, storagePath: string) {
  const cached = signedUrlCache.get(storagePath)
  const now = Date.now()
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.url
  }
  const { data } = await supabase.storage.from('albums').createSignedUrl(storagePath, SIGNED_URL_TTL)
  if (!data?.signedUrl) return null
  signedUrlCache.set(storagePath, { url: data.signedUrl, expiresAt: now + SIGNED_URL_TTL * 1000 })
  return data.signedUrl
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
        const signedUrl = await getCachedSignedUrl(supabase, photo.storage_path)
        const edited = photo.storage_path.startsWith(`finals/${album.id}/`)
        return { id: photo.id, filename: photo.filename, signedUrl: signedUrl ?? '', edited }
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
