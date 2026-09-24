'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Users, Calendar, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { name: 'Scan / Manual', href: '/admin/scan', icon: QrCode },
    { name: 'Data Pengurus', href: '/admin/pengurus', icon: Users },
    { name: 'Data Acara', href: '/admin/acara', icon: Calendar },
    { name: 'Rekap Edit', href: '/admin/rekap-edit', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header & Navbar Admin */}
      <header className="bg-slate-900 text-white shadow-xs sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Baris Atas: Branding, Navigasi Desktop, Theme Toggle, & Logout */}
          <div className="flex items-center justify-between h-16 gap-3">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg">
              <div className="p-2 bg-[#128243]/20 text-emerald-400 rounded-xl border border-[#128243]/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base tracking-wide text-white">GENERUS TAMANTIRTO</h1>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Panel Admin</p>
              </div>
            </Link>

            {/* Navigasi Desktop */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isActive
                        ? 'bg-[#128243] text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Controls: Theme Switcher & Logout */}
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-red-500/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Baris Bawah: Navigasi Mode HP (Memenuhi batas sentuh 44px) */}
          <div className="md:hidden flex overflow-x-auto py-2.5 gap-2 border-t border-slate-800 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? 'bg-[#128243] text-white shadow-xs'
                      : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-5 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        Generus Tamantirto © 2026
      </footer>
    </div>
  )
}