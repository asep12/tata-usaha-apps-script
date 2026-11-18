/** TITIK MASUK WEB APP + API YANG DIPANGGIL DARI BROWSER (google.script.run). */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Tata Usaha')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function sertakan_(nama) { return HtmlService.createHtmlOutputFromFile(nama).getContent(); }

/* ---------- data modul ---------- */

function apiList(token, kunci, paksa) {
  var u = sesi_(token);
  modul_(kunci);
  wajibIzin_(u, kunci, 'lihat');
  // paksa = tombol Muat ulang: baca langsung dari Sheet. Kolom kosong tidak dikirim (data siswa ±60 kolom,
  // sebagian besar kosong), browser menganggapnya kosong. Ukuran kiriman turun jauh.
  return daftarModul_(kunci, !!paksa).map(function (r) {
    var o = {};
    for (var k in r) if (r[k] !== '') o[k] = r[k];
    return o;
  });
}

function apiSimpan(token, kunci, data, durasi) {
  var u = sesi_(token);
  modul_(kunci);
  wajibIzin_(u, kunci, data && data.id ? 'ubah' : 'tambah');
  if (MODUL[kunci].adminSaja) wajibAdmin_(u);
  var hasil = simpanModul_(kunci, data || {}, u);
  catat_(u, kunci, data && data.id ? 'ubah' : 'tambah', ringkasCatatan_(kunci, hasil), data && data.id ? null : durasi, 1);
  return hasil;
}

function apiHapus(token, kunci, id) {
  var u = sesi_(token);
  modul_(kunci);
  wajibIzin_(u, kunci, 'hapus');
  var ok = hapusModul_(kunci, id, u);
  catat_(u, kunci, 'hapus', '', null, 1);
  return ok;
}

function apiImpor(token, kunci, baris) {
  var u = sesi_(token);
  modul_(kunci);
  wajibIzin_(u, kunci, 'tambah');
  if (MODUL[kunci].adminSaja) wajibAdmin_(u);
  if (!baris || !baris.length) throw new Error('Tidak ada baris untuk diimpor.');
  if (baris.length > 150) throw new Error('Maksimal 150 baris per kiriman.');
  return imporModul_(kunci, baris, u);
}

/* ---------- aksi khusus ---------- */

function lokasiGalat_(e) {
  var m = /\((\w+):(\d+):\d+\)/.exec(String(e && e.stack || ''));
  return m ? ' [' + m[1] + ':' + m[2] + ']' : '';
}

function apiAksi(token, kunci, aksi, id, param) {
  try { return apiAksiInti_(token, kunci, aksi, id, param); }
  catch (e) {
    var pesan = String(e && e.message || e);
    if (/SESI_HABIS|izin|tidak ditemukan|belum bernomor|Dibatalkan|Isi dulu|Isi daftar|sudah bernomor|kode klasifikasi|tanggal surat|jenis surat|belum punya barang|Hanya surat/i.test(pesan)) throw e;
    throw new Error(pesan + lokasiGalat_(e));   // galat teknis: sertakan lokasi kode
  }
}

function apiAksiInti_(token, kunci, aksi, id, param) {
  var u = sesi_(token);
  modul_(kunci);
  param = param || {};
  var t0 = Date.now();
  var hasil;
  if (kunci === 'surat_keluar' && aksi === 'terbitkan') { wajibIzin_(u, kunci, 'ubah'); hasil = terbitkanSurat_(id, u); }
  else if (kunci === 'surat_keluar' && aksi === 'batalkan') { wajibIzin_(u, kunci, 'ubah'); hasil = batalkanSurat_(id, u); }
  else if (kunci === 'surat_keluar' && aksi === 'cetak') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakSuratKeluar_(id, u); }
  else if (kunci === 'surat_keluar' && aksi === 'bukti') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakBuktiNomor_(id); }
  else if (kunci === 'ruang' && aksi === 'kir') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakKir_(id); }
  else if (kunci === 'siswa' && aksi === 'induk') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakInduk_('siswa', id); }
  else if (kunci === 'pegawai' && aksi === 'induk') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakInduk_('pegawai', id); }
  else if (kunci === 'siswa' && aksi === 'keterangan') { wajibIzin_(u, kunci, 'cetak'); hasil = cetakKeterangan_(id, param); }
  else throw new Error('Aksi tidak dikenal.');
  catat_(u, kunci, aksi, aksi === 'terbitkan' ? (hasil && hasil.nomor_surat) : '', (Date.now() - t0) / 1000, 1);
  return hasil;
}

