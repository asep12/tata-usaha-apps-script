/**
 * SKEMA MODUL — satu definisi yang menggerakkan tabel, form, validasi, dan Sheet.
 * Tambah kolom/modul cukup di sini, lalu jalankan menu Tata Usaha > Siapkan / Perbaiki Sheet.
 *
 * Properti field:
 *   k kunci kolom, l label, t tipe (teks|area|tanggal|pilih|angka|url|tel)
 *   wajib, opsi[], opsiDari (modul sumber opsi), auto (diisi sistem), tabel (tampil di tabel),
 *   filter (filter di toolbar), badge (tampil sebagai label status), awal (nilai awal), grup (judul kelompok
 *   di detail), kunciJika (terkunci bila field lain terisi), penuh (lebar penuh di form).
 */

var VERSI_SKEMA = '2.7.0';

var AKSI_IZIN = ['lihat', 'tambah', 'ubah', 'hapus', 'cetak'];

var MODUL = {
  surat_masuk: {
    tab: 'SuratMasuk', judul: 'Surat Masuk', nav: 'Masuk', tunggal: 'surat masuk', ikon: 'inbox', menu: 'Surat',
    judulField: 'perihal', subField: 'asal_instansi', urut: ['tanggal_terima', 'desc'],
    field: [
      { k: 'no_agenda', l: 'No. agenda', t: 'teks', auto: true, tabel: true },
      { k: 'asal_instansi', l: 'Asal instansi', t: 'teks', wajib: true, tabel: true, grup: 'Surat' },
      { k: 'nomor_surat_asal', l: 'Nomor surat asal', t: 'teks' },
      { k: 'tanggal_surat', l: 'Tanggal surat', t: 'tanggal' },
      { k: 'tanggal_terima', l: 'Tanggal terima', t: 'tanggal', wajib: true, tabel: true, awal: 'hariini' },
      { k: 'perihal', l: 'Perihal', t: 'area', wajib: true, tabel: true, penuh: true },
      { k: 'sifat', l: 'Sifat', t: 'pilih', opsi: ['Biasa', 'Penting', 'Segera', 'Rahasia'], awal: 'Biasa', tabel: true, filter: true, badge: true, grup: 'Penanganan' },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Baru', 'Diproses', 'Selesai'], awal: 'Baru', tabel: true, filter: true, badge: true },
      { k: 'lokasi_arsip', l: 'Lokasi arsip', t: 'teks' },
      { k: 'link_lampiran', l: 'Tautan lampiran', t: 'url' }
    ]
  },

  surat_keluar: {
    tab: 'SuratKeluar', judul: 'Surat Keluar', nav: 'Keluar', tunggal: 'surat keluar', ikon: 'outbox', menu: 'Surat',
    judulField: 'perihal', subField: 'tujuan', urut: ['tanggal_surat', 'desc'],
    field: [
      { k: 'nomor_surat', l: 'Nomor surat', t: 'teks', auto: true, tabel: true },
      { k: 'nomor_urut', l: 'Nomor urut', t: 'angka', auto: true },
      { k: 'tahun', l: 'Tahun', t: 'angka', auto: true, filter: true },
      { k: 'tanggal_surat', l: 'Tanggal surat', t: 'tanggal', wajib: true, tabel: true, awal: 'hariini', kunciJika: 'nomor_surat', grup: 'Surat' },
      { k: 'jenis_surat', l: 'Jenis surat', t: 'pilih', opsiDari: 'jenis_surat', opsiKunci: 'nama', wajib: true, filter: true, kunciJika: 'nomor_surat', bantu: 'Menentukan format cetak dan isian di bawah.' },
      { k: 'kode_klasifikasi', l: 'Kode klasifikasi', t: 'pilih', opsiDari: 'kode_klasifikasi', wajib: true, kunciJika: 'nomor_surat' },
      { k: 'sifat', l: 'Sifat', t: 'pilih', opsi: ['Biasa', 'Penting', 'Segera', 'Rahasia'], awal: 'Biasa' },
      { k: 'lampiran', l: 'Lampiran', t: 'teks', bantu: 'Mis. 1 berkas. Kosongkan bila tidak ada.' },
      { k: 'perihal', l: 'Perihal', t: 'area', wajib: true, tabel: true, penuh: true },
      { k: 'tujuan', l: 'Tujuan', t: 'teks', wajib: true, tabel: true, penuh: true, bantu: 'Mis. Kepala Dinas Pendidikan Kota ..., atau Bapak/Ibu Orang Tua Siswa Kelas 9.' },
      { k: 'dari', l: 'Dari', t: 'teks', penuh: true, layout: ['nota'], bantu: 'Jabatan pengirim nota dinas.' },
      { k: 'dasar', l: 'Dasar penugasan', t: 'area', penuh: true, layout: ['tugas'], bantu: 'Satu dasar per baris; dicetak bernomor.' },
      { k: 'daftar_orang', l: 'Yang ditugaskan', t: 'area', penuh: true, layout: ['tugas'], pemilih: 'orang', bantu: 'Satu orang per baris: Nama | NIP/No. Induk | Pangkat/Gol | Jabatan | Tempat, tanggal lahir. Pakai pencarian di bawah untuk mengisi otomatis dari data pegawai/siswa. Tiap orang mendapat lembar surat tugas sendiri.' },
      { k: 'identitas', l: 'Yang diterangkan', t: 'area', penuh: true, layout: ['keterangan'], bantu: 'Satu butir per baris: Label: isi (mis. Nama: Ani Lestari)' },
      { k: 'acara_tanggal', l: 'Tanggal mulai', t: 'tanggal', layout: ['undangan', 'tugas'] },
      { k: 'acara_tanggal_selesai', l: 'Tanggal selesai', t: 'tanggal', layout: ['undangan', 'tugas'], bantu: 'Kosongkan bila hanya satu hari.' },
      { k: 'acara_waktu', l: 'Waktu', t: 'teks', layout: ['undangan', 'tugas'], bantu: 'Mis. 08.00 WIB s.d. selesai' },
      { k: 'acara_tempat', l: 'Tempat', t: 'teks', penuh: true, layout: ['undangan', 'tugas'] },
      { k: 'acara_agenda', l: 'Acara / kegiatan', t: 'area', penuh: true, layout: ['undangan', 'tugas'] },
      { k: 'sertakan_sppd', l: 'Sertakan SPPD', t: 'pilih', opsi: ['Tidak', 'Ya'], awal: 'Tidak', layout: ['tugas'], bantu: 'Ya: tiap orang mendapat SPPD halaman 1 dan 2 setelah laporan kegiatan.' },
      { k: 'alat_angkutan', l: 'SPPD: alat angkutan', t: 'teks', layout: ['tugas'], bantu: 'Mis. Kendaraan umum / dinas.' },
      { k: 'tempat_berangkat', l: 'SPPD: tempat berangkat', t: 'teks', layout: ['tugas'], bantu: 'Kosongkan untuk memakai kota sekolah.' },
      { k: 'lamanya_perjalanan', l: 'SPPD: lamanya perjalanan', t: 'teks', layout: ['tugas'], bantu: 'Kosongkan untuk dihitung dari tanggal mulai dan selesai.' },
      { k: 'pembebanan_instansi', l: 'SPPD: pembebanan anggaran, instansi', t: 'teks', layout: ['tugas'] },
      { k: 'pembebanan_mata_anggaran', l: 'SPPD: mata anggaran', t: 'teks', layout: ['tugas'] },
      { k: 'keterangan_sppd', l: 'SPPD: keterangan lain-lain', t: 'area', penuh: true, layout: ['tugas'] },
      { k: 'menimbang', l: 'Menimbang', t: 'area', penuh: true, layout: ['keputusan'], bantu: 'Satu butir per baris; dicetak a, b, c.' },
      { k: 'mengingat', l: 'Mengingat', t: 'area', penuh: true, layout: ['keputusan'], bantu: 'Satu dasar hukum per baris; dicetak bernomor.' },
      { k: 'memutuskan', l: 'Memutuskan / menetapkan', t: 'area', penuh: true, layout: ['keputusan'], bantu: 'Satu diktum per baris, mis. KESATU: ...' },
      { k: 'isi_ringkas', l: 'Isi surat', t: 'area', penuh: true, bantu: 'Paragraf pembuka atau isi. Pisahkan paragraf dengan baris baru.' },
      { k: 'pegawai_terkait', l: 'Pegawai terkait', t: 'area', penuh: true, layout: ['umum', 'undangan', 'keterangan', 'edaran', 'keputusan', 'nota'], pemilih: 'pegawai', bantu: 'Opsional. Dicetak sebagai daftar bernomor; bila Tujuan kosong, nama-nama ini menjadi Kepada Yth.' },
      { k: 'siswa_terkait', l: 'Siswa terkait', t: 'area', penuh: true, layout: ['umum', 'undangan', 'keterangan', 'edaran', 'keputusan', 'nota'], pemilih: 'siswa', bantu: 'Opsional, mis. untuk surat keterangan atau dispensasi.' },
      { k: 'tembusan', l: 'Tembusan', t: 'area', penuh: true, bantu: 'Satu penerima per baris. Kosongkan bila tidak ada.' },
      { k: 'unit_pemohon', l: 'Diminta oleh (unit)', t: 'teks', bantu: 'Isi bila nomor diminta unit lain yang membuat suratnya sendiri; dicetak di Bukti Nomor.' },
      { k: 'penandatangan', l: 'Penandatangan', t: 'teks', grup: 'Penerbitan', bantu: 'Terisi otomatis dengan kepala sekolah dari menu Sekolah. Ganti dengan nama pegawai lain bila perlu; NIP dan jabatannya ikut terisi.' },
      { k: 'jabatan_penandatangan', l: 'Jabatan penandatangan', t: 'teks', bantu: 'Diisi bila penandatangan bukan kepala sekolah, mis. Wakil Kepala Sekolah.' },
      { k: 'nip_penandatangan', l: 'NIP penandatangan', t: 'teks' },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Draft', 'Terbit', 'Dibatalkan'], awal: 'Draft', auto: true, tabel: true, filter: true, badge: true },
      { k: 'link_pdf', l: 'Berkas PDF', t: 'url', auto: true }
    ]
  },

  siswa: {
    tab: 'Siswa', judul: 'Siswa', tunggal: 'siswa', ikon: 'students', menu: 'Data induk', impor: true,
    judulField: 'nama', subField: 'kelas_saat_ini', urut: ['nama', 'asc'], unik: ['nisn'],
    field: [
      { k: 'no_induk', l: 'No. induk', t: 'teks', auto: true, tabel: true, grup: 'Identitas' },
      { k: 'nama', l: 'Nama lengkap', t: 'teks', wajib: true, tabel: true, penuh: true },
      { k: 'nama_panggilan', l: 'Nama panggilan', t: 'teks' },
      { k: 'nisn', l: 'NISN', t: 'teks', tabel: true },
      { k: 'nis_lokal', l: 'NIS lokal', t: 'teks' },
      { k: 'jenis_kelamin', l: 'Jenis kelamin', t: 'pilih', opsi: ['L', 'P'], wajib: true },
      { k: 'agama', l: 'Agama', t: 'pilih', opsi: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'] },
      { k: 'tempat_lahir', l: 'Tempat lahir', t: 'teks' },
      { k: 'tanggal_lahir', l: 'Tanggal lahir', t: 'tanggal', wajib: true },
      { k: 'kewarganegaraan', l: 'Kewarganegaraan', t: 'teks', awal: 'Indonesia' },
      { k: 'bahasa_sehari_hari', l: 'Bahasa sehari-hari', t: 'teks' },
      { k: 'golongan_darah', l: 'Golongan darah', t: 'pilih', opsi: ['A', 'B', 'AB', 'O'] },
      { k: 'anak_ke', l: 'Anak ke-berapa', t: 'teks' },
      { k: 'saudara_kandung', l: 'Jumlah saudara kandung', t: 'teks' },
      { k: 'saudara_tiri', l: 'Jumlah saudara tiri', t: 'teks' },
      { k: 'saudara_angkat', l: 'Jumlah saudara angkat', t: 'teks' },
      { k: 'no_hp_ortu', l: 'No. HP orang tua/wali', t: 'tel' },
      { k: 'alamat', l: 'Alamat (jalan/dusun)', t: 'area', penuh: true, grup: 'Alamat' },
      { k: 'rt', l: 'RT', t: 'teks' },
      { k: 'rw', l: 'RW', t: 'teks' },
      { k: 'desa_kelurahan', l: 'Desa/kelurahan', t: 'teks' },
      { k: 'kecamatan', l: 'Kecamatan', t: 'teks' },
      { k: 'kabupaten_kota', l: 'Kabupaten/kota', t: 'teks' },
      { k: 'provinsi', l: 'Provinsi', t: 'teks' },
      { k: 'kode_pos', l: 'Kode pos', t: 'teks' },
      { k: 'jarak_ke_sekolah', l: 'Jarak ke sekolah (km)', t: 'teks' },
      { k: 'nama_ayah', l: 'Nama ayah', t: 'teks', grup: 'Orang tua dan wali' },
      { k: 'pendidikan_ayah', l: 'Pendidikan ayah', t: 'teks' },
      { k: 'pekerjaan_ayah', l: 'Pekerjaan ayah', t: 'teks' },
      { k: 'nama_ibu', l: 'Nama ibu', t: 'teks' },
      { k: 'pendidikan_ibu', l: 'Pendidikan ibu', t: 'teks' },
      { k: 'pekerjaan_ibu', l: 'Pekerjaan ibu', t: 'teks' },
      { k: 'nama_wali', l: 'Nama wali', t: 'teks' },
      { k: 'hubungan_wali', l: 'Hubungan keluarga wali', t: 'teks' },
      { k: 'pendidikan_wali', l: 'Pendidikan wali', t: 'teks' },
      { k: 'pekerjaan_wali', l: 'Pekerjaan wali', t: 'teks' },
      { k: 'asal_sekolah', l: 'Asal sekolah', t: 'teks', grup: 'Data sekolah' },
      { k: 'kelas_saat_ini', l: 'Kelas', t: 'teks', wajib: true, tabel: true, filter: true },
      { k: 'tingkat', l: 'Tingkat', t: 'pilih', opsi: ['7', '8', '9'], filter: true },
      { k: 'tanggal_masuk', l: 'Tanggal masuk', t: 'tanggal' },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Lulus', 'Keluar', 'Pindah', 'Mengundurkan Diri'], awal: 'Aktif', wajib: true, tabel: true, filter: true, badge: true },
      { k: 'tanggal_keluar', l: 'Tanggal keluar/lulus', t: 'tanggal' },
      { k: 'keterangan_keluar', l: 'Keterangan keluar', t: 'teks', penuh: true },
      { k: 'nomor_ijazah', l: 'Nomor ijazah/STTB', t: 'teks', bantu: 'Diisi bila lulus.' },
      { k: 'melanjutkan_ke', l: 'Melanjutkan ke sekolah', t: 'teks', bantu: 'Diisi bila lulus.' },
      { k: 'pindah_ke_sekolah', l: 'Pindah ke sekolah', t: 'teks', bantu: 'Diisi bila pindah.' },
      { k: 'pindah_ke_tingkat', l: 'Pindah ke tingkat', t: 'teks' },
      { k: 'kebutuhan_khusus', l: 'Kebutuhan khusus', t: 'teks', penuh: true, grup: 'Layanan pendidikan inklusif', bantu: 'Isi bila peserta didik berkebutuhan khusus, agar layanan inklusif terdata. Kosongkan bila tidak ada.' }
    ]
  },

  pegawai: {
    tab: 'Pegawai', judul: 'Pegawai', tunggal: 'pegawai', ikon: 'staff', menu: 'Data induk', impor: true,
    judulField: 'nama', subField: 'jabatan', urut: ['nama', 'asc'], unik: ['nip_nuptk'],
    field: [
      { k: 'nama', l: 'Nama lengkap', t: 'teks', wajib: true, tabel: true, penuh: true, grup: 'Identitas' },
      { k: 'nip_nuptk', l: 'NIP / NUPTK', t: 'teks', tabel: true },
      { k: 'jenis_kelamin', l: 'Jenis kelamin', t: 'pilih', opsi: ['L', 'P'], wajib: true },
      { k: 'tempat_lahir', l: 'Tempat lahir', t: 'teks' },
      { k: 'tanggal_lahir', l: 'Tanggal lahir', t: 'tanggal' },
      { k: 'jabatan', l: 'Jabatan', t: 'teks', wajib: true, tabel: true, grup: 'Kepegawaian' },
      { k: 'kategori', l: 'Kategori', t: 'pilih', opsi: ['Guru', 'Tenaga Kependidikan', 'Kepala Sekolah'], wajib: true, filter: true, tabel: true },
      { k: 'status_kepegawaian', l: 'Status kepegawaian', t: 'pilih', opsi: ['PNS', 'PPPK', 'PPPK Paruh Waktu', 'Honorer'], filter: true },
      { k: 'pangkat_golongan', l: 'Pangkat/golongan', t: 'teks' },
      { k: 'pendidikan_terakhir', l: 'Pendidikan terakhir', t: 'teks' },
      { k: 'tanggal_mulai_tugas', l: 'Mulai tugas', t: 'tanggal' },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Pindah', 'Pensiun', 'Berhenti'], awal: 'Aktif', wajib: true, tabel: true, filter: true, badge: true },
      { k: 'keterangan', l: 'Keterangan', t: 'area', penuh: true }
    ]
  },

  // Inventaris: model KIR (Kartu Inventaris Ruangan). Satu baris = satu jenis barang di satu ruangan,
  // dengan jumlah per kondisi (baik, rusak ringan, rusak berat).
  ruang: {
    tab: 'Ruang', judul: 'Ruangan', tunggal: 'ruangan', ikon: 'ruang', menu: 'Sarana prasarana', impor: true,
    judulField: 'nama_ruang', subField: 'jenis_ruang', urut: ['nama_ruang', 'asc'], unik: ['kode_ruang', 'nama_ruang'],
    field: [
      { k: 'nama_ruang', l: 'Nama ruangan', t: 'teks', wajib: true, tabel: true, penuh: true, grup: 'Ruangan', bantu: 'Nama harus unik, mis. Ruang Kelas 7A. Barang dihubungkan lewat nama ini.' },
      { k: 'kode_ruang', l: 'Kode ruangan', t: 'teks', tabel: true },
      { k: 'jenis_ruang', l: 'Jenis ruangan', t: 'pilih', opsi: ['Ruang Kelas', 'Perpustakaan', 'Laboratorium IPA', 'Laboratorium Komputer', 'Ruang Kepala Sekolah', 'Ruang Guru', 'Ruang Tata Usaha', 'Ruang BK', 'Ruang UKS', 'Ruang OSIS', 'Tempat Ibadah', 'Toilet', 'Gudang', 'Aula', 'Kantin', 'Koperasi', 'Lapangan Olahraga', 'Lainnya'], wajib: true, tabel: true, filter: true },
      { k: 'gedung_lantai', l: 'Gedung / lantai', t: 'teks' },
      { k: 'luas_m2', l: 'Luas (m2)', t: 'teks' },
      { k: 'kondisi_ruang', l: 'Kondisi ruangan', t: 'pilih', opsi: ['Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat'], awal: 'Baik', tabel: true, filter: true, badge: true, bantu: 'Mengikuti klasifikasi Dapodik: rusak ringan 1-30%, sedang 31-45%, berat 46-100%.' },
      { k: 'penanggung_jawab', l: 'Penanggung jawab', t: 'teks', tabel: true },
      { k: 'keterangan', l: 'Keterangan', t: 'area', penuh: true }
    ]
  },

  aset: {
    tab: 'Aset', judul: 'Inventaris Barang', nav: 'Barang', tunggal: 'barang', ikon: 'aset', menu: 'Sarana prasarana', impor: true,
    judulField: 'nama_barang', subField: 'ruang', urut: ['ruang', 'asc'],
    field: [
      { k: 'nama_barang', l: 'Nama barang', t: 'teks', wajib: true, tabel: true, penuh: true, grup: 'Barang' },
      { k: 'ruang', l: 'Ruangan', t: 'pilih', opsiDari: 'ruang', opsiKunci: 'nama_ruang', wajib: true, tabel: true, filter: true },
      { k: 'kategori', l: 'Kategori', t: 'pilih', opsi: ['Mebel (meja, kursi, lemari)', 'Peralatan TIK', 'Peralatan Kantor', 'Alat Peraga dan Laboratorium', 'Buku dan Koleksi Perpustakaan', 'Alat Olahraga dan Seni', 'Elektronik Lainnya', 'Perlengkapan Ibadah', 'Lainnya'], filter: true },
      { k: 'merk_model', l: 'Merk / model', t: 'teks' },
      { k: 'nomor_seri', l: 'Nomor seri', t: 'teks' },
      { k: 'ukuran_bahan', l: 'Ukuran / bahan', t: 'teks' },
      { k: 'kode_barang', l: 'Kode barang', t: 'teks', bantu: 'Opsional. Isi menurut kodefikasi barang milik daerah (Permendagri 108/2016) atau ketentuan dinas.' },
      { k: 'tahun_perolehan', l: 'Tahun perolehan', t: 'angka', grup: 'Perolehan' },
      { k: 'sumber_dana', l: 'Sumber dana', t: 'pilih', opsi: ['BOS', 'BOSDA', 'APBN', 'APBD', 'DAK', 'Hibah', 'Komite / Orang Tua', 'Swadaya', 'Lainnya'], filter: true },
      { k: 'harga_satuan', l: 'Harga satuan', t: 'angka', rupiah: true },
      { k: 'jml_baik', l: 'Baik', t: 'angka', wajib: true, awal: '0', tabel: true, grup: 'Jumlah menurut kondisi' },
      { k: 'jml_rusak_ringan', l: 'Rusak ringan', t: 'angka', wajib: true, awal: '0', tabel: true },
      { k: 'jml_rusak_berat', l: 'Rusak berat', t: 'angka', wajib: true, awal: '0', tabel: true },
      { k: 'jumlah', l: 'Total', t: 'angka', auto: true, tabel: true },
      { k: 'keterangan', l: 'Keterangan', t: 'area', penuh: true }
    ]
  },

  kode_klasifikasi: {
    tab: 'KodeKlasifikasi', judul: 'Kode Klasifikasi', nav: 'Kode klasifikasi', tunggal: 'kode klasifikasi', ikon: 'tag', menu: 'Pengaturan',
    adminSaja: true, impor: true, judulField: 'nama', subField: 'kode', urut: ['kode', 'asc'], unik: ['kode'],
    field: [
      { k: 'kode', l: 'Kode', t: 'teks', wajib: true, tabel: true },
      { k: 'nama', l: 'Nama klasifikasi', t: 'teks', wajib: true, tabel: true, penuh: true },
      { k: 'kategori', l: 'Kategori', t: 'pilih', opsi: ['Umum', 'Pendidikan', 'Kepegawaian', 'Keuangan', 'Lainnya'], awal: 'Umum', tabel: true, filter: true },
      { k: 'keterangan', l: 'Keterangan', t: 'area', tabel: true, penuh: true },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Nonaktif'], awal: 'Aktif', tabel: true, filter: true, badge: true, bantu: 'Kode nonaktif tidak muncul di pilihan surat keluar baru.' }
    ]
  },

  jenis_surat: {
    tab: 'JenisSurat', judul: 'Jenis Surat', nav: 'Jenis surat', tunggal: 'jenis surat', ikon: 'berkas', menu: 'Pengaturan',
    adminSaja: true, impor: true, judulField: 'nama', subField: 'singkatan', urut: ['nama', 'asc'], unik: ['singkatan', 'nama'],
    field: [
      { k: 'singkatan', l: 'Singkatan', t: 'teks', wajib: true, tabel: true, bantu: 'Dipakai di format nomor surat sebagai {jenis}.' },
      { k: 'nama', l: 'Nama jenis surat', t: 'teks', wajib: true, tabel: true, penuh: true },
      { k: 'layout', l: 'Format cetak', t: 'pilih', opsi: ['Surat umum', 'Undangan', 'Surat tugas', 'Edaran', 'Keterangan', 'Keputusan', 'Nota dinas'], awal: 'Surat umum', wajib: true, tabel: true, filter: true, bantu: 'Tata letak PDF dan isian tambahan di form surat keluar.' },
      { k: 'keterangan', l: 'Keterangan', t: 'area', tabel: true, penuh: true },
      { k: 'status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Nonaktif'], awal: 'Aktif', tabel: true, badge: true }
    ]
  }
};

