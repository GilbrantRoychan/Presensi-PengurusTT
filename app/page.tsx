import Link from 'next/link'
import { QrCode, ClipboardList, LogIn, ShieldCheck, ArrowRight } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar with Branding & Theme Switcher */}
      <nav className="w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#128243] dark:text-emerald-400 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-700 dark:text-slate-300">
            PENGURUS TAMANTIRTO
          </span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            PRESENSI DIGITAL PENGURUS
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base leading-relaxed">
            Portal layanan presensi kehadiran, cetak kartu QR Code, dan rekapitulasi data pengurus desa.
          </p>
        </div>

        {/* Action Cards */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-card space-y-3">
          <Link
            href="/login"
            className="group w-full flex items-center justify-between p-4 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243] focus-visible:ring-offset-2 min-h-[52px]"
          >
            <div className="flex items-center gap-3">
              <LogIn className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <span className="block text-sm sm:text-base font-bold">Portal Admin & Petugas</span>
                <span className="block text-xs text-emerald-100 font-normal">Kelola acara, data pengurus, dan scan presensi</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/rekap"
            className="group w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold border border-slate-200/80 dark:border-slate-700/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243] focus-visible:ring-offset-2 min-h-[52px]"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 shrink-0 text-[#128243] dark:text-emerald-400" />
              <div className="text-left">
                <span className="block text-sm sm:text-base font-bold">Rekap Presensi Acara</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">Lihat kehadiran peserta secara publik</span>
              </div>
            </div>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium">
              Publik
            </span>
          </Link>

          <Link
            href="/qrcode"
            className="group w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold border border-slate-200/80 dark:border-slate-700/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243] focus-visible:ring-offset-2 min-h-[52px]"
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 shrink-0 text-[#128243] dark:text-emerald-400" />
              <div className="text-left">
                <span className="block text-sm sm:text-base font-bold">Portal Kartu QR Code</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">Cetak kartu QR individu atau download ZIP</span>
              </div>
            </div>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium">
              Cetak
            </span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        Pengurus Desa Tamantirto © 2026
      </footer>
    </div>
  )
}