function cariBaris_(kunci, id) {
  var r = daftarModul_(kunci).filter(function (x) { return x.id === String(id); })[0];
  if (!r) throw new Error('Data tidak ditemukan.');
  return r;
}

var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Nomor surat dari format sekolah, mis. {kode}/{urut}/{unit}/{tahun} -> 421/007/TU/2026
function formatNomor_(format, n) {
  return String(format || FORMAT_NOMOR_AWAL).replace(/\{(\w+)\}/g, function (m, t) {
    if (t === 'urut') return angka3_(n.urut);
    if (t === 'no') return String(n.urut);
    if (t === 'bulan') return ROMAWI[n.bulan - 1] || '';
    return n[t] !== undefined ? String(n[t]) : m;
  });
}

function cekFormatNomor_(f) {
  f = String(f || '').trim();
  if (!f) return '';
  if (f.length > 80) throw new Error('Format nomor surat terlalu panjang.');
  if (!/\{(urut|no)\}/.test(f)) throw new Error('Format nomor surat harus memuat {urut} atau {no}.');
  var asing = (f.match(/\{(\w+)\}/g) || []).map(function (x) { return x.slice(1, -1); }).filter(function (t) { return TOKEN_NOMOR.indexOf(t) < 0; });
  if (asing.length) throw new Error('Penanda tidak dikenal di format nomor: {' + asing.join('}, {') + '}.');
  return f;
}

function terbitkanSurat_(id, user) {
  var m = MODUL.surat_keluar;
  var p = pengaturan_();
  var kodeUnit = p.kode_unit_kerja || 'TU';
  var format = p.format_nomor || FORMAT_NOMOR_AWAL;
  var opsiKode = kodeValid_();
  var jenisMaster = daftarModul_('jenis_surat');
  var hasilTulis = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var b = t.baris.filter(function (x) { return String(x.id) === String(id) && !dihapus_(x); })[0];
    if (!b) throw new Error('Surat tidak ditemukan.');
    if (String(b.nomor_surat).trim() !== '') throw new Error('Surat ini sudah bernomor.');
    var kode = String(b.kode_klasifikasi || '').trim();
    if (!kode) throw new Error('Isi kode klasifikasi dulu sebelum menerbitkan.');
    if (opsiKode && opsiKode.indexOf(kode) < 0) throw new Error('Kode klasifikasi "' + kode + '" tidak ada di daftar.');
    if (!isTanggal_(b.tanggal_surat)) throw new Error('Isi tanggal surat dulu sebelum menerbitkan.');
    var th = Number(Utilities.formatDate(b.tanggal_surat, tz_(), 'yyyy'));
    var bulan = Number(Utilities.formatDate(b.tanggal_surat, tz_(), 'M'));
    var jenis = jenisMaster.filter(function (j) { return j.nama === b.jenis_surat; })[0];
    if (format.indexOf('{jenis}') >= 0 && !jenis) throw new Error('Pilih jenis surat dulu; format nomor sekolah memakai singkatan jenis surat.');
    var mx = 0;
    t.baris.forEach(function (x) {   // termasuk surat Dibatalkan dan yang dihapus: nomor tidak dipakai ulang
      if (Number(x.tahun) === th && Number(x.nomor_urut) > mx) mx = Number(x.nomor_urut);
    });
    var no = mx + 1;
    var obj = {
      nomor_urut: no, tahun: th,
      nomor_surat: formatNomor_(format, { kode: kode, urut: no, jenis: jenis ? jenis.singkatan : '', unit: kodeUnit, bulan: bulan, tahun: th }),
      status: 'Terbit', diubah_oleh: user.username, diubah_pada: new Date()
    };
    var dasar = t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0];
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, obj, dasar)]);
    var h = {};
    Object.keys(b).forEach(function (k) { h[k] = b[k]; });
    Object.keys(obj).forEach(function (k) { h[k] = obj[k]; });
    return barisKeKlien_(m, h);
  });
  hapusCacheModul_('surat_keluar');
  return hasilTulis;
}

