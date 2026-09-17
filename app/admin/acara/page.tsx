'use client'


import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  MapPin, 
  UserCheck, 
  X, 
  Check,
  Search,
  Upload,
  Image as ImageIcon,
  Users
} from 'lucide-react'

interface Acara {
  id: string
  nama_acara: string
  tanggal: string
  lokasi: string
  koor: string
}

interface Pengurus {
  id: string
  nama_pengurus: string
  kelompok: string
}

interface Panitia {
  id: string
  pengurus_id: string | null
  nama_manual: string | null
  jabatan: string
  pengurus?: Pengurus | null
}

type DesignRole = 'participant' | 'panitia'
const standardJabatan = ['Wakil Koordinator', 'Bendahara', 'Acara', 'Perkab', 'Konsumsi', 'PDD', 'KSK']

const supabase = createClient()

export default function AdminAcaraPage() {
  // State Data
  const [acaraList, setAcaraList] = useState<Acara[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // State Modal Form (Tambah & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAcara, setEditingAcara] = useState<Acara | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nama_acara: '',
    tanggal: '',
    lokasi: '',
    koor: ''
  })
  const [pengurusList, setPengurusList] = useState<Pengurus[]>([])
  const [panitiaList, setPanitiaList] = useState<Panitia[]>([])
  const [panitiaType, setPanitiaType] = useState<'pengurus' | 'manual'>('pengurus')
  const [selectedPengurusId, setSelectedPengurusId] = useState('')
  const [namaManual, setNamaManual] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [jabatanPilihan, setJabatanPilihan] = useState('')
  const [designs, setDesigns] = useState<Record<DesignRole, string | null>>({ participant: null, panitia: null })
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')

  const fetchPengurus = useCallback(async () => {
    const { data } = await supabase.from('pengurus').select('id, nama_pengurus, kelompok').order('nama_pengurus')
    if (data) setPengurusList(data as Pengurus[])
  }, [])

  // 1. Fetch Data: Diurutkan dari tanggal terdekat ke terlama (ascending)
  const fetchAcara = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: true })

    if (data && !error) {
      setAcaraList(data as Acara[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchAcara(), fetchPengurus()])
    })()
  }, [fetchAcara, fetchPengurus])

  useEffect(() => {
    if (!isModalOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setEditingAcara(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isModalOpen])

  // 2. Handler Simpan (Tambah Baru / Edit)
  const handleSaveAcara = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (editingAcara) {
      // Update Data
      const { error } = await supabase
        .from('acara')
        .update({
          nama_acara: formData.nama_acara,
          tanggal: formData.tanggal,
          lokasi: formData.lokasi,
          koor: formData.koor
        })
        .eq('id', editingAcara.id)

      if (error) alert('Gagal memperbarui acara: ' + error.message)
      else alert('Acara berhasil diperbarui!')
    } else {
      // Insert Baru
      const { error } = await supabase
        .from('acara')
        .insert([{
          nama_acara: formData.nama_acara,
          tanggal: formData.tanggal,
          lokasi: formData.lokasi,
          koor: formData.koor
        }])

      if (error) alert('Gagal menambahkan acara: ' + error.message)
      else alert('Acara baru berhasil dibuat!')
    }

    setIsSubmitting(false)
    closeModal()
    fetchAcara()
  }

  // 3. Handler Hapus Acara
  const handleDeleteAcara = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus acara "${nama}"? Data presensi terkait mungkin akan terpengaruh!`)) {
      const { error } = await supabase.from('acara').delete().eq('id', id)
      if (error) alert('Gagal menghapus acara: ' + error.message)
      else fetchAcara()
    }
  }

  // Helper Modal
  const openAddModal = () => {
    setEditingAcara(null)
    setFormData({ nama_acara: '', tanggal: '', lokasi: '', koor: '' })
    setPanitiaList([])
    setPanitiaType('pengurus')
    setSelectedPengurusId('')
    setNamaManual('')
    setJabatan('')
    setJabatanPilihan('')
    setDesigns({ participant: null, panitia: null })
    setSettingsError('')
    setSettingsSuccess('')
    setJabatan('')
    setJabatanPilihan('')
    setIsModalOpen(true)
  }

  const openEditModal = (item: Acara) => {
    setEditingAcara(item)
    setFormData({
      nama_acara: item.nama_acara,
      tanggal: item.tanggal,
      lokasi: item.lokasi,
      koor: item.koor
    })
    loadEventSettings(item.id)
    setSettingsSuccess('')
    setIsModalOpen(true)
  }

  const loadEventSettings = async (acaraId: string) => {
    setIsLoadingSettings(true)
    setSettingsError('')
    const [{ data: committee, error: committeeError }, { data: designRows, error }] = await Promise.all([
      supabase.from('acara_panitia').select('id, pengurus_id, nama_manual, jabatan, pengurus(id, nama_pengurus, kelompok)').eq('acara_id', acaraId),
      supabase.from('acara_design').select('role, storage_path').eq('acara_id', acaraId)
    ])
    if (committeeError || error) setSettingsError('Pengaturan acara belum tersedia. Jalankan migration Supabase terlebih dahulu.')
    setPanitiaList((committee || []).map((item) => ({
      ...item,
      pengurus: Array.isArray(item.pengurus) ? item.pengurus[0] : item.pengurus
    })) as Panitia[])
    const nextDesigns: Record<DesignRole, string | null> = { participant: null, panitia: null }
    for (const design of designRows || []) {
      if (design.role === 'participant' || design.role === 'panitia') {
        const role = design.role as DesignRole
        nextDesigns[role] = supabase.storage.from('acara-designs').getPublicUrl(design.storage_path).data.publicUrl
      }
    }
    setDesigns(nextDesigns)
    setIsLoadingSettings(false)
  }

  const addPanitia = async () => {
    if (!editingAcara) return
    const normalizedJabatan = jabatan.trim()
    if (!normalizedJabatan) return setSettingsError('Pilih atau isi jabatan panitia terlebih dahulu.')

    const normalizedNama = namaManual.trim()
    if (panitiaType === 'pengurus' && !selectedPengurusId) {
      return setSettingsError('Pilih pengurus yang akan menjadi panitia.')
    }
    if (panitiaType === 'manual' && !normalizedNama) {
      return setSettingsError('Masukkan nama panitia manual.')
    }
    if (
      panitiaType === 'manual' &&
      panitiaList.some((panitia) => panitia.nama_manual?.trim().toLowerCase() === normalizedNama.toLowerCase())
    ) {
      return setSettingsError('Nama panitia tersebut sudah terdaftar dalam acara ini.')
    }

    const { error } = await supabase.from('acara_panitia').insert({
      acara_id: editingAcara.id,
      pengurus_id: panitiaType === 'pengurus' ? selectedPengurusId : null,
      nama_manual: panitiaType === 'manual' ? normalizedNama : null,
      jabatan: normalizedJabatan
    })
    if (error) return setSettingsError(error.message)
    setSelectedPengurusId('')
    setNamaManual('')
    setJabatan('')
    setJabatanPilihan('')
    setSettingsError('')
    await loadEventSettings(editingAcara.id)
  }

  const removePanitia = async (panitiaId: string) => {
    if (!editingAcara) return
    const { error } = await supabase.from('acara_panitia').delete().eq('acara_id', editingAcara.id).eq('id', panitiaId)
    if (error) return setSettingsError(error.message)
    await loadEventSettings(editingAcara.id)
  }

  const uploadDesign = async (role: DesignRole, file: File) => {
    if (!editingAcara) return
    if (!file.type.startsWith('image/')) return setSettingsError('File desain harus berupa gambar.')
    if (file.size > 5 * 1024 * 1024) return setSettingsError('Ukuran desain maksimal 5 MB.')
    setSettingsError('')
    setSettingsSuccess('')
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${editingAcara.id}/${role}-${safeFileName}`
    const { error: uploadError } = await supabase.storage.from('acara-designs').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) return setSettingsError(uploadError.message)
    const { error: rowError } = await supabase.from('acara_design').upsert({
      acara_id: editingAcara.id,
      role,
      storage_path: path,
      mime_type: file.type,
      file_size: file.size,
      updated_at: new Date().toISOString()
    }, { onConflict: 'acara_id,role' })
    if (rowError) return setSettingsError(rowError.message)
    setSettingsSuccess(
      `${role === 'participant' ? 'Twibbon peserta' : 'Twibbon panitia'} berhasil di-upload.`
    )
    await loadEventSettings(editingAcara.id)
  }

  const resetDesign = async (role: DesignRole) => {
    if (!editingAcara || !designs[role]) return
    const designLabel = role === 'participant' ? 'twibbon peserta' : 'twibbon panitia'
    if (!confirm(`Hapus ${designLabel} dari acara ini?`)) return

    setSettingsError('')
    setSettingsSuccess('')
    const { data: design } = await supabase
      .from('acara_design')
      .select('storage_path')
      .eq('acara_id', editingAcara.id)
      .eq('role', role)
      .maybeSingle()

    if (design?.storage_path) {
      const { error: storageError } = await supabase.storage.from('acara-designs').remove([design.storage_path])
      if (storageError) return setSettingsError(storageError.message)
    }

    const { error } = await supabase
      .from('acara_design')
      .delete()
      .eq('acara_id', editingAcara.id)
      .eq('role', role)
    if (error) return setSettingsError(error.message)

    setSettingsSuccess(`${role === 'participant' ? 'Twibbon peserta' : 'Twibbon panitia'} berhasil di-reset.`)
    await loadEventSettings(editingAcara.id)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAcara(null)
  }

  // Filter Pencarian
  const filteredAcara = acaraList.filter(a => 
    a.nama_acara.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.koor.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Acara</h1>
            <p className="text-sm text-slate-500 mt-1">
              Atur agenda kegiatan dan jadwal presensi generus.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Buat Acara Baru
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari acara, lokasi, atau koordinator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500 hidden sm:block">
            Total: {filteredAcara.length} Acara
          </div>
        </div>

        {/* Tabel Data Acara */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Acara</th>
                  <th className="py-3.5 px-4">Tanggal Kegiatan</th>
                  <th className="py-3.5 px-4">Lokasi</th>
                  <th className="py-3.5 px-4">Koordinator</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat jadwal acara...
                    </td>
                  </tr>
                ) : filteredAcara.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada acara yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredAcara.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.nama_acara}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.tanggal}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.lokasi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {item.koor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAcara(item.id, item.nama_acara)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Modal CRUD (Tambah / Edit Acara) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="my-2 max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl transition-all duration-300 ease-out sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingAcara ? 'Edit Acara' : 'Buat Acara Baru'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcara} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Acara</label>
                <input
                  type="text"
                  required
                  value={formData.nama_acara}
                  onChange={(e) => setFormData({ ...formData, nama_acara: e.target.value })}
                  placeholder="Contoh: Pengajian Sambung Kelompok"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  required
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  placeholder="Contoh: Masjid Utama"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Koordinator (Koor)</label>
                <select
                  required
                  value={formData.koor}
                  onChange={(e) => setFormData({ ...formData, koor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih koordinator dari data pengurus</option>
                  {formData.koor && !pengurusList.some((pengurus) => pengurus.nama_pengurus === formData.koor) && (
                    <option value={formData.koor}>{formData.koor} (data sebelumnya)</option>
                  )}
                  {pengurusList.map((pengurus) => (
                    <option key={pengurus.id} value={pengurus.nama_pengurus}>
                      {pengurus.nama_pengurus} {pengurus.kelompok ? `- ${pengurus.kelompok}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {editingAcara ? (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" /> Panitia Acara
                    </h4>
                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                      <select
                        value={panitiaType}
                        onChange={(e) => {
                          setPanitiaType(e.target.value as 'pengurus' | 'manual')
                          setSelectedPengurusId('')
                          setNamaManual('')
                        }}
                        className="w-full sm:w-32 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pengurus">Pengurus</option>
                        <option value="manual">Manual</option>
                      </select>
                      {panitiaType === 'pengurus' ? (
                        <select
                        value={selectedPengurusId}
                        onChange={(e) => setSelectedPengurusId(e.target.value)}
                        className="min-w-0 flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih pengurus</option>
                        {pengurusList
                          .filter((pengurus) => !panitiaList.some((panitia) => panitia.pengurus_id === pengurus.id))
                          .map((pengurus) => (
                            <option key={pengurus.id} value={pengurus.id}>
                              {pengurus.nama_pengurus} {pengurus.kelompok ? `- ${pengurus.kelompok}` : ''}
                            </option>
                          ))
                        }
                        </select>
                      ) : (
                        <input
                          value={namaManual}
                          onChange={(e) => setNamaManual(e.target.value)}
                          placeholder="Nama panitia non-generus"
                          className="min-w-0 flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <select
                          value={jabatanPilihan}
                          onChange={(e) => {
                            const value = e.target.value
                            setJabatanPilihan(value)
                            setJabatan(value === 'Custom' ? '' : value)
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pilih jabatan</option>
                          {standardJabatan.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                          <option value="Custom">Custom</option>
                        </select>
                        {jabatanPilihan === 'Custom' && (
                          <input
                            value={jabatan}
                            onChange={(e) => setJabatan(e.target.value)}
                            placeholder="Masukkan jabatan custom"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={addPanitia}
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                      >
                        Tambah
                      </button>
                    </div>
                    {isLoadingSettings ? (
                      <p className="text-xs text-slate-400 mt-2">Memuat pengaturan...</p>
                    ) : panitiaList.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {panitiaList.map((panitia) => (
                          <div key={panitia.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <span className="truncate text-xs font-semibold text-slate-700">
                              {panitia.pengurus?.nama_pengurus || panitia.nama_manual || 'Panitia'} - {panitia.jabatan}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePanitia(panitia.id)}
                              title="Hapus panitia"
                              className="shrink-0 p-1 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">Belum ada panitia yang dipilih.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" /> Desain QR per kategori
                    </h4>
                    <div className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-2">
                      {(['participant', 'panitia'] as DesignRole[]).map((role) => (
                        <div key={role} className="space-y-2">
                          <div className="relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                          {designs[role] ? (
                            <div className="absolute inset-0 rounded-xl bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${designs[role]})` }} />
                          ) : null}
                          <label className="relative z-10 flex cursor-pointer flex-col items-center justify-center gap-2">
                            <Upload className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-700">
                              {designs[role]
                                ? `Ganti ${role === 'participant' ? 'Twibbon Peserta' : 'Twibbon Panitia'}`
                                : `Upload ${role === 'participant' ? 'Twibbon Peserta' : 'Twibbon Panitia'}`}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadDesign(role, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                          </div>
                          {designs[role] && (
                            <button
                              type="button"
                              onClick={() => resetDesign(role)}
                              className="w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700"
                            >
                              Reset desain
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {settingsError && <p className="text-xs text-red-600">{settingsError}</p>}
                  {settingsSuccess && <p className="text-xs font-semibold text-emerald-600">{settingsSuccess}</p>}
                </div>
              ) : (
                <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Simpan acara terlebih dahulu untuk mengatur panitia dan desain QR.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1 disabled:bg-slate-300"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}