// nama format cetak (pilihan di Jenis Surat) -> kunci tata letak
var LAYOUT_KUNCI = { 'Surat umum': 'umum', 'Undangan': 'undangan', 'Surat tugas': 'tugas', 'Edaran': 'edaran', 'Keterangan': 'keterangan', 'Keputusan': 'keputusan', 'Nota dinas': 'nota' };

// {kode} kode klasifikasi, {urut} nomor urut 3 digit, {no} nomor urut tanpa nol, {jenis} singkatan jenis surat,
// {unit} kode unit kerja, {bulan} bulan romawi, {tahun} tahun surat
var FORMAT_NOMOR_AWAL = '{kode}/{urut}/{unit}/{tahun}';
var TOKEN_NOMOR = ['kode', 'urut', 'no', 'jenis', 'unit', 'bulan', 'tahun'];

// Jenjang menentukan pilihan tingkat kelas pada modul Siswa. Nama kelas (7A, 1B, X IPA 1) diketik bebas.
var JENJANG = {
  SD: { label: 'SD / MI (kelas 1 sampai 6)', tingkat: ['1', '2', '3', '4', '5', '6'], contoh: '1A' },
  SMP: { label: 'SMP / MTs (kelas 7 sampai 9)', tingkat: ['7', '8', '9'], contoh: '7A' },
  SMA: { label: 'SMA / MA (kelas 10 sampai 12)', tingkat: ['10', '11', '12'], contoh: 'X IPA 1' },
  SMK: { label: 'SMK (kelas 10 sampai 12)', tingkat: ['10', '11', '12'], contoh: 'X TKJ 1' }
};
var TINGKAT_SEMUA = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