function batalkanSurat_(id, user) {
  var m = MODUL.surat_keluar;
  var hasilTulis = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var b = t.baris.filter(function (x) { return String(x.id) === String(id) && !dihapus_(x); })[0];
    if (!b) throw new Error('Surat tidak ditemukan.');
    if (b.status !== 'Terbit') throw new Error('Hanya surat berstatus Terbit yang bisa dibatalkan. Draft cukup dihapus.');
    var obj = { status: 'Dibatalkan', diubah_oleh: user.username, diubah_pada: new Date() };
    var dasar = t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0];
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, obj, dasar)]);
    var h = {};
    Object.keys(b).forEach(function (k) { h[k] = b[k]; });
    Object.keys(obj).forEach(function (k) { h[k] = obj[k]; });
    return barisKeKlien_(m, h);
  });
  hapusCacheModul_('surat_keluar');
  return hasilTulis;
}

function catatPdf_(kunci, id, url) {
  dalamLock_(function () {
    var m = MODUL[kunci];
    var t = bacaTabel_(m.tab);
    var b = t.baris.filter(function (x) { return String(x.id) === String(id); })[0];
    if (b && t.peta.link_pdf) t.sheet.getRange(b._r, t.peta.link_pdf).setValue(url);
  });
  hapusCacheModul_(kunci);
}

/* ---------- beranda ---------- */

function apiBeranda(token) { return dataBeranda_(sesi_(token)); }

function dataBeranda_(u) {
  var izin = izinPengguna_(u);
  var hasil = { hariIni: hariIni_() };
  var bulan = hariIni_().slice(0, 7), tahun = hariIni_().slice(0, 4);
  if (izin.siswa.lihat) {
    var s = daftarModul_('siswa').filter(function (r) { return r.status === 'Aktif'; });
    var per = {};
    s.forEach(function (r) { var k = r.tingkat || 'Belum diisi'; per[k] = (per[k] || 0) + 1; });
    hasil.siswa = { aktif: s.length, perTingkat: per };
  }
  if (izin.pegawai.lihat) {
    var p = daftarModul_('pegawai').filter(function (r) { return r.status === 'Aktif'; });
    var pk = {};
    p.forEach(function (r) { var k = r.kategori || 'Belum diisi'; pk[k] = (pk[k] || 0) + 1; });
    hasil.pegawai = { aktif: p.length, perKategori: pk };
  }
  if (izin.ruang.lihat) hasil.ruang = { jumlah: daftarModul_('ruang').length };
  if (izin.aset.lihat) {
    var as = daftarModul_('aset');
    var tt = { jenis: as.length, baik: 0, rr: 0, rb: 0 };
    as.forEach(function (r) { tt.baik += Number(r.jml_baik) || 0; tt.rr += Number(r.jml_rusak_ringan) || 0; tt.rb += Number(r.jml_rusak_berat) || 0; });
    tt.unit = tt.baik + tt.rr + tt.rb;
    hasil.aset = tt;
  }
  if (izin.surat_masuk.lihat) {
    var sm = daftarModul_('surat_masuk');
    hasil.suratMasuk = {
      bulanIni: sm.filter(function (r) { return r.tanggal_terima.slice(0, 7) === bulan; }).length,
      belumSelesai: sm.filter(function (r) { return r.status !== 'Selesai'; }).length,
      segera: sm.filter(function (r) { return r.status !== 'Selesai' && r.sifat === 'Segera'; }).length,
      antrian: sm.filter(function (r) { return r.status !== 'Selesai'; })
        .sort(function (a, b) { return a.tanggal_terima < b.tanggal_terima ? -1 : 1; }).slice(0, 8)
    };
  }
  if (izin.surat_keluar.lihat) {
    var sk = daftarModul_('surat_keluar');
    hasil.suratKeluar = {
      tahunIni: sk.filter(function (r) { return r.tahun === tahun && r.status === 'Terbit'; }).length,
      draft: sk.filter(function (r) { return r.status === 'Draft'; })
        .sort(function (a, b) { return a.tanggal_surat < b.tanggal_surat ? 1 : -1; }).slice(0, 8)
    };
  }
  try { hasil.aktivitas = aktivitasTerbaru_(u, 6); } catch (e) { hasil.aktivitas = []; }   // lini waktu tidak boleh menggagalkan Beranda
  return hasil;
}

