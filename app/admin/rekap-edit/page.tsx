'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Save, RefreshCw } from 'lucide-react'
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
    <div className="min-h-screen bg-slate-900 text-stone-800 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin/pengurus"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Panel Admin
          </Link>
        </div>

        {/* Header & Filter Controls */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Edit Rekap Presensi</h1>
              <p className="text-sm text-gray-500">
                Kelola dan ubah status presensi pengurus secara manual.
              </p>
            </div>

            {selectedAcara && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAllChanges}
                  disabled={savingAll}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingAll ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
              </div>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Acara</label>
              <select
                value={selectedAcara}
                onChange={(e) => setSelectedAcara(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Kelompok</label>
              <select
                value={selectedKelompok}
                onChange={(e) => setSelectedKelompok(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Semua">Semua Kelompok</option>
                <option value="GONJEN 1">GONJEN 1</option>
                <option value="GONJEN 2">GONJEN 2</option>
                <option value="KEMBARAN">KEMBARAN</option>
                <option value="SEMBUNG">SEMBUNG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Jenis Kelamin</label>
              <select
                value={selectedJK}
                onChange={(e) => setSelectedJK(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Semua">Semua Jenis Kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Status Kehadiran</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
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
            <div className="bg-white p-3.5 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Total Pengurus</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totalPengurus}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Hadir</p>
              <p className="text-xl font-bold text-green-600 mt-1">{totalHadir}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Izin</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{totalIzin}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Alpa</p>
              <p className="text-xl font-bold text-gray-500 mt-1">{totalAlpa}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-100 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500 font-medium">Persentase</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{persentaseHadir}%</p>
            </div>
          </div>
        )}

        {/* Input Search */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 relative">
          <Search className="w-4 h-4 absolute left-6 top-6 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedAcara ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Silakan pilih acara terlebih dahulu untuk mengedit presensi.
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Memuat data presensi...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-700 font-bold">
                  <tr>
                    <th className="p-3 w-1/4">NAMA PENGURUS</th>
                    <th className="p-3 w-1/6">KELOMPOK</th>
                    <th className="p-3 w-1/4">STATUS PRESENSI</th>
                    <th className="p-3 w-1/4">ALASAN (JIKA IZIN)</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPengurus.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                        Tidak ada data pengurus yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPengurus.map((g) => {
                      const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
                      const savedData = savedPresensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
                      const isEdited = pData.status !== savedData.status || pData.alasan !== savedData.alasan

                      return (
                        <tr key={g.id} className={`hover:bg-gray-50/50 transition ${isEdited ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-3">
                            <div className="font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                              {g.nama_pengurus}
                              {isEdited && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-300 font-normal capitalize">
                                  Belum Disimpan
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{g.jenis_kelamin}</div>
                          </td>
                          <td className="p-3 text-gray-700 font-medium">
                            <div>{g.kelompok}</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={pData.status}
                              onChange={(e) => handleStatusChange(g.id, e.target.value)}
                              className={`w-full p-2 border rounded-lg text-xs font-semibold outline-none cursor-pointer ${
                                pData.status === 'Hadir'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : pData.status === 'Izin'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}
                            >
                              <option value="Hadir">Hadir</option>
                              <option value="Izin">Izin</option>
                              <option value="Alpa / Belum Presensi">Alpa / Belum Presensi</option>
                            </select>
                          </td>
                          <td className="p-3">
                            {pData.status === 'Izin' ? (
                              <input
                                type="text"
                                placeholder="Alasan izin..."
                                value={pData.alasan}
                                onChange={(e) => handleAlasanChange(g.id, e.target.value)}
                                className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-xs text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleSavePresensi(g.id)}
                              disabled={savingId === g.id}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
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
    </div>
  )
}