var URUTAN_MODUL = ['surat_masuk', 'surat_keluar', 'siswa', 'pegawai', 'ruang', 'aset', 'kode_klasifikasi', 'jenis_surat'];

var PENGATURAN_KOLOM = ['nama_sekolah', 'jenjang', 'npsn', 'nama_pemerintah', 'nama_dinas', 'alamat', 'kontak_web_email', 'kota', 'kode_unit_kerja',
  'format_nomor', 'nama_kepala_sekolah', 'nip_kepala_sekolah', 'status_kepala_sekolah', 'logo_drive_file_id', 'logo_kanan_drive_file_id', 'kop_drive_file_id', 'folder_akar_id', 'folder_hasil_cetak_id', 'template_surat_keluar_id',
  'template_surat_undangan_id', 'template_surat_tugas_id', 'template_surat_edaran_id', 'template_surat_keterangan_umum_id',
  'template_surat_keputusan_id', 'template_surat_nota_id',
  'template_induk_siswa_id', 'template_induk_pegawai_id', 'template_surat_keterangan_id', 'template_kir_id',
  'baseline_json', 'cadangan_folder_id', 'cadangan_terakhir'];

// kolom pengaturan yang boleh diubah dari aplikasi web
var PENGATURAN_BOLEH = ['nama_sekolah', 'jenjang', 'npsn', 'nama_pemerintah', 'nama_dinas', 'alamat', 'kontak_web_email', 'kota', 'kode_unit_kerja',
  'format_nomor', 'nama_kepala_sekolah', 'nip_kepala_sekolah', 'status_kepala_sekolah'];