/* ---------- pemeliharaan (Admin) ---------- */

function apiSiapkanUlang(token) {
  wajibAdmin_(sesi_(token));
  dalamLock_(function () { siapkanSemua_(); });
  ['pengguna_v1', 'peran_v1', 'jenjang_v1'].forEach(cacheHapus_);
  hapusSemuaCacheModul_();
  return true;
}

function apiRapikanFolder(token) {
  wajibAdmin_(sesi_(token));
  return rapikanFolder_();
}

/* ---------- akun sendiri ---------- */

function apiUbahSandiSaya(token, lama, baru) {
  var u = sesi_(token);
  cekSandi_(baru);
  if (hashSandi_(String(lama || ''), u.salt) !== u.hash) throw new Error('Kata sandi lama salah.');
  tulisPengguna_(function (t) {
    var b = t.baris.filter(function (x) { return String(x.id) === u.id; })[0];
    var g = acak_();
    var dasar = t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0];
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, { salt: g, hash: hashSandi_(baru, g) }, dasar)]);
  });
  return true;
}

/* ---------- pengaturan sekolah (admin) ---------- */

function apiPengaturanAmbil(token) {
  wajibAdmin_(sesi_(token));
  var p = pengaturan_();
  var o = {};
  PENGATURAN_BOLEH.forEach(function (k) { o[k] = p[k]; });
  o.logo = logoUri_(p.logo_drive_file_id);
  o.logoKanan = logoUri_(p.logo_kanan_drive_file_id);
  o.format_nomor = p.format_nomor || FORMAT_NOMOR_AWAL;
  o.kopAda = !!p.kop_drive_file_id;
  o.jenjangOpsi = Object.keys(JENJANG).map(function (k) { return { v: k, l: JENJANG[k].label }; });
  o.folderUrl = p.folder_akar_id ? 'https://drive.google.com/drive/folders/' + p.folder_akar_id : '';
  o.templateSiap = !!(p.template_surat_keluar_id && p.template_induk_siswa_id && p.template_induk_pegawai_id && p.template_surat_keterangan_id);
  return o;
}

function apiPengaturanSimpan(token, d) {
  wajibAdmin_(sesi_(token));
  if (!String(d.nama_sekolah || '').trim()) throw new Error('Nama sekolah wajib diisi.');
  if (!JENJANG[d.jenjang]) throw new Error('Pilih jenjang sekolah.');
  d.format_nomor = cekFormatNomor_(d.format_nomor) || FORMAT_NOMOR_AWAL;
  dalamLock_(function () {
    PENGATURAN_BOLEH.forEach(function (k) { simpanPengaturan_(k, String(d[k] === undefined ? '' : d[k]).trim()); });
    cacheHapus_('jenjang_v1');
  });
  return true;
}

function apiLogo(token, mime, b64, posisi) {
  wajibAdmin_(sesi_(token));
  if (['image/png', 'image/jpeg'].indexOf(mime) < 0) throw new Error('Logo harus berformat PNG atau JPG.');
  if (!b64 || b64.length > 1500000) throw new Error('Ukuran logo terlalu besar (maksimal sekitar 1 MB).');
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, 'logo-sekolah' + (mime === 'image/png' ? '.png' : '.jpg'));
  var f = subFolder_('Logo dan Kop').createFile(blob);
  simpanPengaturan_(posisi === 'kanan' ? 'logo_kanan_drive_file_id' : 'logo_drive_file_id', f.getId());
  return logoUri_(f.getId());
}

