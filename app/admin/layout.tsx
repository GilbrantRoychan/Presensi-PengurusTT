'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Users, Calendar, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'

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
    { name: 'Data Pengurus', href: '/admin/generus', icon: Users },
    { name: 'Data Acara', href: '/admin/acara', icon: Calendar },
    { name: 'Rekap Edit', href: '/admin/rekap-edit', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header & Navbar Admin */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Baris Atas: Branding & Tombol Logout */}
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-slate-100">GENERUS TAMANTIRTO</h1>
                <p className="text-[9px] text-slate-400 -mt-1 tracking-wider uppercase font-semibold">Panel Admin</p>
              </div>
            </Link>

            {/* Navigasi Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs sm:text-sm font-medium transition border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Baris Bawah: Navigasi Khusus Mode HP (Mobile Menu) */}
          <div className="md:hidden flex overflow-x-auto py-2.5 gap-2 border-t border-slate-800 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
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
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Generus Tamantirto 2026
      </footer>
    </div>
  )
}