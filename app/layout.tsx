import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionTimeout from './session-timeout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Presensi Pengurus Tamantirto',
  description: 'Sistem Pengelolaan Kehadiran & Data Generus',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full antialiased text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-700`}>
        <SessionTimeout />
        {children}
      </body>
    </html>
  )
}