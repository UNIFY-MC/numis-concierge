import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Numis Concierge',
  description: 'Plataforma de gestão e avaliação de moedas e colecções numismáticas',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full bg-gray-50">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
