import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Reaproveita a mesma signed URL entre requisições (enquanto a instância do servidor
// estiver "quente") para que o navegador da cliente reconheça a URL como já vista e
// sirva do cache HTTP em vez de baixar a imagem de novo a cada revisita à galeria.
const SIGNED_URL_TTL = 24 * 60 * 60 // 24h
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

async function getCachedSignedUrl(
  supabase: ReturnType<typeof adminClient>,
  storagePath: string,
  variantKey: string,
  transform?: { width: number; height: number; resize: 'cover'; quality: number }
) {
  const cacheKey = `${storagePath}::${variantKey}`
  const cached = signedUrlCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.url
  }

  const { data } = await supabase.storage
    .from('albums')
    .createSignedUrl(storagePath, SIGNED_URL_TTL, transform ? { transform } : undefined)

  if (!data?.signedUrl) return null
  signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: now + SIGNED_URL_TTL * 1000 })
  return data.signedUrl
}

export async function POST(request: Request) {
  try {
    const { token, offset = 0, limit = 10 } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch album + photographer via join
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, name, client_name, max_selections, status, expires_at, photographer_id')
      .eq('access_token', token)
      .single()

    if (albumError || !album) {
      return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
    }

    if (album.expires_at && new Date(album.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este álbum expirou.' }, { status: 410 })
    }

    // Total de fotos para calcular hasMore
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', album.id)

    const total = count ?? 0

    if (total === 0) {
      return NextResponse.json({
        photos: [], hasMore: false, total: 0,
        album: buildAlbumPayload(album),
        selectedPhotoIds: [],
      })
    }

    // Busca apenas a página solicitada
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path, filename, order_index')
      .eq('album_id', album.id)
      .order('order_index')
      .range(offset, offset + limit - 1)

    if (!photos || photos.length === 0) {
      return NextResponse.json({ photos: [], hasMore: false, total })
    }

    // Gera signed URLs (full + thumbnail transformado) apenas para este lote,
    // reaproveitando URLs já emitidas para favorecer o cache HTTP do navegador
    const signedResults = await Promise.all(
      photos.map(async (photo) => {
        const [full, thumb] = await Promise.all([
          getCachedSignedUrl(supabase, photo.storage_path, 'full'),
          getCachedSignedUrl(supabase, photo.storage_path, 'thumb', {
            width: 400, height: 300, resize: 'cover', quality: 80,
          }),
        ])
        return {
          id: photo.id,
          filename: photo.filename,
          order_index: photo.order_index,
          signedUrl: full,
          thumbnailUrl: thumb,
        }
      })
    )

    const result: Record<string, unknown> = {
      photos: signedResults.filter((p) => p.signedUrl !== null),
      hasMore: total > offset + limit,
      total,
    }

    // Metadados e seleções confirmadas só precisam ir na primeira página
    if (offset === 0) {
      result.album = buildAlbumPayload(album)
      const { data: existingSelections } = await supabase
        .from('selections')
        .select('photo_id')
        .eq('album_id', album.id)
      result.selectedPhotoIds = (existingSelections ?? []).map((s: { photo_id: string }) => s.photo_id)
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

function buildAlbumPayload(album: {
  name: string
  client_name: string
  max_selections: number
  status: string
}) {
  return {
    name: album.name,
    client_name: album.client_name,
    max_selections: album.max_selections,
    status: album.status,
  }
}
