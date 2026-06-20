import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { Toaster } from 'sonner'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#6B1F35',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Aline Viana Fotografias',
    template: '%s — Aline Viana Fotografias',
  },
  description: 'Galeria exclusiva de seleção de fotos — Aline Viana Fotografias.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'AV Fotos',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/image.png',
    apple: '/image.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${GeistSans.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FAF8F6',
              border: '1px solid #E8E4E0',
              color: '#0D0D0D',
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
