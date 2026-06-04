import type { Metadata } from 'next'
import SettingsClient from './settings-client'

export const metadata: Metadata = {
  title: 'Configurações',
  description: "Gerencie seu perfil, logo e marca d'água.",
}

export default function SettingsPage() {
  return <SettingsClient />
}
