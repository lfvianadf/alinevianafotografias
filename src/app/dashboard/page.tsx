import type { Metadata } from 'next'
import DashboardClient from './dashboard-client'

export const metadata: Metadata = {
  title: 'Álbuns',
  description: 'Gerencie seus álbuns e entregas.',
}

export default function DashboardPage() {
  return <DashboardClient />
}
