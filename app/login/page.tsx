'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LogIn, Lock } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 pt-13 pb-8 sm:px-6 sm:pt-13 sm:pb-12 lg:pt-13 lg:pb-6">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-full mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Login Admin Presensi</h1>
          <p className="text-sm text-gray-500">Masuk untuk mengelola presensi generus</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-stone-800"
                placeholder="Masukkan username (contoh: admin)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-stone-800"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
        </form>
      </div>
    </div>
  )
}