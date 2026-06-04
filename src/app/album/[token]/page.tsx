import type { Metadata } from 'next'
import AlbumClient from './album-client'

export const metadata: Metadata = {
  title: 'Galeria de Fotos',
  description: 'Selecione suas fotos favoritas.',
  robots: { index: false, follow: false },
}

export default function AlbumPage({ params }: { params: { token: string } }) {
  return <AlbumClient token={params.token} />
}
