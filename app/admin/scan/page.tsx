'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cardReader } from '@/lib/cardReader'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, UserCheck, UserPlus, Calendar, CheckCircle2, AlertCircle, X, Filter, Image as ImageIcon, CreditCard } from 'lucide-react'

const supabase = createClient()

interface Acara {
  id: string
  nama_acara: string
  tanggal: string
  lokasi: string
}

interface Pengurus {
  id: string
  nama_pengurus: string
  kelompok: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
  qr_code_id?: string
  card_id?: string
}

export default function AdminScanPage() {
  const [acaraList, setAcaraList] = useState<Acara[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [pengurusList, setPengurusList] = useState<Pengurus[]>([])
  const [activeTab, setActiveTab] = useState<'ada' | 'baru'>('ada')
  const [cameraError, setCameraError] = useState('')
  const [scanningImage, setScanningImage] = useState(false)
  const [requestingCamera, setRequestingCamera] = useState(false)
  const [lastScannedCard, setLastScannedCard] = useState<string>('')
  const [isWaitingCardTap, setIsWaitingCardTap] = useState(false)
  const isWaitingCardTapRef = useRef(false)
  isWaitingCardTapRef.current = isWaitingCardTap
  
  // State Input Manual Data Ada
  const [selectedKelompokFilter, setSelectedKelompokFilter] = useState<string>('')
  const [selectedGenerusId, setSelectedGenerusId] = useState<string>('')

  // State Form Generus Baru
  const [namaBaru, setNamaBaru] = useState('')
  const [kelompokBaru, setKelompokBaru] = useState('Gonjen 1')
  const [jkBaru, setJkBaru] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki')
  const [kelasBaru, setKelasBaru] = useState('Pra Remaja')

  // State Toast Notification Floating (Popup)
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'error' | 'warning' }>({
    show: false,
    text: '',
    type: 'success'
  })

  // Ref penanda cegah pindaian berulang beruntun (Debounce)
  const isProcessing = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const startScannerRef = useRef<(() => Promise<void>) | null>(null)
  const processPresensiRef = useRef<((rawCode: string, metode?: 'QR Scan' | 'Card Scan') => Promise<void>) | null>(null)

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchAcara(), fetchPengurus()])
    }

    loadData()
  }, [])

  // Fungsi Tampil Toast Notification Singkat
  const showToast = (text: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, text, type })
    setTimeout(() => {
      setToast({ show: false, text: '', type: 'success' })
    }, 3200)
  }

  // Card Reader Listener useEffect
  useEffect(() => {
    if (!selectedAcara) return

    const handleCardScanned = async (cardId: string) => {
      setLastScannedCard(cardId)

      // Jika mode tunggu scan card belum diaktifkan (user belum klik tombol mulai scan card)
      if (!isWaitingCardTapRef.current) {
        showToast('Mode scan card belum diaktifkan! Silakan klik tombol "Mulai Scan Card ID (RFID)" terlebih dahulu.', 'warning')
        return
      }

      await processPresensiRef.current?.(cardId, 'Card Scan')
    }

    cardReader.startListening(handleCardScanned)

    return () => {
      cardReader.stopListening()
    }
  }, [selectedAcara])

  const handleStartCardScan = () => {
    if (!selectedAcara) {
      showToast('Pilih acara terlebih dahulu!', 'error')
      return
    }
    setIsWaitingCardTap(true)
  }

  // Scanner Kamera
  useEffect(() => {
    if (!selectedAcara) return

    let cancelled = false
    const scanner = new Html5Qrcode('reader')
    scannerRef.current = scanner
    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cameras.length === 0) {
          throw new Error('Kamera tidak ditemukan pada perangkat ini.')
        }

        const camera = cameras.find((item) => /back|rear|environment/i.test(item.label)) || cameras[0]
        await scanner.start(
          camera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await processPresensiRef.current?.(decodedText)
          },
          () => {}
        )
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Akses kamera gagal.'
        setCameraError(
          `${message} Untuk development, gunakan http://localhost atau HTTPS. HTTP melalui alamat IP/LAN diblokir browser.`
        )
      }
    }

    startScannerRef.current = startScanner
    return () => {
      cancelled = true
      const stopScanner = async () => {
        try {
          if (scanner.isScanning) await scanner.stop()
          await scanner.clear()
        } catch {
          // Scanner mungkin belum selesai diinisialisasi saat komponen dilepas.
        }
      }
      stopScanner()
      scannerRef.current = null
      startScannerRef.current = null
    }
  }, [selectedAcara])

  async function fetchAcara() {
    const { data } = await supabase.from('acara').select('*').order('tanggal', { ascending: true })
    if (data && data.length > 0) {
      setAcaraList(data)
      setSelectedAcara(data[0].id)
    }
  }

  async function fetchPengurus() {
    const { data } = await supabase
      .from('pengurus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama_pengurus', { ascending: true })
    if (data) setPengurusList(data)
  }

  // Ambil daftar unik kelompok secara otomatis dari data generus
  const kelompokOptions = Array.from(new Set(pengurusList.map((g) => g.kelompok))).filter(Boolean)

  // Filter daftar pengurus berdasarkan kelompok yang dipilih
  const filteredPengurusList = selectedKelompokFilter
    ? pengurusList.filter((g) => g.kelompok === selectedKelompokFilter)
    : pengurusList

  // Reset Semua Form Input Manual
  const resetForm = () => {
    setSelectedGenerusId('')
    setNamaBaru('')
    setKelompokBaru('Gonjen 1')
    setJkBaru('Laki-laki')
    setKelasBaru('Pra Remaja')
  }

  const getQrCandidates = (rawCode: string) => {
    const code = rawCode.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
    const compactCode = code.replace(/\s+/g, '')
    const candidates = new Set([code, compactCode, compactCode.toUpperCase()])

    try {
      const url = new URL(code)
      url.searchParams.forEach((value, key) => {
        if (/^(id|qr|code|qr_code|qrcode)$/i.test(key) && value) {
          const trimmed = value.trim()
          candidates.add(trimmed)
          candidates.add(trimmed.toUpperCase())
        }
      })
      const pathSegment = url.pathname.split('/').filter(Boolean).pop()
      if (pathSegment) {
        candidates.add(decodeURIComponent(pathSegment).trim())
      }
    } catch {
      // Input bukan URL valid
    }

    return Array.from(candidates).filter(Boolean)
  }

  // Logika Pemrosesan Scan Utama
  const processPresensi = async (rawCode: string, metode: 'QR Scan' | 'Card Scan' = 'QR Scan') => {
    if (isProcessing.current) return
    isProcessing.current = true

    if (!selectedAcara) {
      showToast('Pilih acara terlebih dahulu!', 'error')
      isProcessing.current = false
      return
    }

    try {
      let matchedPengurus: Pengurus | null = null

      if (metode === 'Card Scan') {
        const cleanedCardId = rawCode.trim()
        const { data } = await supabase
          .from('pengurus')
          .select('id, nama_pengurus, kelompok, jenis_kelamin, qr_code_id, card_id')
          .eq('card_id', cleanedCardId)
          .maybeSingle()

        matchedPengurus = data
      } else {
        const candidates = getQrCandidates(rawCode)
        const [byId, byQr] = await Promise.all([
          supabase
            .from('pengurus')
            .select('id, nama_pengurus, kelompok, jenis_kelamin, qr_code_id, card_id')
            .in('id', candidates),
          supabase
            .from('pengurus')
            .select('id, nama_pengurus, kelompok, jenis_kelamin, qr_code_id, card_id')
            .in('qr_code_id', candidates)
        ])

        matchedPengurus = byId.data?.[0] || byQr.data?.[0] || null
      }

      if (!matchedPengurus) {
        showToast(
          metode === 'Card Scan'
            ? `Card ID "${rawCode}" tidak terdaftar!`
            : `Kode QR "${rawCode}" tidak terdaftar!`,
          'error'
        )
        return
      }

      await submitPresensi(matchedPengurus.id, matchedPengurus.nama_pengurus, metode)
    } finally {
      setTimeout(() => {
        isProcessing.current = false
      }, 2500)
    }
  }
  processPresensiRef.current = processPresensi

  const requestCameraAccess = async () => {
    if (requestingCamera) return
    setRequestingCamera(true)
    setCameraError('')

    try {
      if (window.isSecureContext === false) {
        throw new Error('Akses kamera memerlukan HTTPS atau http://localhost.')
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser ini tidak mendukung pembacaan kamera secara langsung.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      stream.getTracks().forEach((track) => track.stop())

      if (startScannerRef.current) {
        await startScannerRef.current()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Izin kamera ditolak.'
      setCameraError(message)
      showToast(message, 'error')
    } finally {
      setRequestingCamera(false)
    }
  }

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !scannerRef.current) return

    setScanningImage(true)
    try {
      const decodedText = await scannerRef.current.scanFile(file, true)
      await processPresensiRef.current?.(decodedText)
    } catch {
      showToast('QR Code tidak terdeteksi dari file gambar yang diunggah.', 'error')
    } finally {
      setScanningImage(false)
      e.target.value = ''
    }
  }

  async function submitPresensi(generusId: string, nama: string, metode: 'QR Scan' | 'Card Scan' | 'Manual Admin') {
    const { data: existing } = await supabase
      .from('presensi')
      .select('id')
      .eq('acara_id', selectedAcara)
      .eq('pengurus_id', generusId)
      .maybeSingle()

    if (existing) {
      showToast(`${nama} sudah tercatat hadir sebelumnya!`, 'error')
      resetForm()
      return
    }

    const { error } = await supabase.from('presensi').insert({
      pengurus_id: generusId,
      acara_id: selectedAcara,
      status: 'Hadir',
      metode: metode
    })

    if (error) {
      showToast(`Gagal mencatat presensi: ${error.message}`, 'error')
    } else {
      showToast(`Berhasil! ${nama} tercatat Hadir (${metode}).`, 'success')
      resetForm()
    }
  }

  // Submit Manual Data Ada
  const handleManualAdaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara || !selectedGenerusId) return
    const gen = pengurusList.find((g) => g.id === selectedGenerusId)
    if (gen) await submitPresensi(gen.id, gen.nama_pengurus, 'Manual Admin')
  }

  // Submit Manual Data Baru
  const handleManualBaruSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara) return

    const generatedQr = `GEN-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: newGen, error } = await supabase
      .from('pengurus')
      .insert({
        nama_pengurus: namaBaru,
        kelompok: kelompokBaru,
        jenis_kelamin: jkBaru,
        qr_code_id: generatedQr
      })
      .select()
      .single()

    if (error || !newGen) {
      showToast('Gagal menambah generus baru.', 'error')
      return
    }

    await fetchPengurus()
    await submitPresensi(newGen.id, newGen.nama_pengurus, 'Manual Admin')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative pb-16">
      
      {/* Toast Popup Notification Floating */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md transition-all duration-300">
          <div
            className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-white ${
              toast.type === 'success'
                ? 'bg-[#128243] border-emerald-600'
                : toast.type === 'warning'
                ? 'bg-amber-600 border-amber-500'
                : 'bg-red-600 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast({ ...toast, show: false })} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bagian Pilihan Acara */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800">
        <label className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
          <Calendar className="w-5 h-5 text-[#128243] dark:text-emerald-400" />
          Pilih Acara Presensi:
        </label>
        <select
          value={selectedAcara}
          onChange={(e) => setSelectedAcara(e.target.value)}
          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-[#128243] font-medium text-sm sm:text-base outline-none cursor-pointer"
        >
          <option value="">-- Pilih Acara Aktif --</option>
          {acaraList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama_acara} - {a.tanggal} ({a.lokasi})
            </option>
          ))}
        </select>
      </div>

      {/* Layout Grid 2 Kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kolom A: Kamera QR & Card Reader Scanner */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 flex flex-col items-center">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 self-start">
            <Camera className="w-5 h-5 text-[#128243] dark:text-emerald-400" />
            Kolom A: Pemindai QR & Card Reader
          </h2>
          <div className="text-xs text-[#128243] dark:text-emerald-400 font-semibold mb-4 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 self-start">
            <CreditCard className="w-3.5 h-3.5" /> Card Reader RFID Ready
          </div>

          {/* Indicator Mode Menunggu Tap Kartu (Tanpa Animasi Kasar) */}
          {isWaitingCardTap && (
            <div className="w-full mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Menunggu Kartu ID Di-tap...
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                Silakan tempelkan kartu RFID ke alat pembaca card reader.
              </p>
              <button
                type="button"
                onClick={() => setIsWaitingCardTap(false)}
                className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline cursor-pointer"
              >
                Batal Menunggu
              </button>
            </div>
          )}

          {!selectedAcara ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-center text-sm">
              Pilih acara di atas untuk mengaktifkan scanner kamera.
            </div>
          ) : (
            <>
              <div id="reader" className="w-full rounded-xl overflow-hidden"></div>
              <button
                type="button"
                onClick={requestCameraAccess}
                disabled={requestingCamera || scanningImage}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-900 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 shadow-xs cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                {requestingCamera ? 'Meminta akses kamera...' : 'Izinkan Akses Kamera'}
              </button>
              <button
                type="button"
                onClick={handleStartCardScan}
                disabled={isWaitingCardTap}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#128243] hover:bg-[#0e6835] px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <CreditCard className="h-4 w-4" />
                {isWaitingCardTap ? 'Menunggu Kartu...' : 'Mulai Scan Card ID (RFID)'}
              </button>

              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
                <ImageIcon className="h-4 w-4 text-[#128243] dark:text-emerald-400" />
                {scanningImage ? 'Membaca gambar...' : 'Scan QR dari Gambar'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageScan}
                  disabled={scanningImage}
                  className="sr-only"
                />
              </label>
              {cameraError && (
                <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-center text-xs text-red-700 dark:text-red-300">
                  {cameraError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Kolom B: Presensi Manual */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4">
            Kolom B: Presensi Manual
          </h2>

          {/* Toggle Tab */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 text-sm">
            <button
              onClick={() => setActiveTab('ada')}
              className={`flex-1 py-2.5 font-bold flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'ada'
                  ? 'border-[#128243] text-[#128243] dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Pilih Data Ada
            </button>
            <button
              onClick={() => setActiveTab('baru')}
              className={`flex-1 py-2.5 font-bold flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'baru'
                  ? 'border-[#128243] text-[#128243] dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" /> + Pengurus Baru
            </button>
          </div>

          {/* Tab 1: Data Ada */}
          {activeTab === 'ada' && (
            <form onSubmit={handleManualAdaSubmit} className="space-y-4">
              
              {/* Filter Pilih Kelompok */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-[#128243] dark:text-emerald-400" /> Filter Kelompok
                </label>
                <select
                  value={selectedKelompokFilter}
                  onChange={(e) => {
                    setSelectedKelompokFilter(e.target.value)
                    setSelectedGenerusId('')
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
                  disabled={!selectedAcara}
                >
                  <option value="">-- Semua Kelompok --</option>
                  {kelompokOptions.map((kel) => (
                    <option key={kel} value={kel}>
                      {kel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Pilih Nama */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Cari Nama Pengurus
                </label>
                <select
                  value={selectedGenerusId}
                  onChange={(e) => setSelectedGenerusId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
                  disabled={!selectedAcara}
                >
                  <option value="">-- Pilih Pengurus --</option>
                  {filteredPengurusList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_pengurus}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedAcara || !selectedGenerusId}
                className="w-full min-h-[44px] py-2.5 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold disabled:bg-slate-300 dark:disabled:bg-slate-800 text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                Submit Presensi
              </button>
            </form>
          )}

          {/* Tab 2: Data Baru */}
          {activeTab === 'baru' && (
            <form onSubmit={handleManualBaruSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan Nama Lengkap"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelompok</label>
                  <select
                    value={kelompokBaru}
                    onChange={(e) => setKelompokBaru(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
                  >
                    <option value="GONJEN 1">GONJEN 1</option>
                    <option value="GONJEN 2">GONJEN 2</option>
                    <option value="KEMBARAN">KEMBARAN</option>
                    <option value="SEMBUNG">SEMBUNG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                  <select
                    value={jkBaru}
                    onChange={(e) => setJkBaru(e.target.value as 'Laki-laki' | 'Perempuan')}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedAcara}
                className="w-full min-h-[44px] py-2.5 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-colors shadow-xs cursor-pointer mt-2"
              >
                Simpan & Catat Presensi
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
