'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Save } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminRekapEditPage() {
  const supabase = createClient()

  // State Data
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [pengurusList, setPengurusList] = useState<any[]>([])
  
  // State untuk form edit lokal (real-time saat dropdown diubah)
  const [presensiMap, setPresensiMap] = useState<{
    [key: string]: { status: string; alasan: string; id?: string }
  }>({})

  // State khusus data tersimpan (untuk menghitung statistik terkonfirmasi)
  const [savedPresensiMap, setSavedPresensiMap] = useState<{
    [key: string]: { status: string; alasan: string; id?: string }
  }>({})

  // Filter State
  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [selectedJK, setSelectedJK] = useState<string>('Semua')
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  useEffect(() => {
    fetchAcara()
  }, [])

  useEffect(() => {
    if (selectedAcara) {
      fetchRekapData()
    }
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: true })
    if (data) setAcaraList(data)
  }

  const fetchRekapData = async () => {
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
      setPengurusList(pengurusData)

      const pMap: { [key: string]: { status: string; alasan: string; id?: string } } = {}
      pengurusData.forEach((g) => {
        pMap[g.id] = { status: 'Alpa / Belum Presensi', alasan: '' }
      })

      if (presensiData) {
        presensiData.forEach((p) => {
          let validStatus = p.status
          if (validStatus === 'sakit' || validStatus === 'Sakit' || validStatus === 'izin' || validStatus === 'Izin') {
            validStatus = 'Izin'
          } else if (validStatus === 'hadir' || validStatus === 'Hadir') {
            validStatus = 'Hadir'
          } else {
            validStatus = 'Alpa / Belum Presensi'
          }

          pMap[p.pengurus_id] = {
            id: p.id,
            status: validStatus,
            alasan: p.alasan || '',
          }
        })
      }

      // Sync state lokal dan state terkonfirmasi saat fetch awal
      setPresensiMap(structuredClone(pMap))
      setSavedPresensiMap(structuredClone(pMap))
    }
    setLoading(false)
  }

  // Handle Perubahan Status di Dropdown Tabel
  const handleStatusChange = (generusId: string, status: string) => {
    setPresensiMap((prev) => ({
      ...prev,
      [generusId]: {
        ...prev[generusId],
        status,
        alasan: status === 'Izin' ? prev[generusId]?.alasan || '' : '',
      },
    }))
  }

  // Handle Perubahan Alasan Izin
  const handleAlasanChange = (generusId: string, alasan: string) => {
    setPresensiMap((prev) => ({
      ...prev,
      [generusId]: {
        ...prev[generusId],
        alasan,
      },
    }))
  }

  // Save/Update Presensi per Pengurus
  const handleSavePresensi = async (pengurusId: string) => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')
    setSavingId(pengurusId)

    const item = presensiMap[pengurusId]
    const validStatus = item?.status

    if (validStatus === 'Alpa / Belum Presensi') {
      if (item?.id) {
        const { error } = await supabase.from('presensi').delete().eq('id', item.id)
        if (error) alert('Gagal menghapus data presensi: ' + error.message)
        else {
          alert('Status dikembalikan ke Alpa / Belum Presensi')
          await fetchRekapData()
        }
      }
    } else {
      const { error } = await supabase.from('presensi').upsert(
        {
          pengurus_id: pengurusId,
          acara_id: selectedAcara,
          status: validStatus,
          alasan: validStatus === 'Izin' ? item.alasan : null,
          metode: 'Manual Admin',
        },
        { onConflict: 'pengurus_id, acara_id' }
      )

      if (error) alert('Gagal menyimpan presensi: ' + error.message)
      else {
        alert('Berhasil menyimpan data presensi!')
        await fetchRekapData()
      }
    }
    setSavingId(null)
  }

  // Fitur Masal: Simpan Semua Perubahan Sekaligus (Mempermudah Edit)
  const handleSaveAllChanges = async () => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')
    setSavingAll(true)

    try {
      const upsertList: any[] = []
      const deleteIds: string[] = []

      Object.entries(presensiMap).forEach(([pengurusId, item]) => {
        const savedItem = savedPresensiMap[pengurusId]
        
        // Cek apakah ada perubahan dibanding data tersimpan
        const isChanged =
          savedItem?.status !== item.status || savedItem?.alasan !== item.alasan

        if (isChanged) {
          if (item.status === 'Alpa / Belum Presensi') {
            if (item.id) deleteIds.push(item.id)
          } else {
            upsertList.push({
              pengurus_id: pengurusId,
              acara_id: selectedAcara,
              status: item.status,
              alasan: item.status === 'Izin' ? item.alasan : null,
              metode: 'Manual Admin',
            })
          }
        }
      })

      if (upsertList.length === 0 && deleteIds.length === 0) {
        alert('Tidak ada perubahan data yang perlu disimpan.')
        setSavingAll(false)
        return
      }

      if (deleteIds.length > 0) {
        await supabase.from('presensi').delete().in('id', deleteIds)
      }

      if (upsertList.length > 0) {
        await supabase.from('presensi').upsert(upsertList, {
          onConflict: 'pengurus_id, acara_id',
        })
      }

      alert('Semua perubahan berhasil disimpan!')
      await fetchRekapData()
    } catch (err: any) {
      alert('Gagal menyimpan semua perubahan: ' + err.message)
    } finally {
      setSavingAll(false)
    }
  }

  // Memoized filter and statistics calculation
  const filteredPengurus = useMemo(() => {
    return pengurusList.filter((g) => {
      const matchKelompok = selectedKelompok === 'Semua' || g.kelompok === selectedKelompok
      const matchJK = selectedJK === 'Semua' || g.jenis_kelamin === selectedJK
      const currentStatus = savedPresensiMap[g.id]?.status || 'Alpa / Belum Presensi'
      const matchStatus = selectedStatus === 'Semua' || currentStatus === selectedStatus
      const matchSearch =
        g.nama_pengurus.toLowerCase().includes(searchQuery.toLowerCase())

      return matchKelompok && matchJK && matchStatus && matchSearch
    })
  }, [pengurusList, selectedKelompok, selectedJK, selectedStatus, searchQuery, savedPresensiMap])

  const { totalPengurus, totalHadir, totalIzin, totalAlpa, persentaseHadir } = useMemo(() => {
    let hadir = 0
    let izin = 0
    let alpa = 0
    filteredPengurus.forEach((g) => {
      const st = savedPresensiMap[g.id]?.status
      if (st === 'Hadir') hadir++
      else if (st === 'Izin') izin++
      else alpa++
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
  }, [filteredPengurus, savedPresensiMap])

  const currentAcaraInfo = acaraList.find((a) => a.id === selectedAcara)

  // Fitur Export ke Excel
  const handleExportExcel = () => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')

    const namaAcaraStr = currentAcaraInfo
      ? `${currentAcaraInfo.nama_acara}_${currentAcaraInfo.tanggal}`
      : 'Acara'

    const exportData = filteredPengurus.map((g, index) => {
      const pData = savedPresensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
      return {
        No: index + 1,
        'Nama Lengkap': g.nama_pengurus,
        'Jenis Kelamin': g.jenis_kelamin,
        Kelompok: g.kelompok,
        'Status Presensi': pData.status,
        'Alasan / Keterangan': pData.alasan || '-',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi')

    const max_width = exportData.reduce((w, r) => Math.max(w, (r['Nama Lengkap'] || '').length), 10)
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: max_width + 5 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
    ]

    const filename = `Rekap_Presensi_${namaAcaraStr.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <Link
          href="/admin/pengurus"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#128243] dark:hover:text-emerald-400 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Panel Admin
        </Link>
      </div>

      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Edit Rekap Presensi</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola dan ubah status presensi pengurus secara manual.
            </p>
          </div>

          {selectedAcara && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllChanges}
                disabled={savingAll}
                className="px-4 py-2.5 min-h-[40px] bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128243]"
              >
                <Save className="w-4 h-4" />
                {savingAll ? 'Menyimpan...' : 'Simpan Semua'}
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 min-h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Download className="w-4 h-4 text-[#128243] dark:text-emerald-400" /> Export Excel
              </button>
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Pilih Acara</label>
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#128243] font-medium cursor-pointer"
            >
              <option value="">-- Pilih Acara --</option>
              {acaraList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_acara} - {a.tanggal}
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

      {/* Stats Cards (Hanya Terpengaruh Data Tersimpan) */}
      {selectedAcara && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Pengurus</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalPengurus}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Hadir</p>
            <p className="text-2xl font-extrabold text-[#128243] dark:text-emerald-400 mt-1">{totalHadir}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Izin</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{totalIzin}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Alpa</p>
            <p className="text-2xl font-extrabold text-slate-500 dark:text-slate-400 mt-1">{totalAlpa}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-card col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Kehadiran</p>
            <p className="text-2xl font-extrabold text-[#128243] dark:text-emerald-400 mt-1">{persentaseHadir}%</p>
          </div>
        </div>
      )}

      {/* Input Search */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 relative">
        <Search className="w-4 h-4 absolute left-6 top-6 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama pengurus..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#128243]"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-200/90 dark:border-slate-800 overflow-hidden">
        {!selectedAcara ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            Silakan pilih acara terlebih dahulu untuk mengedit presensi.
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">Memuat data presensi...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-3.5 w-1/4">NAMA PENGURUS</th>
                  <th className="p-3.5 w-1/6">KELOMPOK</th>
                  <th className="p-3.5 w-1/4">STATUS PRESENSI</th>
                  <th className="p-3.5 w-1/4">ALASAN (JIKA IZIN)</th>
                  <th className="p-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPengurus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                      Tidak ada data pengurus yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredPengurus.map((g) => {
                    const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
                    const savedData = savedPresensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
                    const isEdited = pData.status !== savedData.status || pData.alasan !== savedData.alasan

                    return (
                      <tr key={g.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${isEdited ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                            {g.nama_pengurus}
                            {isEdited && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-semibold capitalize">
                                Belum Disimpan
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{g.jenis_kelamin}</div>
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold">
                            {g.kelompok}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={pData.status}
                            onChange={(e) => handleStatusChange(g.id, e.target.value)}
                            className={`w-full p-2 border rounded-xl text-xs font-bold outline-none cursor-pointer ${
                              pData.status === 'Hadir'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#128243] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                : pData.status === 'Izin'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="Hadir">Hadir</option>
                            <option value="Izin">Izin</option>
                            <option value="Alpa / Belum Presensi">Alpa / Belum Presensi</option>
                          </select>
                        </td>
                        <td className="p-3.5">
                          {pData.status === 'Izin' ? (
                            <input
                              type="text"
                              placeholder="Alasan izin..."
                              value={pData.alasan}
                              onChange={(e) => handleAlasanChange(g.id, e.target.value)}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#128243] text-slate-900 dark:text-white"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleSavePresensi(g.id)}
                            disabled={savingId === g.id}
                            className="p-2 bg-[#128243] hover:bg-[#0e6835] text-white rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-xs font-bold cursor-pointer shadow-xs"
                            title="Simpan Perubahan"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Simpan</span>
                          </button>
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
  )
}
