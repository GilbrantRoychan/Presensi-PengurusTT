'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LogIn, Lock, AlertCircle } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // Ubah username menjadi format email tiruan di balik layar
    const formattedEmail = `${username.trim().toLowerCase()}@presensi.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    })

    if (error) {
      setErrorMsg('Username atau password salah.')
      setLoading(false)
    } else {
      router.push('/admin/scan')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 px-4 py-6 sm:py-10 transition-colors">
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#128243] dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 text-[#128243] dark:text-emerald-400 rounded-xl mb-3 border border-emerald-200/60 dark:border-emerald-800/60">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Login Admin Presensi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Masuk untuk mengelola data generus dan presensi
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128243] transition-colors text-sm"
              placeholder="Masukkan username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128243] transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-3 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold transition-colors shadow-xs flex items-center justify-center gap-2 disabled:bg-slate-400 dark:disabled:bg-slate-700 cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243] focus-visible:ring-offset-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
        </form>
      </div>

      <footer className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-8">
        Pengurus Desa Tamantirto © 2026
      </footer>
    </div>
  )
}