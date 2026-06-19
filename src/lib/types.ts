export type Photographer = {
  id: string
  name: string
  email: string
  watermark: string
  logo_url: string | null
  created_at: string
}

export type AlbumStatus = 'aguardando' | 'selecionado' | 'entregue'

export type Album = {
  id: string
  photographer_id: string
  name: string
  client_name: string
  client_phone: string | null
  access_token: string
  max_selections: number
  status: AlbumStatus
  expires_at: string | null
  created_at: string
  delivery_token: string | null
}

export type AlbumWithCounts = Album & {
  photos: { count: number }[]
  selections: { count: number }[]
}

export type Photo = {
  id: string
  album_id: string
  storage_path: string
  filename: string
  order_index: number
  created_at: string
}

export type Selection = {
  id: string
  album_id: string
  photo_id: string
  selected_at: string
}

export type FinalPhoto = {
  id: string
  album_id: string
  storage_path: string
  filename: string
  order_index: number
  created_at: string
}

export type CreateAlbumData = {
  name: string
  client_name: string
  client_phone: string
  max_selections: number
  expires_at: string | null
}
