'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { toPng, toJpeg } from 'html-to-image'
import JSZip from 'jszip'
import { ArrowLeft, Search, Download, Folder, Users, Image as ImageIcon, QrCode } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

// Interface untuk data Pengurus
interface Pengurus {
  id: string
  qr_code_id?: string
  nama_pengurus: string
  kelompok: string
  jenis_kelamin?: string
  jabatan?: string
}

interface ManualPanitia {
  id: string
  nama_manual: string
  jabatan: string
}

interface Acara {
  id: string
  nama_acara: string
  tanggal: string
}

type DesignRole = 'participant' | 'panitia'

const supabase = createClient()

export default function QRCodePage() {
  const [pengurusList, setPengurusList] = useState<Pengurus[]>([])
  const [activeKelompok, setActiveKelompok] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png')
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acaraList, setAcaraList] = useState<Acara[]>([])
  const [selectedAcaraId, setSelectedAcaraId] = useState('')
  const [panitiaJabatan, setPanitiaJabatan] = useState<Map<string, string>>(new Map())
  const [manualPanitia, setManualPanitia] = useState<ManualPanitia[]>([])
  const [panitiaDesign, setPanitiaDesign] = useState<string | null>(null)
  const [participantDesign, setParticipantDesign] = useState<string | null>(null)
  const [eventSettingsLoading, setEventSettingsLoading] = useState(false)
  const [eventSettingsError, setEventSettingsError] = useState('')

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const loadPengurus = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('pengurus')
        .select('*')
        .order('kelompok', { ascending: true })
        .order('nama_pengurus', { ascending: true })

      if (data) {
        setPengurusList(data as Pengurus[])
      }
      setLoading(false)
    }

    loadPengurus()
  }, [])

  useEffect(() => {
    const loadAcara = async () => {
      const { data } = await supabase.from('acara').select('id, nama_acara, tanggal').order('tanggal', { ascending: false })
      if (data) {
        setAcaraList(data as Acara[])
        if (data.length > 0) setSelectedAcaraId(data[0].id)
      }
    }
    loadAcara()
  }, [])

  useEffect(() => {
    const loadEventSettings = async () => {
      if (!selectedAcaraId) {
        setPanitiaJabatan(new Map())
        setManualPanitia([])
        setPanitiaDesign(null)
        setParticipantDesign(null)
        setEventSettingsError('')
        setEventSettingsLoading(false)
        return
      }

      setEventSettingsLoading(true)
      setEventSettingsError('')
      const [{ data: committee, error: committeeError }, { data: designRows, error: designError }] = await Promise.all([
        supabase.from('acara_panitia').select('id, pengurus_id, nama_manual, jabatan').eq('acara_id', selectedAcaraId),
        supabase.from('acara_design').select('role, storage_path').eq('acara_id', selectedAcaraId)
      ])
      if (committeeError || designError) {
        setPanitiaJabatan(new Map())
        setManualPanitia([])
        setPanitiaDesign(null)
        setParticipantDesign(null)
        setEventSettingsError('Admin belum menentukan panitia atau desain khusus untuk acara ini.')
        setEventSettingsLoading(false)
        return
      }
      const nextPanitiaJabatan = new Map<string, string>()
      const nextManualPanitia: ManualPanitia[] = []
      for (const item of committee || []) {
        if (item.pengurus_id && item.jabatan) {
          nextPanitiaJabatan.set(item.pengurus_id, item.jabatan)
        }
        if (!item.pengurus_id && item.id && item.nama_manual && item.jabatan) {
          nextPanitiaJabatan.set(item.id, item.jabatan)
          nextManualPanitia.push({
            id: item.id,
            nama_manual: item.nama_manual,
            jabatan: item.jabatan
          })
        }
      }
      setPanitiaJabatan(nextPanitiaJabatan)
      setManualPanitia(nextManualPanitia)
      const nextDesigns: Record<DesignRole, string | null> = { participant: null, panitia: null }
      for (const design of designRows || []) {
        if (design.role === 'participant' || design.role === 'panitia') {
          const role = design.role as DesignRole
          nextDesigns[role] = supabase.storage.from('acara-designs').getPublicUrl(design.storage_path).data.publicUrl
        }
      }
      setParticipantDesign(nextDesigns.participant)
      setPanitiaDesign(nextDesigns.panitia)
      setEventSettingsLoading(false)
    }
    loadEventSettings()
  }, [selectedAcaraId])

  const getDesignForGenerus = (generusId: string) => {
    if (!selectedAcaraId) return null
    return panitiaJabatan.has(generusId) ? panitiaDesign : participantDesign
  }

  const getCardDetails = (pengurus: Pengurus) => {
    const jabatanPanitia = pengurus.jabatan || panitiaJabatan.get(pengurus.id)
    if (jabatanPanitia) return jabatanPanitia.replace(/\s+#[0-9a-f]{8}$/i, '')
    return `${pengurus.jenis_kelamin ? `${pengurus.jenis_kelamin}` : '-'}`.trim()
  }

  const isManualPanitia = (generusId: string) => manualPanitia.some((panitia) => panitia.id === generusId)

  const qrPengurusList: Pengurus[] = [
    ...pengurusList.map((p) => ({
      ...p,
      nama: p.nama_pengurus
    })),
    ...manualPanitia.map((panitia) => ({
      id: panitia.id,
      qr_code_id: panitia.id,
      nama_pengurus: panitia.nama_manual,
      kelompok: 'Panitia Manual',
      jabatan: panitia.jabatan
    }))
  ]

  const kelompokList = Array.from(new Set(qrPengurusList.map((g: any) => g.kelompok || 'Lainnya'))).sort()

  const filteredPengurus = qrPengurusList.filter((g: any) => {
    const matchPanitia = activeKelompok !== 'Panitia' || panitiaJabatan.has(g.id)
    const matchKelompok = activeKelompok === 'Semua' || activeKelompok === 'Panitia' || (g.kelompok || 'Lainnya') === activeKelompok
    const matchSearch =
      (g.nama_pengurus || g.nama || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchPanitia && matchKelompok && matchSearch
  })

  // Pengelompokan data terstruktur dengan tipe Record<string, any[]>
  const groupedPengurus = filteredPengurus.reduce<Record<string, any[]>>((acc, curr) => {
    const k = curr.kelompok || 'Lainnya'
    if (!acc[k]) acc[k] = []
    acc[k].push(curr)
    return acc
  }, {})

  const downloadSingleCard = async (id: string, nama: string, format: 'png' | 'jpg') => {
    const node = cardRefs.current[id]
    if (!node) return

    try {
      const options = { quality: 0.95, pixelRatio: 3, backgroundColor: '#ffffff' }
      const dataUrl = format === 'png' ? await toPng(node, options) : await toJpeg(node, options)

      const link = document.createElement('a')
      const safeName = nama.replace(/[^a-zA-Z0-9]/g, '_')
      link.download = `QRCode_${safeName}.${format}`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Gagal mengunduh gambar QR Code:', err)
      alert('Gagal mengunduh gambar QR Code.')
    }
  }

  const downloadKelompokZip = async (kelompokName: string) => {
    const targetItems = groupedPengurus[kelompokName] || []
    if (targetItems.length === 0) return alert('Tidak ada data QR Code untuk diunduh!')

    setDownloadingZip(true)
    const zip = new JSZip()
    const folder = zip.folder(`QRCode_Kelompok_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}`)
    let downloadedCount = 0

    try {
      for (const g of targetItems) {
        const node = cardRefs.current[g.id]
        if (node) {
          const options = { quality: 0.95, pixelRatio: 3, backgroundColor: '#ffffff' }
          const dataUrl =
            downloadFormat === 'png' ? await toPng(node, options) : await toJpeg(node, options)
          
          const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '')
          const safeNama = g.nama.replace(/[^a-zA-Z0-9]/g, '_')
          folder?.file(`${safeNama}_${g.id}.${downloadFormat}`, base64Data, { base64: true })
          downloadedCount += 1
        }
      }

      if (downloadedCount === 0) {
        throw new Error('Tidak ada kartu QR Code yang berhasil dibuat.')
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const objectUrl = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `QR_Kelompok_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}_${downloadFormat.toUpperCase()}.zip`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Gagal membuat ZIP:', err)
      alert('Terjadi kesalahan saat mengunduh file ZIP.')
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#128243] dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <ThemeToggle />
        </div>

        {/* Page Title & Format Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[#128243] dark:text-emerald-400" />
              Generasi Kartu QR Code Co-Card
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Unduh QR Code siap pakai atau cetak langsung untuk ditempel pada ID Card / Co-Card fisik peserta dan panitia.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-start md:self-auto border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Format:
            </span>
            <button
              onClick={() => setDownloadFormat('png')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                downloadFormat === 'png'
                  ? 'bg-[#128243] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              PNG
            </button>
            <button
              onClick={() => setDownloadFormat('jpg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                downloadFormat === 'jpg'
                  ? 'bg-[#128243] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              JPG
            </button>
          </div>
        </div>

        {/* Acara Selector */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
          <label htmlFor="qrcode-acara" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Pilih Acara untuk Desain Khusus
          </label>
          <select
            id="qrcode-acara"
            value={selectedAcaraId}
            onChange={(e) => setSelectedAcaraId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer font-medium"
          >
            <option value="">Tanpa acara / desain standar</option>
            {acaraList.map((acara) => (
              <option key={acara.id} value={acara.id}>{acara.nama_acara} - {acara.tanggal}</option>
            ))}
          </select>
          {eventSettingsError && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              💡 {eventSettingsError}
            </p>
          )}
        </div>

        {/* Filter Kelompok & Search Bar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 scrollbar-none shadow-xs">
            <button
              onClick={() => setActiveKelompok('Semua')}
              className={`px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                activeKelompok === 'Semua'
                  ? 'bg-[#128243] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" /> Semua Kelompok ({qrPengurusList.length})
            </button>

            <button
              onClick={() => setActiveKelompok('Panitia')}
              className={`px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                activeKelompok === 'Panitia'
                  ? 'bg-[#128243] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Panitia ({panitiaJabatan.size})
            </button>

            {kelompokList.map((kel) => {
              const count = qrPengurusList.filter((g: any) => (g.kelompok || 'Lainnya') === kel).length
              return (
                <button
                  key={kel}
                  onClick={() => setActiveKelompok(kel)}
                  className={`px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                    activeKelompok === kel
                      ? 'bg-[#128243] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Folder className="w-4 h-4 text-[#128243] dark:text-emerald-400" /> {kel} ({count})
                </button>
              )
            })}
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 relative">
            <Search className="w-4 h-4 absolute left-6 top-6 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pengurus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#128243]"
            />
          </div>
        </div>

        {/* Content Section (Simplified Container Stacking) */}
        {loading || eventSettingsLoading ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            Memuat data QR Code...
          </div>
        ) : Object.keys(groupedPengurus).length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            Tidak ada data pengurus yang ditemukan.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPengurus).map(([kelompokName, items]: [string, any[]]) => (
              <div key={kelompokName} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-5 h-5 text-[#128243] dark:text-emerald-400 shrink-0" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{kelompokName}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} Pengurus</p>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadKelompokZip(kelompokName)}
                    disabled={downloadingZip}
                    className="px-4 py-2.5 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer min-h-[40px]"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingZip ? 'Memproses ZIP...' : `Download Semua ${kelompokName} (.ZIP)`}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {items.map((g: any) => (
                    <div
                      key={g.id}
                      className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3.5 transition-colors"
                    >
                      {/* Kartu Co-Card (Menjaga struktur DOM exact untuk html-to-image render) */}
                      <div
                        ref={(el) => {
                          cardRefs.current[g.id] = el
                        }}
                        className={`relative isolate w-full max-w-55 overflow-hidden border border-slate-200 shadow-xs ${
                          getDesignForGenerus(g.id)
                            ? 'aspect-[990/1600] border-0 bg-transparent shadow-none'
                            : 'bg-white p-4 sm:p-5 rounded-xl flex flex-col items-center text-center space-y-3'
                        }`}
                      >
                        {getDesignForGenerus(g.id) ? (
                          <>
                            <div className="absolute left-[15%] top-[35.6%] z-20 h-[calc(55%+16px)] w-[70%] overflow-hidden rounded-[8%] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                              {!isManualPanitia(g.id) && (
                                <p className="absolute left-[5%] top-[6%] w-[90%] truncate text-center text-[clamp(8px,2.4vw,14px)] font-extrabold uppercase leading-none text-emerald-800">
                                  {g.kelompok || 'GENERUS'}
                                </p>
                              )}
                              <div className="absolute left-[18.5%] top-[19%] flex aspect-square w-[63%] items-center justify-center rounded-[5%] bg-white p-[3%] shadow-[0_1px_8px_rgba(0,0,0,0.1)]">
                                <QRCodeSVG
                                  value={g.qr_code_id || g.id}
                                  size={1000}
                                  level="H"
                                  includeMargin={false}
                                  style={{ width: '100%', height: '100%' }}
                                />
                              </div>
                              <div className="absolute left-[5%] top-[72.5%] w-[90%] text-center opacity-100">
                                <p className="line-clamp-2 text-[clamp(8px,2.4vw,14px)] font-extrabold uppercase leading-tight text-black">
                                  {g.nama_pengurus || g.nama}
                                </p>
                                <p className="truncate text-[clamp(6px,1.6vw,10px)] font-semibold leading-none text-gray-500">
                                  {getCardDetails(g)}
                                </p>
                              </div>
                            </div>
                            <Image
                              src={getDesignForGenerus(g.id) as string}
                              alt="Desain name tag"
                              fill
                              unoptimized
                              className="z-0 object-cover"
                            />
                          </>
                        ) : (
                          <>
                            {!isManualPanitia(g.id) && (
                              <span className="relative z-10 px-3 py-1 bg-emerald-50 text-[#128243] rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200">
                                {g.kelompok || 'GENERUS'}
                              </span>
                            )}

                            <div className="relative z-10 p-2.5 bg-white border border-slate-200 rounded-xl shadow-inner">
                              <QRCodeSVG
                                value={g.qr_code_id || g.id}
                                size={135}
                                level="H"
                                includeMargin={false}
                              />
                            </div>

                            <div className="relative z-10 w-full space-y-0.5 pt-1">
                              <h3 className="font-extrabold text-slate-900 text-base leading-tight tracking-tight line-clamp-2 uppercase">
                                {g.nama_pengurus || g.nama}
                              </h3>
                              <p className="text-xs font-semibold text-slate-500">
                                {getCardDetails(g)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tombol Unduh Kartu Individu */}
                      <div className="flex items-center gap-2 w-full max-w-55">
                        <button
                          onClick={() => downloadSingleCard(g.id, g.nama_pengurus || g.nama, downloadFormat)}
                          className="w-full min-h-[38px] py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-[#128243] dark:text-emerald-400" />
                          Download {downloadFormat.toUpperCase()}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}