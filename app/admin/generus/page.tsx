'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  GraduationCap,
} from 'lucide-react'

// Interface Data Pengurus
interface Pengurus {
  id?: string
  nama_pengurus: string
  kelompok: string
  jenis_kelamin: string
  dapukan?: string[]
  qr_code?: string
  qr_code_id?: string
}

const DAPUKAN_OPTIONS = [
  'Kyai',
  'Wakil Kyai',
  'KU',
  'Penerobos kelompok',
  'Penerobos Desa',
  'Mubaligh',
]

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

  // State Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<Pengurus | null>(null)
  const [formData, setFormData] = useState<Pengurus>({
    nama_pengurus: '',
    kelompok: 'GONJEN 1',
    jenis_kelamin: 'Laki-laki',
    dapukan: [],
  })

  // State File Import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchPengurus()
  }, [])

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
      'Kode QR / ID': item.qr_code_id || item.qr_code || item.id || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pengurus')

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
    ]

    const filename =
      selectedKelompok === 'Semua Kelompok'
        ? 'Data_Seluruh_Pengurus.xlsx'
        : `Data_Pengurus_${selectedKelompok.replace(/\s+/g, '_')}.xlsx`

    XLSX.writeFile(workbook, filename)
  }

  // 6. Import Massal (Bulk Upload Excel / CSV)
  const handleImportExcel = async () => {
    if (!importFile) return alert('Pilih berkas Excel/CSV terlebih dahulu!')
    setUploading(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const parsedData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        })

        if (parsedData.length === 0) {
          alert('File kosong atau format tidak sesuai!')
          setUploading(false)
          return
        }

        const formattedData = parsedData
          .map((row) => {
            const normalizedRow = Object.fromEntries(
              Object.entries(row).map(([key, value]) => [normalizeExcelKey(key), value])
            )
            const nama_pengurus = toExcelText(normalizedRow.namapengurus || normalizedRow.nama || normalizedRow.namalengkap)
            const jenisKelamin =
              normalizedRow.jeniskelamin ||
              normalizedRow.jeniskelaminlp ||
              normalizedRow.jk ||
              normalizedRow.gender
            return {
              nama_pengurus,
              kelompok: toExcelText(normalizedRow.kelompok, 'GONJEN 1'),
              jenis_kelamin: normalizeJenisKelamin(jenisKelamin),
            }
          })
          .filter((item) => item.nama_pengurus !== '')

        const { error } = await supabase.from('pengurus').insert(formattedData)

        if (error) {
          alert('Gagal mengimpor data: ' + error.message)
        } else {
          alert(`Berhasil mengimpor ${formattedData.length} data pengurus!`)
          setIsImportModalOpen(false)
          setImportFile(null)
          fetchPengurus()
        }
      } catch (err) {
        console.error(err)
        alert('Terjadi kesalahan saat membaca file!')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsArrayBuffer(importFile)
  }

  // Helper Modal
  const openAddModal = () => {
    setEditingData(null)
    setFormData({
      nama_pengurus: '',
      kelompok: 'GONJEN 1',
      jenis_kelamin: 'Laki-laki',
      dapukan: [],
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
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingData(null)
  }

  // Filtering Data berdasarkan Kelompok dan Pencarian
  const kelompokList = Array.from(
    new Set(pengurusList.map((g) => g.kelompok).filter(Boolean))
  )
  const filteredPengurus = pengurusList.filter((g) => {
    const matchKelompok =
      selectedKelompok === 'Semua Kelompok' || g.kelompok === selectedKelompok
    const matchSearch =
      g.nama_pengurus.toLowerCase().includes(searchQuery.toLowerCase())
    return matchKelompok && matchSearch
  })

  // Ringkasan Statistik Dinamis
  const totalPengurus = filteredPengurus.length
  const totalLaki = filteredPengurus.filter((g) =>
    g.jenis_kelamin?.toLowerCase().includes('laki')
  ).length
  const totalPerempuan = filteredPengurus.filter((g) =>
    g.jenis_kelamin?.toLowerCase().includes('perempuan')
  ).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header Section & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Data Pengurus</h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola dan lihat ringkasan data seluruh anggota pengurus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Data
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Template Excel
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import Data
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Manual
            </button>
          </div>
        </div>

        {/* Ringkasan Metrics Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Pengurus {selectedKelompok !== 'Semua Kelompok' && `(${selectedKelompok})`}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalPengurus}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laki-laki</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalLaki}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perempuan</p>
              <p className="text-2xl font-extrabold text-pink-600 mt-1">{totalPerempuan}</p>
            </div>
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>


        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pengurus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedKelompok}
              onChange={(e) => setSelectedKelompok(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Kelompok">Semua Kelompok</option>
              {kelompokList.map((kel) => (
                <option key={kel} value={kel}>
                  {kel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel Data Generus */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama Lengkap</th>
                  <th className="py-3.5 px-4">Kelompok</th>
                  <th className="py-3.5 px-4">Jenis Kelamin</th>
                  <th className="py-3.5 px-4">Dapukan</th>
                  <th className="py-3.5 px-4 text-center">Kode QR</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat data pengurus...
                    </td>
                  </tr>
                ) : filteredPengurus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredPengurus.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.nama_pengurus}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/60 rounded-md text-xs">
                          {item.kelompok || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.jenis_kelamin?.toLowerCase().includes('perempuan')
                              ? 'bg-pink-50 text-pink-600 border border-pink-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}
                        >
                          {item.jenis_kelamin}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.dapukan) && item.dapukan.length > 0 ? (
                            item.dapukan.map((d) => (
                              <span key={d} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-semibold">
                                {d}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
                        {item.qr_code_id || item.qr_code || item.id?.slice(0, 6).toUpperCase() || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.nama_pengurus)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
        </div>
      </main>

      {/* Modal CRUD Manual (Tambah / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingData ? 'Edit Data Pengurus' : 'Tambah Pengurus Manual'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveManual} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama_pengurus}
                  onChange={(e) => setFormData({ ...formData, nama_pengurus: e.target.value })}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kelompok</label>
                <select
                  value={formData.kelompok}
                  onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GONJEN 1">GONJEN 1</option>
                  <option value="GONJEN 2">GONJEN 2</option>
                  <option value="KEMBARAN">KEMBARAN</option>
                  <option value="SEMBUNG">SEMBUNG</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Dapukan (Bisa pilih lebih dari satu)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {DAPUKAN_OPTIONS.map((dapukanName) => {
                    const isSelected = formData.dapukan?.includes(dapukanName)
                    return (
                      <label key={dapukanName} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
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
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{dapukanName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Import Data Pengurus (.xlsx / .csv)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-500">
                Gunakan template Excel resmi agar format kolom sesuai saat diunggah ke sistem.
                Kolom yang diperlukan: Nama, Kelompok, Jenis Kelamin
              </p>
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportExcel}
                  disabled={uploading || !importFile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
