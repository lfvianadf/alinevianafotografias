'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { AlbumWithCounts } from '@/lib/types'
import AlbumCard from '@/components/album-card'

export default function DashboardClient() {
  const router = useRouter()
  const [albums, setAlbums] = useState<AlbumWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  async function handleDeleteAlbum(albumId: string) {
    if (!confirm('Excluir este álbum e todas as fotos? Esta ação não pode ser desfeita.')) return
    const supabase = createClient()
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('album_id', albumId)
    if (photos && photos.length > 0) {
      await supabase.storage.from('albums').remove(photos.map((p) => p.storage_path))
    }
    const { error } = await supabase.from('albums').delete().eq('id', albumId)
    if (error) { toast.error('Não foi possível excluir o álbum.'); return }
    setAlbums((prev) => prev.filter((a) => a.id !== albumId))
    toast.success('Álbum excluído.')
  }

  async function loadAlbums() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('albums')
      .select('*, photos(count), selections(count)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Não foi possível carregar os álbuns.')
    } else {
      setAlbums((data as AlbumWithCounts[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadAlbums() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-light"
            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
          >
            Álbuns
          </h1>
          {!loading && (
            <p className="text-sm text-[#6B6460] mt-1">
              {albums.length} {albums.length === 1 ? 'álbum' : 'álbuns'}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/albums/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6B1F35] text-white text-xs tracking-widest uppercase rounded hover:bg-[#3D1020] transition-colors"
        >
          <Plus size={14} />
          Novo álbum
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-[#F2EDE8] rounded-md animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[#E8E4E0] rounded-md">
          <p
            className="text-2xl font-light text-[#6B6460] mb-2"
            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
          >
            Nenhum álbum ainda
          </p>
          <p className="text-sm text-[#6B6460] mb-5">
            Crie seu primeiro álbum para começar.
          </p>
          <button
            onClick={() => router.push('/dashboard/albums/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6B1F35] text-white text-xs tracking-widest uppercase rounded hover:bg-[#3D1020] transition-colors mx-auto"
          >
            <Plus size={14} />
            Criar álbum
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} onDelete={handleDeleteAlbum} />
          ))}
        </div>
      )}
    </div>
  )
}
