import type { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse o painel da fotógrafa.',
}

export default function LoginPage() {
  return <LoginClient />
}
