// Server tiruan untuk pratinjau lokal. Data di bawah hanya contoh tampilan, bukan data sekolah.
(function () {
  var SK = window.__SKEMA, MODUL = SK.MODUL, URUT = SK.URUTAN_MODUL;
  var params = new URLSearchParams(location.search);
  var adaUser = !params.has('baru');
  var USERS = [
    { id: 'u1', username: 'admin', nama: 'Admin Contoh', peran: 'Admin', aktif: true, login_terakhir: '2026-09-28T08:12', sandi: 'rahasia123' },
    { id: 'u2', username: 'operator', nama: 'Operator Contoh', peran: 'Operator', aktif: true, login_terakhir: '', sandi: 'rahasia123' },
    { id: 'u3', username: 'kepsek', nama: 'Pimpinan Contoh', peran: 'Pimpinan', aktif: false, login_terakhir: '', sandi: 'rahasia123' }
  ];
  var MAT = {};
  ['Operator', 'Pimpinan'].forEach(function (p) {
    MAT[p] = {};
    URUT.forEach(function (k) {
      if (MODUL[k].adminSaja) return;
      MAT[p][k] = { lihat: true, tambah: p === 'Operator', ubah: p === 'Operator', hapus: false, cetak: true };
    });
  });
  var N = 0;
  function id() { return 'r' + (++N); }
  function row(k, o) {
    var r = { id: id(), dibuat_oleh: 'admin', dibuat_pada: '2026-09-01T09:00', diubah_oleh: 'admin', diubah_pada: '2026-09-01T09:00' };
    MODUL[k].field.forEach(function (f) { r[f.k] = o[f.k] || ''; });
    return r;
  }
  var DATA = { surat_masuk: [], surat_keluar: [], siswa: [], pegawai: [], ruang: [], aset: [], kode_klasifikasi: [], jenis_surat: [] };
  [['000', 'Umum', 'Umum'], ['005', 'Undangan', 'Umum'], ['421', 'Kebijakan dan Program Pendidikan', 'Pendidikan'], ['422', 'Surat Keterangan', 'Pendidikan'], ['424', 'Surat Tugas', 'Umum'], ['800', 'Perizinan dan Cuti Pegawai', 'Kepegawaian']].forEach(function (c) {
    DATA.kode_klasifikasi.push(row('kode_klasifikasi', { kode: c[0], nama: c[1], kategori: c[2], status: 'Aktif' }));
  });
  [['SKU', 'Surat Keluar Umum', 'Surat umum'], ['Und', 'Surat Undangan', 'Undangan'], ['ST', 'Surat Tugas', 'Surat tugas'], ['SKet', 'Surat Keterangan', 'Keterangan'], ['SE', 'Surat Edaran', 'Edaran'], ['SK', 'Surat Keputusan', 'Keputusan'], ['ND', 'Nota Dinas', 'Nota dinas']].forEach(function (c) {
    DATA.jenis_surat.push(row('jenis_surat', { singkatan: c[0], nama: c[1], layout: c[2], status: 'Aktif' }));
  });
  var nm = ['Andi Contoh', 'Bela Contoh', 'Candra Contoh', 'Dewi Contoh', 'Eka Contoh', 'Fajar Contoh', 'Gita Contoh', 'Hadi Contoh', 'Indah Contoh', 'Joko Contoh', 'Kirana Contoh', 'Lukman Contoh'];
  nm.forEach(function (n, i) {
    DATA.siswa.push(row('siswa', {
      no_induk: String(1001 + i), nama: n, nisn: '00' + (55012340 + i), kelas_saat_ini: (7 + i % 3) + String.fromCharCode(65 + i % 4),
      tingkat: String(7 + i % 3), jenis_kelamin: i % 2 ? 'P' : 'L', tanggal_lahir: '2012-0' + (1 + i % 9) + '-1' + (i % 9),
      status: i === 5 ? 'Pindah' : 'Aktif', nama_ayah: 'Bapak ' + n.split(' ')[1], asal_sekolah: 'SDN Contoh ' + (1 + i % 4)
    }));
  });
  ['Kepala Contoh, M.Pd.', 'Guru Contoh Satu, S.Pd.', 'Operator Contoh, S.Kom.', 'Guru Contoh Dua, S.Pd.', 'Penjaga Contoh'].forEach(function (n, i) {
    DATA.pegawai.push(row('pegawai', {
      nama: n, nip_nuptk: '19800' + (10 + i) + '2005011001', jenis_kelamin: i % 2 ? 'P' : 'L',
      jabatan: ['Guru Matematika', 'Guru IPA', 'Operator', 'Guru Bahasa', 'Penjaga Sekolah'][i],
      kategori: i === 2 || i === 4 ? 'Tenaga Kependidikan' : 'Guru', status_kepegawaian: ['PNS', 'PNS', 'Honorer', 'PPPK', 'Honorer'][i], status: 'Aktif'
    }));
  });
  [['Dinas Pendidikan', 'Undangan rapat koordinasi kepala sekolah', 'Segera', 'Baru', '2026-09-25'],
   ['Kelurahan Contoh', 'Permohonan data siswa penerima bantuan', 'Biasa', 'Diproses', '2026-09-22'],
   ['Yayasan Mitra', 'Pemberitahuan jadwal penyuluhan kesehatan', 'Penting', 'Selesai', '2026-09-10']].forEach(function (a, i) {
    DATA.surat_masuk.push(row('surat_masuk', { no_agenda: '00' + (i + 1) + '/2026', asal_instansi: a[0], perihal: a[1], sifat: a[2], status: a[3], tanggal_terima: a[4], tanggal_surat: a[4] }));
  });
  DATA.surat_keluar.push(row('surat_keluar', { nomor_surat: '421/001/TU/2026', nomor_urut: '1', tahun: '2026', tanggal_surat: '2026-09-15', kode_klasifikasi: '421', perihal: 'Permohonan pembinaan olimpiade sains', tujuan: 'Kepala Dinas Pendidikan', status: 'Terbit' }));
  DATA.surat_keluar.push(row('surat_keluar', { tanggal_surat: '2026-09-27', kode_klasifikasi: '000', perihal: 'Undangan rapat orang tua siswa kelas 9', tujuan: 'Orang tua/wali siswa kelas 9', status: 'Draft' }));

  [['Ruang Kelas 7A', 'R-01', 'Ruang Kelas', 'Baik', 'Wali kelas 7A'], ['Perpustakaan', 'R-10', 'Perpustakaan', 'Rusak Ringan', 'Pustakawan'], ['Laboratorium Komputer', 'R-12', 'Laboratorium Komputer', 'Baik', 'Guru TIK'], ['Gudang', 'R-20', 'Gudang', 'Rusak Berat', 'Operator']].forEach(function (a) {
    DATA.ruang.push(row('ruang', { nama_ruang: a[0], kode_ruang: a[1], jenis_ruang: a[2], kondisi_ruang: a[3], penanggung_jawab: a[4], gedung_lantai: 'Gedung A / 1' }));
  });
  [['Meja siswa', 'Ruang Kelas 7A', 'Mebel (meja, kursi, lemari)', 30, 3, 1], ['Kursi siswa', 'Ruang Kelas 7A', 'Mebel (meja, kursi, lemari)', 28, 3, 1], ['Papan tulis putih', 'Ruang Kelas 7A', 'Peralatan Kantor', 1, 0, 0],
   ['Rak buku', 'Perpustakaan', 'Mebel (meja, kursi, lemari)', 8, 2, 0], ['Komputer PC', 'Laboratorium Komputer', 'Peralatan TIK', 20, 4, 6], ['Proyektor', 'Laboratorium Komputer', 'Peralatan TIK', 1, 0, 0]].forEach(function (a) {
    var r = row('aset', { nama_barang: a[0], ruang: a[1], kategori: a[2], jml_baik: String(a[3]), jml_rusak_ringan: String(a[4]), jml_rusak_berat: String(a[5]), sumber_dana: 'BOS', tahun_perolehan: '2021', harga_satuan: '1500000' });
    r.jumlah = String(a[3] + a[4] + a[5]); DATA.aset.push(r);
  });
  function izin(u) {
    var o = {};
    URUT.forEach(function (k) {
      o[k] = {};
      ['lihat', 'tambah', 'ubah', 'hapus', 'cetak'].forEach(function (a) {
        o[k][a] = u.peran === 'Admin' ? true : MODUL[k].adminSaja ? a === 'lihat' : !!MAT[u.peran][k][a];
      });
    });
    return o;
  }
  function boot(u) {
    var iz = izin(u), m = {};
    URUT.forEach(function (k) { if (iz[k].lihat) m[k] = MODUL[k]; });
    return {
      token: new Array(65).join('a') + u.id, user: { id: u.id, nama: u.nama, username: u.username, peran: u.peran }, izin: iz, modul: m, urutan: URUT,
      sekolah: { nama_sekolah: 'SMP Negeri Contoh 1', npsn: '20600000', alamat: 'Jl. Contoh No. 1', kota: 'Kota Contoh', nama_kepala_sekolah: 'Drs. Kepala Contoh', nip_kepala_sekolah: '196802161991031008', status_kepala_sekolah: '' }, logo: '',
      hariIni: new Date().toISOString().slice(0, 10)
    };
  }
  function user(t) {
    var u = USERS.filter(function (x) { return t && t.slice(64) === x.id && x.aktif; })[0];
    if (!u) throw new Error('SESI_HABIS');
    return u;
  }
  function ok(r) { return JSON.parse(JSON.stringify(r)); }
  var API = {
    apiStatusAwal: function () { return { adaPengguna: adaUser, sekolah: 'SMP Negeri Contoh 1', logo: '' }; },
    apiBuatAdmin: function (n, u, s) {
      if (s.length < 8) throw new Error('Kata sandi minimal 8 karakter.');
      adaUser = true; USERS[0].nama = n; USERS[0].username = u; USERS[0].sandi = s; return boot(USERS[0]);
    },
    apiMasuk: function (u, s) {
      var x = USERS.filter(function (y) { return y.username === u; })[0];
      if (!x || x.sandi !== s) throw new Error('Nama pengguna atau kata sandi salah.');
      if (!x.aktif) throw new Error('Akun ini dinonaktifkan. Hubungi admin sekolah.');
      return boot(x);
    },
    apiSesi: function (t) { return boot(user(t)); },
    apiKeluar: function () { return true; },
    apiList: function (t, k) { user(t); return ok(DATA[k]); },
    apiSimpan: function (t, k, d) {
      user(t);
      var m = MODUL[k], gal = [];
      m.field.forEach(function (f) {
        var v = d.id ? (d[f.k] !== undefined ? d[f.k] : 'x') : d[f.k];
        if (!f.auto && f.wajib && !(v || '').toString().trim()) gal.push(f.l + ' wajib diisi.');
      });
      if (gal.length) throw new Error(gal.join(' '));
      var r = d.id ? DATA[k].filter(function (x) { return x.id === d.id; })[0] : row(k, {});
      m.field.forEach(function (f) {
        if (f.auto) return;
        if (d[f.k] !== undefined) r[f.k] = d[f.k];
        else if (!d.id && f.awal) r[f.k] = f.awal === 'hariini' ? new Date().toISOString().slice(0, 10) : f.awal;
      });
      if (k === 'aset') r.jumlah = String((+r.jml_baik || 0) + (+r.jml_rusak_ringan || 0) + (+r.jml_rusak_berat || 0));
      if (!d.id) {
        if (k === 'siswa') r.no_induk = String(1001 + DATA.siswa.length);
        if (k === 'surat_masuk') r.no_agenda = '00' + (DATA.surat_masuk.length + 1) + '/2026';
        if (k === 'surat_keluar') r.status = 'Draft';
        DATA[k].unshift(r);
      }
      return ok(r);
    },
    apiHapus: function (t, k, i) { DATA[k] = DATA[k].filter(function (x) { return x.id !== i; }); return true; },
    apiAksi: function (t, k, a, i) {
      var r = DATA[k].filter(function (x) { return x.id === i; })[0];
      if (a === 'terbitkan') { r.nomor_surat = r.kode_klasifikasi + '/00' + (DATA.surat_keluar.length + 1) + '/TU/2026'; r.status = 'Terbit'; r.tahun = '2026'; return ok(r); }
      if (a === 'batalkan') { r.status = 'Dibatalkan'; return ok(r); }
      if (a === 'kir') return { nama: 'KIR contoh.pdf', url: 'https://example.org/kir.pdf' };
      return { nama: 'Dokumen contoh.pdf', url: 'https://example.org/contoh.pdf' };
    },
    apiImpor: function (t, k, rows) { return { ok: rows.length - 1, gagal: [{ baris: rows[0]._baris, alasan: 'Contoh alasan gagal.' }] }; },
    apiBeranda: function (t) {
      var u = user(t), iz = izin(u), b = {};
      if (iz.siswa.lihat) b.siswa = { aktif: DATA.siswa.filter(function (s) { return s.status === 'Aktif'; }).length, perTingkat: { '7': 4, '8': 4, '9': 3 } };
      if (iz.pegawai.lihat) b.pegawai = { aktif: DATA.pegawai.length, perKategori: { Guru: 3, 'Tenaga Kependidikan': 2 } };
      if (iz.aset.lihat) b.aset = { jenis: DATA.aset.length, baik: 88, rr: 12, rb: 8, unit: 108 };
      if (iz.ruang.lihat) b.ruang = { jumlah: DATA.ruang.length };
      if (iz.surat_masuk.lihat) b.suratMasuk = { bulanIni: 2, antrian: DATA.surat_masuk.filter(function (s) { return s.status !== 'Selesai'; }) };
      if (iz.surat_keluar.lihat) b.suratKeluar = { tahunIni: 1, draft: DATA.surat_keluar.filter(function (s) { return s.status === 'Draft'; }) };
      if (b.suratMasuk) { b.suratMasuk.belumSelesai = b.suratMasuk.antrian.length; b.suratMasuk.segera = 1; }
      var hari = new Date().toISOString().slice(0, 10);
      b.aktivitas = [
        { waktu: hari + 'T10:05', pengguna: 'admin', modul: 'surat_masuk', aksi: 'tambah', ringkas: '', jumlah: 1 },
        { waktu: hari + 'T09:40', pengguna: 'operator', modul: 'siswa', aksi: 'impor', ringkas: '', jumlah: 12 },
        { waktu: hari + 'T08:12', pengguna: 'admin', modul: 'surat_keluar', aksi: 'terbitkan', ringkas: '421/027/TU/2026', jumlah: 1 },
        { waktu: '2026-11-16T14:20', pengguna: 'admin', modul: 'ruang', aksi: 'kir', ringkas: 'Lab Komputer', jumlah: 1 }
      ];
      return ok(b);
    },
    apiUbahSandiSaya: function () { return true; },
    apiPengaturanAmbil: function () {
      return { jenjangOpsi: [{ v: 'SD', l: 'SD / MI (kelas 1 sampai 6)' }, { v: 'SMP', l: 'SMP / MTs (kelas 7 sampai 9)' }, { v: 'SMA', l: 'SMA / MA (kelas 10 sampai 12)' }, { v: 'SMK', l: 'SMK (kelas 10 sampai 12)' }], jenjang: 'SMP', format_nomor: '{kode}/{urut}/{unit}/{tahun}', kopAda: false, logoKanan: '', nama_pemerintah: '', nama_dinas: '', kontak_web_email: '', status_kepala_sekolah: '', nama_sekolah: 'SMP Negeri Contoh 1', npsn: '20600000', alamat: 'Jl. Contoh No. 1', kota: 'Kota Contoh', kode_unit_kerja: 'TU', nama_kepala_sekolah: '', nip_kepala_sekolah: '', logo: '', folderUrl: '', templateSiap: false };
    },
    apiPengaturanSimpan: function () { return true; },
    apiLogo: function () { return ''; },
    apiTemplateBuat: function () { return true; },
    apiPenggunaDaftar: function () {
      return ok(USERS.map(function (u) { return { id: u.id, username: u.username, nama: u.nama, peran: u.peran, aktif: u.aktif, login_terakhir: u.login_terakhir }; }));
    },
    apiPenggunaSimpan: function () { return true; },
    apiPeranAmbil: function () {
      return {
        matriks: ok(MAT), peran: ['Operator', 'Pimpinan'],
        modul: URUT.filter(function (k) { return !MODUL[k].adminSaja; }).map(function (k) { return { k: k, judul: MODUL[k].judul }; }),
        aksi: ['lihat', 'tambah', 'ubah', 'hapus', 'cetak']
      };
    },
    apiPeranSimpan: function () { return true; },
    apiCatatImpor: function () { return true; },
    apiRapikanFolder: function () { return 'https://drive/folder'; },
    apiMuatStandar: function () { return { ditambah: 30, diperbarui: 0, dilewati: 6 }; },
    apiKop: function () { return true; }, apiKopAmbil: function () { return ''; }, apiKopHapus: function () { return true; },
    apiSiapkanUlang: function () { return true; },
    apiBaselineSimpan: function () { return {}; },
    apiCadanganStatus: function () { return { otomatis: false, terakhir: '', maks: 8, folderUrl: '', daftar: [] }; },
    apiCadanganSekarang: function () { return { nama: 'Cadangan contoh', url: 'https://example.org' }; },
    apiCadanganOtomatis: function () { return true; },
    apiDampak: function (t, hari) {
      var kg = [['surat_masuk', 'Mencatat surat masuk (no. agenda otomatis)', 42, 38, 5], ['surat_keluar', 'Menerbitkan surat keluar (nomor otomatis)', 27, 9, 8], ['cetak', 'Mencetak dokumen PDF (surat, buku induk, keterangan, KIR)', 61, 7, 6], ['orang', 'Memasukkan data siswa atau pegawai', 1190, 1.4, 2], ['barang', 'Mencatat ruangan dan barang inventaris', 56, 25, null]];
      return { periodeHari: hari, sejak: '2026-09-12', totalCatatan: 1500, kali_masuk: 88, penggunaAktif: 4,
        kegiatan: kg.map(function (k) { return { id: k[0], label: k[1], jumlah: k[2], sampel: 5, medianDetik: k[3], baselineMenit: k[4], hematMenit: k[4] ? Math.round(k[2] * (k[4] - k[3] / 60)) : null }; }),
        surat: { diterbitkan: 27, ganda: 0, total: 30 },
        kualitas: [{ label: 'Siswa aktif dengan NISN terisi', persen: 98.4, total: 1140 }, { label: 'Pegawai dengan NIP/NUPTK terisi', persen: 100, total: 50 }],
        tema: { inklusif: { abk: 3, siswaAktif: 1140 }, stem: { unitLab: 40, unitLabRusak: 4, unitTik: 60, unitTikRusak: 10 }, literasi: { buku: 2400, perpustakaan: 1 } },
        ringkasan: { siswa: 1142, pegawai: 50, ruang: 40, jenisBarang: 210 } };
    }
  };
  function runner(s, f) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (fn) { return runner(fn, f); };
        if (name === 'withFailureHandler') return function (fn) { return runner(s, fn); };
        return function () {
          var a = arguments;
          setTimeout(function () {
            try { var r = API[name].apply(null, a); if (s) s(r); } catch (e) { if (f) f({ message: e.message }); }
          }, 120);
        };
      }
    });
  }
  window.google = { script: { run: runner(null, null) } };
})();
