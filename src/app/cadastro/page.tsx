import type { Metadata } from 'next'
import CadastroClient from './cadastro-client'

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta de fotógrafa no FotoSelect.',
}

export default function CadastroPage() {
  return <CadastroClient />
}
