'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import ThemeToggle from '@/components/theme-toggle'

type AcaraItem = {
  id: string
  nama_acara: string
  tanggal: string
  lokasi?: string
  koor?: string
}

type PengurusItem = {
  id: string
  nama_pengurus: string
  kelompok: string
  jenis_kelamin: string
  status_dapukan?: string[]
}

type PresensiEntry = {
  status: 'Hadir' | 'Izin' | 'Alpa / Belum Presensi'
  alasan: string
  metode: string
}

export default function RekapPage() {
  const supabase = useMemo(() => createClient(), [])
  const [acaraList, setAcaraList] = useState<AcaraItem[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [pengurusList, setPengurusList] = useState<PengurusItem[]>([])
  const [presensiMap, setPresensiMap] = useState<Record<string, PresensiEntry>>({})

  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [selectedJK, setSelectedJK] = useState<string>('Semua')
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua')
  const [selectedStatusDapukan, setSelectedStatusDapukan] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedAcaraObj = useMemo(
    () => acaraList.find((acara) => acara.id === selectedAcara) ?? null,
    [acaraList, selectedAcara],
  )

  const fetchAcara = useCallback(async () => {
    const { data } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: true })

    if (data) {
      setAcaraList(data as AcaraItem[])
    }
  }, [supabase])

  const fetchRekapData = useCallback(async () => {
    if (!selectedAcara) return

    setLoading(true)

    const { data: pengurusData } = await supabase
      .from('pengurus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama_pengurus', { ascending: true })

    const { data: presensiData } = await supabase
      .from('presensi')
      .select('*')
      .eq('acara_id', selectedAcara)

    if (pengurusData) {
      setPengurusList(pengurusData as PengurusItem[])

      const nextMap: Record<string, PresensiEntry> = {}
      pengurusData.forEach((pengurus) => {
        nextMap[pengurus.id] = {
          status: 'Alpa / Belum Presensi',
          alasan: '-',
          metode: '-',
        }
      })

      if (presensiData) {
        presensiData.forEach((entry) => {
          let currentStatus: PresensiEntry['status'] = 'Alpa / Belum Presensi'

          if (
            entry.status === 'sakit' ||
            entry.status === 'Sakit' ||
            entry.status === 'izin' ||
            entry.status === 'Izin'
          ) {
            currentStatus = 'Izin'
          } else if (entry.status === 'hadir' || entry.status === 'Hadir') {
            currentStatus = 'Hadir'
          }

          nextMap[entry.pengurus_id] = {
            status: currentStatus,
            alasan: entry.alasan || '-',
            metode: entry.metode || 'Manual',
          }
        })
      }

      setPresensiMap(nextMap)
    }

    setLoading(false)
  }, [selectedAcara, supabase])

  useEffect(() => {
    fetchAcara()
  }, [fetchAcara])

  useEffect(() => {
    if (selectedAcara) {
      fetchRekapData()
    }
  }, [fetchRekapData, selectedAcara])

  const filteredPengurus = useMemo(() => {
    return pengurusList.filter((pengurus) => {
      const statusPengurus = presensiMap[pengurus.id]?.status || 'Alpa / Belum Presensi'
      const matchKelompok = selectedKelompok === 'Semua' || pengurus.kelompok === selectedKelompok
      const matchJK = selectedJK === 'Semua' || pengurus.jenis_kelamin === selectedJK
      const matchStatus = selectedStatus === 'Semua' || statusPengurus === selectedStatus
      const matchStatusDapukan =
        selectedStatusDapukan === 'Semua' ||
        (Array.isArray(pengurus.status_dapukan) && pengurus.status_dapukan.includes(selectedStatusDapukan))
      const matchSearch =
        pengurus.nama_pengurus.toLowerCase().includes(searchQuery.toLowerCase())

      return matchKelompok && matchJK && matchStatus && matchStatusDapukan && matchSearch
    })
  }, [pengurusList, presensiMap, selectedKelompok, selectedJK, selectedStatus, selectedStatusDapukan, searchQuery])

  const { totalPengurus, totalHadir, totalIzin, totalAlpa, persentaseHadir } = useMemo(() => {
    let hadir = 0
    let izin = 0
    let alpa = 0
    filteredPengurus.forEach((pengurus) => {
      const status = presensiMap[pengurus.id]?.status
      if (status === 'Hadir') hadir += 1
      else if (status === 'Izin') izin += 1
      else alpa += 1
    })
    const total = filteredPengurus.length
    const persentase = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0'
    return {
      totalPengurus: total,
      totalHadir: hadir,
      totalIzin: izin,
      totalAlpa: alpa,
      persentaseHadir: persentase,
    }
  }, [filteredPengurus, presensiMap])

  const handleExportExcel = () => {
    if (!selectedAcaraObj) {
      alert('Pilih acara terlebih dahulu!')
      return
    }

    const dataToExport = filteredPengurus.map((pengurus, index) => {
      const pData = presensiMap[pengurus.id] || {
        status: 'Alpa / Belum Presensi',
        alasan: '-',
        metode: '-',
      }

      return {
        No: index + 1,
        'Nama Lengkap': pengurus.nama_pengurus,
        'Jenis Kelamin': pengurus.jenis_kelamin,
        Kelompok: pengurus.kelompok,
        'Status Kehadiran': pData.status,
        'Alasan (Izin)': pData.alasan,
        'Metode Presensi': pData.metode,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi')

    const namaAcaraClean = selectedAcaraObj.nama_acara.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Rekap_Presensi_${namaAcaraClean}_${selectedAcaraObj.tanggal}.xlsx`

    XLSX.writeFile(workbook, filename)
  }

  const handlePrintPDF = () => {
    if (!selectedAcara) {
      alert('Pilih acara terlebih dahulu!')
      return
    }

    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 print:bg-white print:p-0 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 print:max-w-none print:p-0 print:m-0">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            body {
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .dark {
              color-scheme: light !important;
            }

            .dark .bg-\[\#090d16\],
            .dark .bg-slate-900,
            .dark .bg-slate-800 {
              background-color: white !important;
              color: black !important;
            }

            .dark .text-slate-100,
            .dark .text-slate-300,
            .dark .text-slate-400,
            .dark .text-white,
            .dark .text-emerald-400,
            .dark .text-amber-400 {
              color: black !important;
            }

            .dark .border-slate-800,
            .dark .border-slate-700,
            .dark .border-emerald-800\/60,
            .dark .border-amber-800\/60 {
              border-color: #d1d5db !important;
            }

            .dark .bg-emerald-950\/40,
            .dark .bg-amber-950\/40 {
              background-color: transparent !important;
            }

            body * {
              visibility: hidden;
            }

            #print-area,
            #print-area * {
              visibility: visible;
            }

            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }

            .no-print {
              display: none !important;
            }

            .print-border-table th,
            .print-border-table td {
              border: 1px solid #d1d5db !important;
            }
          }
        `}</style>

        {/* Header Bar Publik */}
        <div className="no-print flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#128243] dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <ThemeToggle />
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 space-y-4 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Rekap Presensi Publik
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Laporan ringkasan dan persentase kehadiran pengurus per acara.
              </p>
            </div>

            {selectedAcara && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 min-h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-[#128243] dark:text-emerald-400" /> Export Excel
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="px-4 py-2.5 min-h-[40px] bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak / PDF
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Pilih Acara</label>
              <select
                value={selectedAcara}
                onChange={(e) => setSelectedAcara(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] font-medium cursor-pointer"
              >
                <option value="">-- Pilih Acara --</option>
                {acaraList.map((acara) => (
                  <option key={acara.id} value={acara.id}>
                    {acara.nama_acara} - {acara.tanggal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filter Kelompok</label>
              <select
                value={selectedKelompok}
                onChange={(e) => setSelectedKelompok(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
              >
                <option value="Semua">Semua Kelompok</option>
                <option value="GONJEN 1">GONJEN 1</option>
                <option value="GONJEN 2">GONJEN 2</option>
                <option value="KEMBARAN">KEMBARAN</option>
                <option value="SEMBUNG">SEMBUNG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filter Status Dapukan</label>
              <select
                value={selectedStatusDapukan}
                onChange={(e) => setSelectedStatusDapukan(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
              >
                <option value="Semua">Semua Status Dapukan</option>
                <option value="Kelompok">Kelompok</option>
                <option value="Desa">Desa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filter Jenis Kelamin</label>
              <select
                value={selectedJK}
                onChange={(e) => setSelectedJK(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
              >
                <option value="Semua">Semua Jenis Kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filter Status Kehadiran</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer font-medium"
              >
                <option value="Semua">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Alpa / Belum Presensi">Alpa / Belum Presensi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Area Print & Content */}
        <div id="print-area" className="space-y-4">


          {selectedAcaraObj && (
            <div className="hidden print:block mb-4">
              <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4 text-center">
                <h1 className="text-xl font-black tracking-wide text-gray-900 uppercase">
                  LAPORAN REKAPITULASI PRESENSI
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-800 font-medium mb-4">
                <div>
                  <span className="font-bold">Nama Acara:</span> {selectedAcaraObj.nama_acara?.toUpperCase()}
                </div>
                <div>
                  <span className="font-bold">Tanggal:</span> {selectedAcaraObj.tanggal}
                </div>
                <div>
                  <span className="font-bold">Lokasi:</span> {selectedAcaraObj.lokasi || '-'}
                </div>
                <div>
                  <span className="font-bold">Koordinator:</span> {selectedAcaraObj.koor || '-'}
                </div>
              </div>
            </div>
          )}

          {selectedAcara && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:gap-2 mb-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 print:rounded-none print:border-gray-300 shadow-card flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Pengurus</p>
                <p className="text-2xl print:text-lg font-extrabold text-slate-900 dark:text-white mt-1">{totalPengurus}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 print:rounded-none print:border-gray-300 shadow-card flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Hadir</p>
                <p className="text-2xl print:text-lg font-extrabold text-[#128243] dark:text-emerald-400 print:text-gray-900 mt-1">{totalHadir}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 print:rounded-none print:border-gray-300 shadow-card flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Izin</p>
                <p className="text-2xl print:text-lg font-extrabold text-amber-600 dark:text-amber-400 print:text-gray-900 mt-1">{totalIzin}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 print:rounded-none print:border-gray-300 shadow-card flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Alpa</p>
                <p className="text-2xl print:text-lg font-extrabold text-slate-500 dark:text-slate-400 print:text-gray-900 mt-1">{totalAlpa}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 print:rounded-none print:border-gray-300 shadow-card flex flex-col justify-between col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Kehadiran</p>
                <p className="text-2xl print:text-lg font-extrabold text-[#128243] dark:text-emerald-400 print:text-gray-900 mt-1">{persentaseHadir}%</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 relative no-print">
            <Search className="w-4 h-4 absolute left-6 top-6 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau kelompok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243]"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl print:rounded-none shadow-card print:shadow-none border border-slate-200/90 dark:border-slate-800 print:border-none overflow-hidden">
            {!selectedAcara ? (
              <div className="p-12 text-center text-slate-400 font-medium text-sm no-print">
                Silakan pilih acara terlebih dahulu untuk melihat rekap kehadiran.
              </div>
            ) : loading ? (
              <div className="p-12 text-center text-slate-400 font-medium text-sm no-print">Memuat data rekap...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm print:text-xs print-border-table border-collapse">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 print:bg-white border-b border-slate-200 dark:border-slate-700 text-xs print:text-[11px] uppercase text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-3.5 print:p-2 border-gray-200 w-2/5">NAMA PENGURUS</th>
                      <th className="p-3.5 print:p-2 border-gray-200 w-1/4">KELOMPOK</th>
                      <th className="p-3.5 print:p-2 border-gray-200 w-1/5">STATUS KEHADIRAN</th>
                      <th className="p-3.5 print:p-2 border-gray-200">ALASAN (IZIN / SAKIT)</th>
                      <th className="p-3.5 print:p-2 border-gray-200 text-center no-print">METODE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-300">
                    {filteredPengurus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                          Tidak ada data pengurus yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPengurus.map((pengurus) => {
                        const pData = presensiMap[pengurus.id] || {
                          status: 'Alpa / Belum Presensi',
                          alasan: '-',
                          metode: '-',
                        }

                        return (
                          <tr key={pengurus.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 print:p-2 border-gray-200">
                              <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wide print:text-[11px]">
                                {pengurus.nama_pengurus}
                              </div>
                              <div className="text-xs print:text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                {pengurus.jenis_kelamin}
                              </div>
                            </td>
                            <td className="p-3.5 print:p-2 border-gray-200 text-slate-700 dark:text-slate-300 font-medium">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 print:border-none print:p-0 rounded-md text-xs font-semibold">
                                {pengurus.kelompok}
                              </span>
                            </td>
                            <td className="p-3.5 print:p-2 border-gray-200">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 print:px-0 print:py-0 rounded-md print:rounded-none text-xs print:text-[11px] font-semibold ${
                                  pData.status === 'Hadir'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#128243] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 print:bg-transparent print:text-black print:border-none'
                                    : pData.status === 'Izin'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 print:bg-transparent print:text-black print:border-none'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 print:bg-transparent print:text-black print:border-none'
                                }`}
                              >
                                {pData.status}
                              </span>
                            </td>
                            <td className="p-3.5 print:p-2 border-gray-200 text-slate-700 dark:text-slate-300 text-xs print:text-[11px]">
                              {pData.alasan}
                            </td>
                            <td className="p-3.5 print:p-2 border-gray-200 text-center text-xs text-slate-400 font-mono no-print">
                              {pData.metode}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
