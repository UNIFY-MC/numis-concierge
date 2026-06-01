import type { Metadata } from 'next'
import { Fraunces, Outfit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const serif = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
})

const sans = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Moedas do Pinto',
  description: 'Coleção de moedas Euro por país · set · caderneta · não tem',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`h-full antialiased ${serif.variable} ${sans.variable}`}>
      <body className="min-h-full bg-mp-bg text-mp-ink">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
