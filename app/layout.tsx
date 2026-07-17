import type { Metadata } from 'next'
import { Fraunces, Inter, Outfit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const serif = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
})

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

// Tipografia do tema FLX (display + UI numa só família variável)
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

// Corre antes do primeiro paint: repõe o skin guardado sem flash.
const skinInit = `try{var s=localStorage.getItem('numis_skin');if(s)document.documentElement.dataset.skin=s}catch(e){}`

export const metadata: Metadata = {
  title: 'Moedas do Pinto',
  description: 'Coleção de moedas Euro por país · set · caderneta · não tem',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT" data-skin="flx" className={`h-full antialiased ${serif.variable} ${sans.variable} ${outfit.variable}`}>
      <body className="min-h-full bg-mp-bg text-mp-ink">
        <script dangerouslySetInnerHTML={{ __html: skinInit }} />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