var PENGGUNA_KOLOM = ['id', 'username', 'nama', 'peran', 'hash', 'salt', 'aktif', 'login_terakhir', 'dibuat_pada'];
var PERAN_KOLOM = ['peran', 'modul', 'lihat', 'tambah', 'ubah', 'hapus', 'cetak'];
var PERAN_DAPAT_DIATUR = ['Operator', 'Pimpinan'];
var SEMUA_PERAN = ['Admin', 'Operator', 'Pimpinan'];

var IZIN_AWAL = {
  Operator: { lihat: true, tambah: true, ubah: true, hapus: false, cetak: true },
  Pimpinan: { lihat: true, tambah: false, ubah: false, hapus: false, cetak: true }
};

// Daftar awal kode klasifikasi (acuan Permendagri 78/2012 tentang tata kearsipan, dipangkas untuk kebutuhan sekolah).
// Diambil dari aplikasi Tata Usaha induk. Sekolah dapat mengubah, menonaktifkan, atau menambah kode sendiri.
// Format: [kode, nama, kategori, keterangan]
var KODE_STANDAR = [
  ['000', 'Umum', 'Umum', 'Surat umum yang tidak termasuk kategori lain'],
  ['005', 'Undangan', 'Umum', 'Undangan rapat, acara, kegiatan'],
  ['045', 'Kearsipan', 'Umum', 'Tata kearsipan dan dokumentasi'],
  ['045.4', 'Kenaikan Pangkat dan Pensiun Pegawai', 'Kepegawaian', 'Surat pengantar usulan kenaikan pangkat, SKPP pensiun'],
  ['400.3.5', 'Kegiatan dan Rapat Dinas', 'Umum', 'Undangan rapat dinas, sosialisasi, kegiatan internal sekolah'],
  ['400.3.5.3', 'Surat Tugas Bimtek/Sosialisasi Eksternal', 'Umum', 'Sub dari 400.3.5, penugasan menghadiri bimtek/sosialisasi di luar sekolah'],
  ['400.3.11.1', 'Kelulusan dan Transkrip Nilai', 'Pendidikan', 'SK penetapan kelulusan, transkrip nilai kelas akhir'],
  ['420', 'Kerjasama dan Penelitian Eksternal', 'Pendidikan', 'Balasan izin/keterangan penelitian skripsi mahasiswa'],
  ['421', 'Kebijakan dan Program Pendidikan', 'Pendidikan', ''],
  ['421.6', 'Kegiatan Sekolah', 'Pendidikan', 'Dies natalis, lustrum, acara sekolah'],
  ['421.7', 'Kegiatan Pelajar', 'Pendidikan', 'Lomba, study tour, kegiatan siswa'],
  ['421.8', 'Balasan Observasi Mahasiswa', 'Pendidikan', 'Balasan izin observasi PPL/skripsi mahasiswa'],
  ['422', 'Surat Keterangan', 'Pendidikan', 'Keterangan umum siswa (pindah sekolah, status siswa, dsb)'],
  ['422.1', 'Administrasi Sekolah', 'Pendidikan', ''],
  ['422.2', 'Penerimaan Siswa Baru & Ujian', 'Pendidikan', 'PPDB, testing, MPLS'],
  ['422.3', 'Tahun Pelajaran', 'Pendidikan', ''],
  ['422.4', 'Hari Libur Sekolah', 'Pendidikan', ''],
  ['422.5', 'SPP dan Uang Sekolah', 'Pendidikan', ''],
  ['422.6', 'Beasiswa dan Penghargaan Siswa', 'Pendidikan', ''],
  ['422.7', 'Ijazah dan Sertifikat', 'Pendidikan', ''],
  ['423.5', 'Kurikulum', 'Pendidikan', ''],
  ['423.6', 'Karya Tulis/Karya Ilmiah', 'Pendidikan', ''],
  ['424', 'Surat Tugas', 'Umum', 'Penugasan pegawai/guru dinas luar, workshop, bimtek (termasuk SPPD)'],
  ['425', 'Sertifikasi Guru', 'Pendidikan', ''],
  ['425.1', 'Sarana dan Prasarana Pendidikan', 'Pendidikan', ''],
  ['800', 'Perizinan dan Cuti Pegawai', 'Kepegawaian', 'Surat izin atasan, cuti pegawai'],
  ['810', 'Kepegawaian (Umum)', 'Kepegawaian', ''],
  ['812', 'Pengadaan/Penerimaan Pegawai Baru', 'Kepegawaian', ''],
  ['813', 'Pendaftaran CPNS/PPPK', 'Kepegawaian', ''],
  ['821', 'Pengangkatan Pegawai', 'Kepegawaian', 'CPNS/PPPK'],
  ['822', 'Kenaikan Pangkat/Golongan', 'Kepegawaian', ''],
  ['823', 'Pengangkatan dalam Jabatan', 'Kepegawaian', ''],
  ['824', 'Mutasi/Pemindahan Pegawai', 'Kepegawaian', ''],
  ['831', 'Berkas/Data Kepegawaian', 'Kepegawaian', 'Dosir pegawai'],
  ['832', 'Penyesuaian Pangkat/Gaji', 'Kepegawaian', ''],
  ['900', 'Keuangan (Umum)', 'Keuangan', 'BOS, SPP, honor, dsb'],
  ['911', 'Anggaran (RKAS)', 'Keuangan', '']
];

