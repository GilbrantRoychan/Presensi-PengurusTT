'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cardReader } from '@/lib/cardReader'
import * as XLSX from 'xlsx'
import {
  Users,
  Search,
  Plus,
  Upload,
  Edit,
  Trash2,
  X,
  Check,
  FileSpreadsheet,
  Filter,
  Download,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

// Interface Data Pengurus
interface Pengurus {
  id?: string
  nama_pengurus: string
  kelompok: string
  jenis_kelamin: string
  dapukan?: string[]
  status_dapukan?: string[]
  qr_code?: string
  qr_code_id?: string
  card_id?: string
}

const DAPUKAN_OPTIONS = [
  'Kyai',
  'Wakil Kyai',
  'KU',
  'Penerobos kelompok',
  'Penerobos Desa',
  'Mubaligh',
]

const STATUS_DAPUKAN_OPTIONS = ['Kelompok', 'Desa']

// Urutan prioritas kelompok kustom
const KELOMPOK_ORDER = ['GONJEN 1', 'GONJEN 2', 'KEMBARAN', 'SEMBUNG']

const normalizeExcelKey = (key: unknown) =>
  String(key ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const toExcelText = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) return fallback
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

const normalizeJenisKelamin = (value: unknown) => {
  const normalized = toExcelText(value).toLowerCase()
  if (/^(p|pr|perempuan|wanita|female|f)$/.test(normalized)) return 'Perempuan'
  if (/^(l|lk|laki[- ]?laki|pria|male|m)$/.test(normalized)) return 'Laki-laki'
  return normalized ? toExcelText(value) : 'Laki-laki'
}

// Helper function untuk mengurutkan: Kelompok -> Nama Pengurus
const sortPengurus = (data: Pengurus[]) => {
  return [...data].sort((a, b) => {
    const orderA = KELOMPOK_ORDER.indexOf(a.kelompok)
    const orderB = KELOMPOK_ORDER.indexOf(b.kelompok)

    if (orderA !== -1 && orderB !== -1) {
      if (orderA !== orderB) {
        return orderA - orderB
      }
    } else if (orderA !== -1) {
      return -1
    } else if (orderB !== -1) {
      return 1
    } else {
      const kelCompare = (a.kelompok || '').localeCompare(b.kelompok || '')
      if (kelCompare !== 0) return kelCompare
    }

    return a.nama_pengurus.localeCompare(b.nama_pengurus)
  })
}

export default function AdminPengurusPage() {
  const supabase = createClient()

  // State Utama
  const [pengurusList, setPengurusList] = useState<Pengurus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKelompok, setSelectedKelompok] = useState('Semua Kelompok')
  const [selectedStatusDapukan, setSelectedStatusDapukan] = useState('Semua Status Dapukan')

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // State Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<Pengurus | null>(null)
  const [formData, setFormData] = useState<Pengurus>({
    nama_pengurus: '',
    kelompok: 'GONJEN 1',
    jenis_kelamin: 'Laki-laki',
    dapukan: [],
    card_id: '',
  })

  // State Card Reader Scanning & Toast Notification
  const [isScanningCard, setIsScanningCard] = useState(false)
  const [readerReady, setReaderReady] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'error' }>({
    show: false,
    text: '',
    type: 'success',
  })

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ show: true, text, type })
    setTimeout(() => {
      setToast({ show: false, text: '', type: 'success' })
    }, 3200)
  }

  // State File Import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // 1. Fetch Data dari Supabase & Urutkan secara Kustom
  const fetchPengurus = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('pengurus').select('*')
    if (data && !error) {
      const sortedData = sortPengurus(data as Pengurus[])
      setPengurusList(sortedData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPengurus()
    setReaderReady(cardReader.getIsReady())
  }, [])

  // Handle Scan Card Async for Form Input
  const handleScanCardAction = async () => {
    if (isScanningCard) return
    setIsScanningCard(true)
    showToast('Tempelkan kartu RFID pada card reader...', 'success')

    try {
      const scannedCardId = await cardReader.waitForTap(30000)
      setFormData((prev) => ({ ...prev, card_id: scannedCardId }))
      showToast(`ID dari card berhasil terbaca: ${scannedCardId}`, 'success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membaca kartu.'
      showToast(message, 'error')
    } finally {
      setIsScanningCard(false)
    }
  }

  // 2. Fungsi Tambah & Edit Manual
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nama_pengurus.trim()) return alert('Nama lengkap wajib diisi!')

    if (editingData?.id) {
      // Update
      const { error } = await supabase
        .from('pengurus')
        .update({
          nama_pengurus: formData.nama_pengurus,
          kelompok: formData.kelompok,
          jenis_kelamin: formData.jenis_kelamin,
          dapukan: formData.dapukan,
          status_dapukan: formData.status_dapukan,
          card_id: formData.card_id?.trim() || null,
        })
        .eq('id', editingData.id)

      if (error) alert('Gagal memperbarui data: ' + error.message)
      else alert('Data berhasil diperbarui!')
    } else {
      // Insert Baru
      const { error } = await supabase.from('pengurus').insert([
        {
          nama_pengurus: formData.nama_pengurus,
          kelompok: formData.kelompok,
          jenis_kelamin: formData.jenis_kelamin,
          dapukan: formData.dapukan,
          status_dapukan: formData.status_dapukan,
          card_id: formData.card_id?.trim() || null,
        },
      ])

      if (error) alert('Gagal menambah data: ' + error.message)
      else alert('Data baru berhasil ditambahkan!')
    }

    closeModal()
    fetchPengurus()
  }

  // 3. Fungsi Hapus Data
  const handleDelete = async (id: string, nama_pengurus: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data ${nama_pengurus}?`)) {
      const { error } = await supabase.from('pengurus').delete().eq('id', id)
      if (error) alert('Gagal menghapus data: ' + error.message)
      else {
        alert('Data berhasil dihapus!')
        fetchPengurus()
      }
    }
  }

  // 4. Download Template Excel/CSV
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama_pengurus: 'Contoh Nama Pengurus 1',
        kelompok: 'GONJEN 1',
        jenis_kelamin: 'Laki-laki',
      },
      {
        nama_pengurus: 'Contoh Nama Pengurus 2',
        kelompok: 'GONJEN 2',
        jenis_kelamin: 'Perempuan',
      },
    ]
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Pengurus')
    XLSX.writeFile(workbook, 'Template_Import_Pengurus.xlsx')
  }

  // 5. Export Semua Data / Data Terfilter ke Excel
  const handleExportExcel = () => {
    if (filteredPengurus.length === 0) {
      return alert('Tidak ada data pengurus yang sesuai untuk diekspor!')
    }

    const exportData = filteredPengurus.map((item, index) => ({
      No: index + 1,
      'Nama Lengkap': item.nama_pengurus,
      Kelompok: item.kelompok || '-',
      'Jenis Kelamin': item.jenis_kelamin || '-',
      Dapukan: Array.isArray(item.dapukan) ? item.dapukan.join(', ') : '-',
      'Card ID / RFID': item.card_id || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pengurus')
    XLSX.writeFile(workbook, `Data_Pengurus_${selectedKelompok.replace(/\s+/g, '_')}.xlsx`)
  }

  // 6. Import Data Pengurus dari File Excel
  const handleImportExcel = async () => {
    if (!importFile) return alert('Silakan pilih file Excel terlebih dahulu!')
    setUploading(true)

    try {
      const buffer = await importFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rawData = XLSX.utils.sheet_to_json(worksheet)

      if (rawData.length === 0) {
        setUploading(false)
        return alert('File Excel kosong!')
      }

      const parsedPengurus: Pengurus[] = []

      rawData.forEach((row: any) => {
        const rowMap: Record<string, unknown> = {}
        Object.entries(row).forEach(([key, val]) => {
          rowMap[normalizeExcelKey(key)] = val
        })

        const nama = toExcelText(
          rowMap.namapengurus || rowMap.nama || rowMap.namalengkap || ''
        )
        const kelompok = toExcelText(rowMap.kelompok, 'GONJEN 1').toUpperCase()
        const jk = normalizeJenisKelamin(
          rowMap.jeniskelamin || rowMap.jk || rowMap.gender
        )

        if (nama) {
          parsedPengurus.push({
            nama_pengurus: nama,
            kelompok: kelompok || 'GONJEN 1',
            jenis_kelamin: jk,
            dapukan: [],
          })
        }
      })

      if (parsedPengurus.length === 0) {
        setUploading(false)
        return alert('Format file Excel tidak sesuai kolom yang dibutuhkan!')
      }

      const { error } = await supabase.from('pengurus').insert(parsedPengurus)
      if (error) throw error

      alert(`Berhasil mengimpor ${parsedPengurus.length} data pengurus!`)
      setIsImportModalOpen(false)
      setImportFile(null)
      fetchPengurus()
    } catch (err: any) {
      alert('Terjadi kesalahan saat memproses file: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const openAddModal = () => {
    setEditingData(null)
    setFormData({
      nama_pengurus: '',
      kelompok: 'GONJEN 1',
      jenis_kelamin: 'Laki-laki',
      dapukan: [],
      status_dapukan: [],
      card_id: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: Pengurus) => {
    setEditingData(item)
    setFormData({
      nama_pengurus: item.nama_pengurus,
      kelompok: item.kelompok || 'GONJEN 1',
      jenis_kelamin: item.jenis_kelamin || 'Laki-laki',
      dapukan: item.dapukan || [],
      status_dapukan: item.status_dapukan || [],
      card_id: item.card_id || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingData(null)
  }

  const sortedPengurusList = useMemo(() => sortPengurus(pengurusList), [pengurusList])

  const kelompokList = useMemo(
    () => Array.from(new Set(pengurusList.map((g) => g.kelompok).filter(Boolean))),
    [pengurusList]
  )

  const filteredPengurus = useMemo(() => {
    return sortedPengurusList.filter((g) => {
      const matchKelompok =
        selectedKelompok === 'Semua Kelompok' || g.kelompok === selectedKelompok
      const matchStatusDapukan =
        selectedStatusDapukan === 'Semua Status Dapukan' ||
        (Array.isArray(g.status_dapukan) && g.status_dapukan.includes(selectedStatusDapukan))
      const matchSearch =
        g.nama_pengurus.toLowerCase().includes(searchQuery.toLowerCase())
      return matchKelompok && matchStatusDapukan && matchSearch
    })
  }, [sortedPengurusList, selectedKelompok, selectedStatusDapukan, searchQuery])

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedKelompok, selectedStatusDapukan])

  // Data Terpaginasi
  const totalPages = Math.ceil(filteredPengurus.length / itemsPerPage) || 1
  const paginatedPengurus = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredPengurus.slice(start, start + itemsPerPage)
  }, [filteredPengurus, currentPage])

  // Ringkasan Statistik Dinamis
  const totalPengurus = filteredPengurus.length
  const totalLaki = filteredPengurus.filter((g) =>
    g.jenis_kelamin?.toLowerCase().includes('laki')
  ).length
  const totalPerempuan = filteredPengurus.filter((g) =>
    g.jenis_kelamin?.toLowerCase().includes('perempuan')
  ).length

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Toast Popup Notification Floating */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md transition-all duration-300">
          <div
            className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-white ${
              toast.type === 'success' ? 'bg-[#128243] border-emerald-600' : 'bg-red-600 border-red-500'
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
            <button
              onClick={() => setToast({ ...toast, show: false })}
              className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Section & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Data Pengurus
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola dan lihat ringkasan data seluruh anggota pengurus desa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 min-h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243]"
          >
            <Download className="w-4 h-4 text-[#128243] dark:text-emerald-400" /> Export Data
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 min-h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#128243] dark:text-emerald-400" /> Template Excel
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 min-h-[40px] bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Upload className="w-4 h-4" /> Import Data
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 min-h-[40px] bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243] focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" /> Tambah Manual
          </button>
        </div>
      </div>

      {/* Ringkasan Metrics Utama (Kohesif & Berkualitas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Pengurus {selectedKelompok !== 'Semua Kelompok' && `(${selectedKelompok})`}
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalPengurus}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-[#128243] dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Laki-laki</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalLaki}</p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perempuan</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalPerempuan}</p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pengurus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128243] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedKelompok}
            onChange={(e) => setSelectedKelompok(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
          >
            <option value="Semua Kelompok">Semua Kelompok</option>
            {kelompokList.map((kel) => (
              <option key={kel} value={kel}>
                {kel}
              </option>
            ))}
          </select>
          <select
            value={selectedStatusDapukan}
            onChange={(e) => setSelectedStatusDapukan(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
          >
            <option value="Semua Status Dapukan">Semua Status Dapukan</option>
            {STATUS_DAPUKAN_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Data Pengurus */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3.5 px-3 sm:px-4">Nama Lengkap</th>
                <th className="py-3.5 px-3 sm:px-4 whitespace-nowrap">Kelompok</th>
                <th className="py-3.5 px-3 sm:px-4 whitespace-nowrap">Jenis Kelamin</th>
                <th className="py-3.5 px-3 sm:px-4">Dapukan</th>
                <th className="py-3.5 px-3 sm:px-4">Status Dapukan</th>
                <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">Card ID / RFID</th>
                <th className="py-3.5 px-3 sm:px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Memuat data pengurus...
                  </td>
                </tr>
              ) : paginatedPengurus.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedPengurus.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-900 dark:text-white max-w-[150px] sm:max-w-none truncate">{item.nama_pengurus}</td>
                    <td className="py-3.5 px-3 sm:px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      <span className="inline-block max-w-[110px] sm:max-w-none truncate px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold align-middle">
                        {item.kelompok || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <span className="inline-block max-w-[90px] sm:max-w-none truncate px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 align-middle">
                        {item.jenis_kelamin}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(item.dapukan) && item.dapukan.length > 0 ? (
                          item.dapukan.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#128243] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-md text-[11px] font-semibold"
                            >
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(item.status_dapukan) && item.status_dapukan.length > 0 ? (
                          item.status_dapukan.map((s: string) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-md text-[11px] font-semibold"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">
                      {item.card_id ? (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[#128243] dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
                          {item.card_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-[#128243] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id!, item.nama_pengurus)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Navigasi Pagination */}
        {!loading && filteredPengurus.length > 0 && (
          <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredPengurus.length)}</span> - <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, filteredPengurus.length)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{filteredPengurus.length}</span> data
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#128243] cursor-pointer"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span>/ {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal CRUD Manual (Tambah / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingData ? 'Edit Data Pengurus' : 'Tambah Pengurus Manual'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveManual} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama_pengurus}
                  onChange={(e) => setFormData({ ...formData, nama_pengurus: e.target.value })}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#128243] text-slate-900 dark:text-white"
                />
              </div>

              {/* Card ID with Scan Button */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Card ID / RFID</span>
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${readerReady ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    Reader {readerReady ? 'Ready' : 'Standby'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.card_id || ''}
                    onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                    placeholder="Scan atau ketik Card ID..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#128243] font-mono text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleScanCardAction}
                    disabled={isScanningCard}
                    className="px-3.5 py-2 bg-[#128243] hover:bg-[#0e6835] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer text-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isScanningCard ? 'Menunggu...' : 'Scan Card'}
                  </button>
                </div>
                {isScanningCard && (
                  <p className="text-[11px] text-[#128243] dark:text-emerald-400 mt-1 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Silakan tap kartu pada Card Reader sekarang...
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kelompok</label>
                <select
                  value={formData.kelompok}
                  onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#128243] text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="GONJEN 1">GONJEN 1</option>
                  <option value="GONJEN 2">GONJEN 2</option>
                  <option value="KEMBARAN">KEMBARAN</option>
                  <option value="SEMBUNG">SEMBUNG</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#128243] text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Dapukan (Bisa pilih lebih dari satu)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {DAPUKAN_OPTIONS.map((dapukanName) => {
                    const isSelected = formData.dapukan?.includes(dapukanName)
                    return (
                      <label key={dapukanName} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentDapukan = formData.dapukan || []
                            if (e.target.checked) {
                              setFormData({ ...formData, dapukan: [...currentDapukan, dapukanName] })
                            } else {
                              setFormData({ ...formData, dapukan: currentDapukan.filter((d) => d !== dapukanName) })
                            }
                          }}
                          className="rounded border-slate-300 text-[#128243] focus:ring-[#128243]"
                        />
                        <span>{dapukanName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Status Dapukan (Bisa pilih lebih dari satu)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {STATUS_DAPUKAN_OPTIONS.map((statusName) => {
                    const isSelected = formData.status_dapukan?.includes(statusName)
                    return (
                      <label key={statusName} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentStatus = formData.status_dapukan || []
                            if (e.target.checked) {
                              setFormData({ ...formData, status_dapukan: [...currentStatus, statusName] })
                            } else {
                              setFormData({ ...formData, status_dapukan: currentStatus.filter((s) => s !== statusName) })
                            }
                          }}
                          className="rounded border-slate-300 text-[#128243] focus:ring-[#128243]"
                        />
                        <span>{statusName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Data Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import Data Pengurus (.xlsx / .csv)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Gunakan template Excel resmi agar format kolom sesuai saat diunggah ke sistem.
                Kolom yang diperlukan: Nama, Kelompok, Jenis Kelamin.
              </p>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 rounded-xl text-center bg-slate-50/50 dark:bg-slate-800/40">
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950/50 file:text-[#128243] dark:file:text-emerald-400 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportExcel}
                  disabled={uploading || !importFile}
                  className="px-4 py-2 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4" /> {uploading ? 'Mengunggah...' : 'Unggah Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
