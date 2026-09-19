import Link from 'next/link'
import { QrCode, ClipboardList, LogIn, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans">
      {/* Header Identitas */}
      <header className="pt-14 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#128243]/10 border border-[#128243]/20 text-[#128243] text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-4 h-4" /> Sistem Kehadiran & Data Pengurus
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          PENGURUS DESA TAMANTIRTO
        </h1>
        <p className="text-slate-400 mt-2.5 text-sm sm:text-base max-w-lg mx-auto font-medium">
          Portal Layanan Presensi Digital, Kartu QR Code & Rekapitulasi Data Kehadiran Pengurus
        </p>
      </header>

      {/* Tombol Utama */}
      <main className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700/80 space-y-3.5 backdrop-blur-sm">
          <Link
            href="/login"
            className="w-full flex items-center justify-between p-4 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold shadow-lg shadow-[#128243]/25 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <LogIn className="w-5 h-5" /> Portal Admin / Petugas
            </span>
            <span className="text-xs bg-[#0e6835]/60 px-2.5 py-1 rounded-md font-semibold">Masuk</span>
          </Link>

          <Link
            href="/rekap"
            className="w-full flex items-center justify-between p-4 bg-slate-700/60 hover:bg-slate-700 text-slate-100 rounded-xl font-semibold border border-slate-600/70 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-[#128243]" /> Lihat Rekap Kehadiran
            </span>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md font-medium text-slate-400">Publik</span>
          </Link>

          <Link
            href="/qrcode"
            className="w-full flex items-center justify-between p-4 bg-slate-700/60 hover:bg-slate-700 text-slate-100 rounded-xl font-semibold border border-slate-600/70 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-amber-600" /> Portal Kartu QR Code
            </span>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md font-medium text-slate-400">Cetak</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center text-xs font-medium text-slate-500">
        Pengurus Desa Tamantirto © 2026
      </footer>
    </div>
  )
}