// Daftar awal jenis surat. Format: [singkatan, nama, format cetak, keterangan]
var JENIS_STANDAR = [
  ['ND', 'Nota Dinas', 'Surat umum', 'Komunikasi internal antar unit/pejabat'],
  ['SE', 'Surat Edaran', 'Surat umum', 'Pemberitahuan/instruksi ke banyak pihak'],
  ['SKU', 'Surat Keluar Umum', 'Surat umum', 'Surat keluar lain yang tidak masuk jenis di atas'],
  ['SK', 'Surat Keputusan', 'Surat umum', 'Penetapan kebijakan/keputusan resmi'],
  ['SKet', 'Surat Keterangan', 'Surat umum', 'Keterangan status siswa/pegawai/dokumen'],
  ['SPt', 'Surat Pemberitahuan', 'Surat umum', 'Pemberitahuan umum ke pihak luar'],
  ['ST', 'Surat Tugas', 'Surat tugas', 'Penugasan pegawai/guru untuk kegiatan tertentu'],
  ['Und', 'Surat Undangan', 'Surat umum', 'Undangan rapat/acara']
];

var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September',
  'Oktober', 'November', 'Desember'];

function fieldModul_(m, k) {
  for (var i = 0; i < m.field.length; i++) if (m.field[i].k === k) return m.field[i];
  return null;
}

function kolomModul_(m) {
  return ['id'].concat(m.field.map(function (f) { return f.k; }),
    ['dibuat_oleh', 'dibuat_pada', 'diubah_oleh', 'diubah_pada', 'dihapus']);
}
