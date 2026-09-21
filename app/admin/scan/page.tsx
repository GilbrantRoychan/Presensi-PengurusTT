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
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'error' }>({
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
        if (['id', 'qr', 'qr_code', 'qr_code_id'].includes(key.toLowerCase())) {
          candidates.add(value.trim())
        }
      })
      candidates.add(url.pathname.split('/').filter(Boolean).pop() || '')
    } catch {
      try {
        const parsed = JSON.parse(code)
        ;['id', 'qr', 'qr_code', 'qr_code_id'].forEach((key) => {
          if (typeof parsed?.[key] === 'string') candidates.add(parsed[key].trim())
        })
      } catch {
        // Payload bukan URL atau JSON, gunakan teks mentah.
      }
    }

    return Array.from(candidates).filter(Boolean)
  }

  // Logika Pemrosesan QR Code atau Card Scan
  async function handleProcessPresensi(rawCode: string, metodeScan: 'QR Scan' | 'Card Scan' = 'QR Scan') {
    if (isProcessing.current) return
    isProcessing.current = true

    if (!selectedAcara) {
      showToast('Pilih acara terlebih dahulu!', 'error')
      setTimeout(() => { isProcessing.current = false }, 2000)
      return
    }

    let gen: { id: string; nama_pengurus: string } | null = null

    if (metodeScan === 'Card Scan') {
      const cleanCardId = rawCode.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
      const { data } = await supabase
        .from('pengurus')
        .select('id, nama_pengurus')
        .eq('card_id', cleanCardId)
        .maybeSingle()

      if (data) gen = data
      if (!gen) {
        showToast(`Card ID (${cleanCardId}) tidak terdaftar pada pengurus manapun!`, 'error')
        setTimeout(() => { isProcessing.current = false }, 2500)
        return
      }
      await submitPresensi(gen.id, gen.nama_pengurus, 'Card Scan')
      setTimeout(() => { isProcessing.current = false }, 2500)
      return
    }

    const candidates = getQrCandidates(rawCode)
    let lookupError: { message: string } | null = null

    for (const candidate of candidates) {
      const qrResult = await supabase
        .from('pengurus')
        .select('id, nama_pengurus')
        .eq('qr_code_id', candidate)
        .maybeSingle()

      if (qrResult.error) lookupError = qrResult.error
      if (qrResult.data) {
        gen = qrResult.data
        break
      }

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) {
        const idResult = await supabase
          .from('pengurus')
          .select('id, nama_pengurus')
          .eq('id', candidate)
          .maybeSingle()

        if (idResult.error) lookupError = idResult.error
        if (idResult.data) {
          gen = idResult.data
          break
        }
      }
    }

    if (!gen) {
      const manualPanitiaCandidates = candidates.filter((candidate) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
      )

      for (const candidate of manualPanitiaCandidates) {
        const manualPanitiaResult = await supabase
          .from('acara_panitia')
          .select('nama_manual')
          .eq('id', candidate)
          .eq('acara_id', selectedAcara)
          .is('pengurus_id', null)
          .maybeSingle()

        if (manualPanitiaResult.data?.nama_manual) {
          showToast('Panitia Non Generus tidak perlu scan. Data ini tidak masuk rekap.', 'error')
          setTimeout(() => { isProcessing.current = false }, 2500)
          return
        }
      }
    }

    if (lookupError || !gen) {
      showToast(`Kode QR (${candidates[0] || rawCode.trim()}) tidak ditemukan!`, 'error')
    } else {
      await submitPresensi(gen.id, gen.nama_pengurus, 'QR Scan')
    }

    setTimeout(() => {
      isProcessing.current = false
    }, 2500)
  }

  processPresensiRef.current = handleProcessPresensi

  const handleImageScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0]
    event.target.value = ''
    if (!imageFile || !scannerRef.current) return

    setScanningImage(true)
    setCameraError('')

    try {
      const scanner = scannerRef.current
      if (scanner.isScanning) await scanner.stop()
      const decodedText = await scanner.scanFile(imageFile, true)
      await handleProcessPresensi(decodedText, 'QR Scan')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR Code tidak ditemukan pada gambar.'
      setCameraError(`Gagal membaca gambar: ${message}`)
    } finally {
      setScanningImage(false)
      await startScannerRef.current?.()
    }
  }

  const requestCameraAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser atau perangkat ini tidak mendukung akses kamera.')
      return
    }

    setRequestingCamera(true)
    setCameraError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      if (!scannerRef.current?.isScanning) {
        await startScannerRef.current?.()
      }
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Buka pengaturan situs/browser lalu izinkan kamera.'
        : error instanceof Error
          ? error.message
          : 'Akses kamera gagal.'
      setCameraError(
        `${message} Untuk development, gunakan http://localhost atau HTTPS. HTTP melalui alamat IP/LAN diblokir browser.`
      )
    } finally {
      setRequestingCamera(false)
    }
  }

  // Submit Presensi
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
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
      
      {/* Toast Popup Notification Floating */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md transition-all duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500'
                : toast.type === 'warning'
                ? 'bg-amber-500 border-amber-400 text-slate-900 font-medium'
                : 'bg-red-600 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : toast.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 shrink-0 text-slate-900" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast({ ...toast, show: false })} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bagian Pilihan Acara */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          Pilih Acara Presensi:
        </label>
        <select
          value={selectedAcara}
          onChange={(e) => setSelectedAcara(e.target.value)}
          className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-sm sm:text-base outline-none"
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
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Kolom A: Pemindai QR & Card Reader
          </h2>
          <p className="text-xs text-emerald-600 font-semibold mb-4 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <CreditCard className="w-3.5 h-3.5" /> Card Reader RFID Ready
          </p>

          {/* Indicator Mode Menunggu Tap Kartu */}
          {isWaitingCardTap && (
            <div className="w-full mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col items-center gap-2 animate-pulse">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CreditCard className="w-5 h-5 text-amber-600 animate-bounce" />
                Menunggu Kartu ID Di-tap / Discan...
              </div>
              <p className="text-xs text-amber-700 text-center">
                Silakan tempelkan kartu RFID ke alat pembaca card reader.
              </p>
              <button
                type="button"
                onClick={() => setIsWaitingCardTap(false)}
                className="mt-1 text-xs underline font-semibold text-amber-900 hover:text-amber-700 cursor-pointer"
              >
                Batal Menunggu
              </button>
            </div>
          )}
          {!selectedAcara ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-center text-sm">
              Pilih acara di atas untuk mengaktifkan scanner kamera.
            </div>
          ) : (
            <>
              <div id="reader" className="w-full"></div>
              <button
                type="button"
                onClick={requestCameraAccess}
                disabled={requestingCamera || scanningImage}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Camera className="h-4 w-4" />
                {requestingCamera ? 'Meminta akses kamera...' : 'Izinkan Akses Kamera'}
              </button>
              <button
                type="button"
                onClick={handleStartCardScan}
                disabled={isWaitingCardTap}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                {isWaitingCardTap ? 'Menunggu Kartu...' : 'Mulai Scan Card ID (RFID)'}
              </button>

              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                <ImageIcon className="h-4 w-4" />
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
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">
                  {cameraError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Kolom B: Presensi Manual */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Kolom B: Presensi Manual</h2>

          {/* Toggle Tab */}
          <div className="flex border-b mb-6 text-sm">
            <button
              onClick={() => setActiveTab('ada')}
              className={`flex-1 py-2 font-medium flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'ada' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Pilih Data Ada
            </button>
            <button
              onClick={() => setActiveTab('baru')}
              className={`flex-1 py-2 font-medium flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'baru' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
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
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-slate-700">
                  <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Kelompok
                </label>
                <select
                  value={selectedKelompokFilter}
                  onChange={(e) => {
                    setSelectedKelompokFilter(e.target.value)
                    setSelectedGenerusId('') // Reset pilihan nama jika kelompok berganti
                  }}
                  className="w-full p-2.5 border rounded-lg text-xs sm:text-sm bg-gray-50 focus:bg-white outline-none"
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

              {/* Dropdown Pilih Nama (Tersaring berdasarkan kelompok) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Cari Nama Pengurus</label>
                <select
                  value={selectedGenerusId}
                  onChange={(e) => setSelectedGenerusId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs sm:text-sm bg-white outline-none"
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
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 text-xs sm:text-sm transition"
              >
                Submit Presensi
              </button>
            </form>
          )}

          {/* Tab 2: Data Baru */}
          {activeTab === 'baru' && (
            <form onSubmit={handleManualBaruSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan Nama Lengkap"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  required
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kelompok</label>
                  <select
                    value={kelompokBaru}
                    onChange={(e) => setKelompokBaru(e.target.value)}
                    className="w-full p-2.5 border rounded-lg outline-none bg-white"
                  >
                    <option value="GONJEN 1">GONJEN 1</option>
                    <option value="GONJEN 2">GONJEN 2</option>
                    <option value="KEMBARAN">KEMBARAN</option>
                    <option value="SEMBUNG">SEMBUNG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={jkBaru}
                    onChange={(e) => setJkBaru(e.target.value as 'Laki-laki' | 'Perempuan')}
                    className="w-full p-2.5 border rounded-lg outline-none bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>



              <button
                type="submit"
                disabled={!selectedAcara}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition mt-2"
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