// Kop surat berupa gambar penuh (opsional). Bila ada, menggantikan kop teks + logo pada semua dokumen cetak.
function apiKop(token, mime, b64) {
  wajibAdmin_(sesi_(token));
  if (['image/png', 'image/jpeg'].indexOf(mime) < 0) throw new Error('Kop harus berformat PNG atau JPG.');
  if (!b64 || b64.length > 2800000) throw new Error('Ukuran kop terlalu besar (maksimal sekitar 2 MB).');
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, 'kop-surat' + (mime === 'image/png' ? '.png' : '.jpg'));
  var f = subFolder_('Logo dan Kop').createFile(blob);
  simpanPengaturan_('kop_drive_file_id', f.getId());
  return true;
}

function apiKopAmbil(token) {
  wajibAdmin_(sesi_(token));
  var id = pengaturan_().kop_drive_file_id;
  if (!id) return '';
  try { var b = DriveApp.getFileById(id).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); }
  catch (e) { return ''; }
}

function apiKopHapus(token) {
  wajibAdmin_(sesi_(token));
  simpanPengaturan_('kop_drive_file_id', '');
  return true;
}

// Tambahkan daftar awal (kode klasifikasi / jenis surat) yang belum ada. Data sekolah yang sudah ada tidak ditimpa,
// kecuali baris contoh lama bernama "(contoh...)".
function apiMuatStandar(token, kunci) {
  var u = sesi_(token); wajibAdmin_(u);
  var m = modul_(kunci), daftar, kolomUnik, keObj;
  if (kunci === 'kode_klasifikasi') {
    daftar = KODE_STANDAR; kolomUnik = 'kode';
    keObj = function (r) { return { kode: r[0], nama: r[1], kategori: r[2], keterangan: r[3], status: 'Aktif' }; };
  } else if (kunci === 'jenis_surat') {
    daftar = JENIS_STANDAR; kolomUnik = 'singkatan';
    keObj = function (r) { return { singkatan: r[0], nama: r[1], layout: r[2], keterangan: r[3], status: 'Aktif' }; };
  } else throw new Error('Daftar awal hanya tersedia untuk kode klasifikasi dan jenis surat.');
  var hasil = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var ada = {};
    t.baris.forEach(function (b) { if (!dihapus_(b)) ada[String(b[kolomUnik]).trim().toLowerCase()] = b; });
    var tulis = [], diperbarui = 0;
    daftar.forEach(function (r) {
      var o = keObj(r), lama = ada[String(o[kolomUnik]).toLowerCase()];
      if (lama) {
        if (/\(contoh/i.test(String(lama.nama))) {
          var dasar = t.sheet.getRange(lama._r, 1, 1, t.lebar).getValues()[0];
          t.sheet.getRange(lama._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, o, dasar)]);
          diperbarui++;
        }
        return;
      }
      tulis.push(arrayBaris_(t.peta, t.lebar, siapkanBaru_(m, o, u)));
    });
    if (tulis.length) t.sheet.getRange(t.sheet.getLastRow() + 1, 1, tulis.length, t.lebar).setValues(tulis);
    return { ditambah: tulis.length, diperbarui: diperbarui, dilewati: daftar.length - tulis.length - diperbarui };
  });
  hapusCacheModul_(kunci);
  catat_(u, kunci, 'muat_standar', '', null, hasil.ditambah);
  return hasil;
}


function logoUri_(id) {
  if (!id) return '';
  try {
    return cacheAmbil_('logo_' + id, 21600, function () {
      var b = DriveApp.getFileById(id).getBlob();
      var bytes = b.getBytes();
      if (bytes.length > 90000) return '';   // batas ukuran cache; logo disarankan kecil
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(bytes);
    });
  } catch (e) { return ''; }
}
