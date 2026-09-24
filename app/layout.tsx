import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionTimeout from './session-timeout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Presensi Pengurus Tamantirto',
  description: 'Sistem Pengelolaan Kehadiran & Data Generus Desa Tamantirto',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#128243',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen antialiased text-slate-900 bg-slate-100 dark:bg-[#090d16] dark:text-slate-100 selection:bg-emerald-100 selection:text-emerald-800`}
      >
        <SessionTimeout />
        {children}
      </body>
    </html>
  )
}