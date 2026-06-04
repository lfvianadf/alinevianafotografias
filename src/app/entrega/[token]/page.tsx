import type { Metadata } from 'next'
import DeliveryClient from './delivery-client'

export const metadata: Metadata = {
  title: 'Ensaio Final',
  description: 'Suas fotos estão prontas.',
  robots: { index: false, follow: false },
}

export default function DeliveryPage({ params }: { params: { token: string } }) {
  return <DeliveryClient token={params.token} />
}
