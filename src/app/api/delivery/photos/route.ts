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

async function getCachedSignedUrls(supabase: ReturnType<typeof adminClient>, paths: string[]) {
  const now = Date.now()
  const urls = new Map<string, string>()
  const missing: string[] = []
  for (const path of Array.from(new Set(paths))) {
    const cached = signedUrlCache.get(path)
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) urls.set(path, cached.url)
    else missing.push(path)
  }
  // Limita cada chamada e substitui centenas de requisições individuais por lotes.
  for (let offset = 0; offset < missing.length; offset += 100) {
    const { data, error } = await supabase.storage.from('albums')
      .createSignedUrls(missing.slice(offset, offset + 100), SIGNED_URL_TTL)
    if (error) throw error
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl) continue
      urls.set(item.path, item.signedUrl)
      signedUrlCache.set(item.path, { url: item.signedUrl, expiresAt: now + SIGNED_URL_TTL * 1000 })
    }
  }
  for (const [path, cached] of Array.from(signedUrlCache)) {
    if (cached.expiresAt <= now) signedUrlCache.delete(path)
  }
  return urls
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

    const urls = await getCachedSignedUrls(supabase, finalPhotos.map(photo => photo.storage_path))
    const uniquePhotos = Array.from(new Map(finalPhotos.map(photo => [photo.storage_path, photo])).values())
    const photosWithUrls = uniquePhotos.map(photo => ({
      id: photo.id,
      filename: photo.filename,
      signedUrl: urls.get(photo.storage_path) ?? '',
      edited: photo.storage_path.startsWith(`finals/${album.id}/`),
    }))

    return NextResponse.json({
      photos: photosWithUrls.filter((p) => p.signedUrl),
      meta: { album_name: album.name, client_name: album.client_name },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
