/** LAPISAN DATA: Google Sheets sebagai basis data. Semua tulis lewat lock. */

/* ---------- akses spreadsheet & util ---------- */

// Disimpan per eksekusi: tiap panggilan ke layanan Google itu lambat, jadi spreadsheet, zona waktu, dan tab
// cukup diambil sekali per permintaan.
var _ss = null, _tz = null, _tab = {};

function ss_() {
  if (_ss) return _ss;
  var props = PropertiesService.getScriptProperties();
  try {
    var a = SpreadsheetApp.getActive();
    if (a) { if (props.getProperty('SS_ID') !== a.getId()) props.setProperty('SS_ID', a.getId()); _ss = a; return a; }
  } catch (e) { /* tidak terikat: pakai ID tersimpan */ }
  var id = props.getProperty('SS_ID');
  if (!id) throw new Error('Skrip harus dibuat dari Extensions > Apps Script di dalam Google Sheet.');
  _ss = SpreadsheetApp.openById(id);
  return _ss;
}

function tz_() { return _tz || (_tz = ss_().getSpreadsheetTimeZone()); }

function isTanggal_(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

function isoTanggal_(d) { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }
function isoWaktu_(d) { return Utilities.formatDate(d, tz_(), "yyyy-MM-dd'T'HH:mm"); }
function hariIni_() { return isoTanggal_(new Date()); }

// format tanggal panjang Indonesia, mis. 04 Januari 2024
function tglIndo_(d) {
  var x = Utilities.formatDate(d, tz_(), 'dd|M|yyyy').split('|');
  return x[0] + ' ' + BULAN[Number(x[1]) - 1] + ' ' + x[2];
}

function angka3_(n) { var s = String(n); while (s.length < 3) s = '0' + s; return s; }

function cacheAmbil_(kunci, ttl, fn) {
  var c = CacheService.getScriptCache();
  var v = c.get(kunci);
  if (v) { try { return JSON.parse(v); } catch (e) { /* baca ulang */ } }
  var hasil = fn();
  try { c.put(kunci, JSON.stringify(hasil), ttl); } catch (e) { /* terlalu besar */ }
  return hasil;
}

function cacheHapus_(kunci) { CacheService.getScriptCache().remove(kunci); }

// Tab baru hanya punya 1.000 baris. Menulis di luar batas itu ditolak Sheets, dan baris tambahan tidak membawa
// format teks "@" (NISN 0012... jadi angka, isi "=..." dieksekusi). Tambah baris sekaligus dan salin format baris 2.
function sediakanBaris_(t, r, n) {
  var sh = t.sheet, maks = sh.getMaxRows();
  if (r + n - 1 <= maks) return;
  var tambah = Math.max(r + n - 1 - maks, 500);
  sh.insertRowsAfter(maks, tambah);
  sh.getRange(2, 1, 1, t.lebar).copyTo(sh.getRange(maks + 1, 1, tambah, t.lebar), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}

function dalamLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- tabel generik (dipakai Pengguna, Peran, dan modul data) ---------- */

function bukaTab_(nama) {
  if (_tab[nama]) return _tab[nama];
  var s = ss_().getSheetByName(nama);
  if (!s) throw new Error('Tab "' + nama + '" belum ada. Jalankan menu Tata Usaha > Siapkan / Perbaiki Sheet.');
  _tab[nama] = s;
  return s;
}

function petaKolom_(sheet) {
  var lebar = Math.max(1, sheet.getLastColumn());
  var h = sheet.getRange(1, 1, 1, lebar).getValues()[0];
  var peta = {};
  h.forEach(function (n, i) { if (n !== '') peta[String(n).trim()] = i + 1; });
  return peta;
}

// hasil: {sheet, peta, lebar, baris:[{_r, kolom:nilai mentah}]}
function bacaTabel_(nama) {
  var s = bukaTab_(nama);
  var peta = petaKolom_(s);
  var lebar = s.getLastColumn();
  var last = s.getLastRow();
  var baris = [];
  if (last >= 2) {
    var v = s.getRange(2, 1, last - 1, lebar).getValues();
    var kunci = Object.keys(peta);
    for (var i = 0; i < v.length; i++) {
      var o = { _r: i + 2 };
      for (var j = 0; j < kunci.length; j++) o[kunci[j]] = v[i][peta[kunci[j]] - 1];
      baris.push(o);
    }
  }
  return { sheet: s, peta: peta, lebar: lebar, baris: baris };
}

function arrayBaris_(peta, lebar, obj, dasar) {
  var arr = dasar ? dasar.slice() : [];
  while (arr.length < lebar) arr.push('');
  Object.keys(obj).forEach(function (k) { if (peta[k]) arr[peta[k] - 1] = obj[k]; });
  return arr;
}

// Kolom teks diformat "@" (teks biasa) oleh siapkanSemua_, jadi isi seperti "=1+1" atau "+62..." tidak dieksekusi Sheets.
function amanSel_(v) { return v; }

/* ---------- modul data ---------- */

function modul_(kunci) {
  var m = MODUL[kunci];
  if (!m) throw new Error('Modul tidak dikenal.');
  if (kunci !== 'siswa') return m;
  var salinan = {};
  Object.keys(m).forEach(function (k) { salinan[k] = m[k]; });
  var opsi = tingkatOpsi_();
  salinan.field = m.field.map(function (f) {
    if (f.k !== 'tingkat') return f;
    var g = {};
    Object.keys(f).forEach(function (k) { g[k] = f[k]; });
    g.opsi = opsi;
    return g;
  });
  return salinan;
}

function jenjangAktif_() { return cacheAmbil_('jenjang_v1', 300, function () { return pengaturan_().jenjang || ''; }); }
function tingkatOpsi_() { var j = JENJANG[jenjangAktif_()]; return j ? j.tingkat : TINGKAT_SEMUA; }

function nilaiKlien_(f, v) {
  if (v === null || v === undefined) return '';
  if (isTanggal_(v)) return f && f.t === 'tanggal' ? isoTanggal_(v) : isoWaktu_(v);
  return String(v);
}

function barisKeKlien_(m, b) {
  var o = { id: String(b.id) };
  m.field.forEach(function (f) { o[f.k] = nilaiKlien_(f, b[f.k]); });
  o.dibuat_oleh = nilaiKlien_(null, b.dibuat_oleh);
  o.dibuat_pada = nilaiKlien_(null, b.dibuat_pada);
  o.diubah_oleh = nilaiKlien_(null, b.diubah_oleh);
  o.diubah_pada = nilaiKlien_(null, b.diubah_pada);
  return o;
}

function dihapus_(b) { return b.dihapus === true || String(b.dihapus).toUpperCase() === 'TRUE'; }

/* ---------- cache data modul ----------
   Membaca seluruh tab untuk tiap permintaan itu yang paling mahal. Hasil baca disimpan di CacheService (dipecah
   per 60 ribu karakter karena batas 100 KB per kunci) dengan nomor versi: setiap penulisan menaikkan versi,
   jadi data lama tidak pernah dipakai lagi walau dua permintaan berjalan bersamaan. */
var _memoModul = {};
var CACHE_MODUL_DETIK = 900;

function versiModul_(kunci) { return CacheService.getScriptCache().get('ver_' + kunci) || '0'; }

function simpanCacheBesar_(kunci, obj, ttl) {
  try {
    var s = JSON.stringify(obj), uk = 60000, n = Math.ceil(s.length / uk) || 1;
    if (n > 40) return;   // terlalu besar untuk cache; baca langsung dari Sheet
    var m = {};
    for (var i = 0; i < n; i++) m[kunci + '_' + i] = s.substr(i * uk, uk);
    m[kunci + '_n'] = String(n);
    CacheService.getScriptCache().putAll(m, ttl);
  } catch (e) { /* cache penuh: abaikan */ }
}

function ambilCacheBesar_(kunci) {
  try {
    var c = CacheService.getScriptCache();
    var n = Number(c.get(kunci + '_n') || 0);
    if (!n) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(kunci + '_' + i);
    var got = c.getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] === undefined || got[keys[j]] === null) return null; s += got[keys[j]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}

function hapusCacheModul_(kunci) {
  delete _memoModul[kunci];
  // tambahan acak: dua penulisan di milidetik yang sama tetap mendapat versi berbeda (cache lama tidak terpakai)
  CacheService.getScriptCache().put('ver_' + kunci, Date.now() + '_' + Utilities.getUuid().slice(0, 8), 21600);
}

function hapusSemuaCacheModul_() { URUTAN_MODUL.forEach(hapusCacheModul_); }

function daftarModul_(kunci, paksa) {
  if (!paksa && _memoModul[kunci]) return _memoModul[kunci];
  var kunciCache = 'modul_' + kunci + '_' + versiModul_(kunci);
  var rows = paksa ? null : ambilCacheBesar_(kunciCache);
  if (!rows) {
    var m = modul_(kunci);
    var t = bacaTabel_(m.tab);
    rows = t.baris.filter(function (b) { return !dihapus_(b) && b.id; }).map(function (b) { return barisKeKlien_(m, b); });
    simpanCacheBesar_(kunciCache, rows, CACHE_MODUL_DETIK);
  }
  _memoModul[kunci] = rows;
  return rows;
}

function nilaiTulis_(f, v) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (f.t === 'tanggal') return s === '' ? '' : Utilities.parseDate(s, tz_(), 'yyyy-MM-dd');
  if (f.t === 'angka') return s === '' ? '' : Number(s);
  return amanSel_(s);
}

// opsiSumber: {modulSumber: [nilai sah]} untuk field pilihan yang diambil dari master (kode, jenis surat, ruangan).
// lama: baris sebelum diubah; field yang terkunci (kunciJika) tidak divalidasi ulang agar surat lama tetap bisa diubah.
function validasiData_(m, data, semuaBaris, idSendiri, opsiSumber, lama) {
  var galat = [];
  m.field.forEach(function (f) {
    if (f.auto) return;
    if (lama && f.kunciJika && String(lama[f.kunciJika] || '').trim() !== '') return;
    var v = data[f.k] === undefined || data[f.k] === null ? '' : String(data[f.k]).trim();
    if (v.length > 4000) galat.push(f.l + ' terlalu panjang.');
    if (f.wajib && v === '') { galat.push(f.l + ' wajib diisi.'); return; }
    if (v === '') return;
    if (f.t === 'tanggal') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v).getTime())) galat.push(f.l + ' bukan tanggal yang valid.');
    } else if (f.t === 'angka') {
      if (!/^\d+$/.test(v)) galat.push(f.l + ' harus berupa angka bulat 0 atau lebih.');
      else if (f.k === 'tahun_perolehan' && (Number(v) < 1950 || Number(v) > new Date().getFullYear() + 1)) galat.push('Tahun perolehan tidak wajar.');
    } else if (f.t === 'pilih' && f.opsi && f.opsi.indexOf(v) < 0) {
      galat.push(f.l + ': pilihan "' + v + '" tidak tersedia.');
    } else if (f.t === 'pilih' && f.opsiDari && opsiSumber && opsiSumber[f.opsiDari] && opsiSumber[f.opsiDari].indexOf(v) < 0) {
      galat.push(f.l + ': "' + v + '" tidak ada di daftar ' + MODUL[f.opsiDari].judul + '.');
    } else if (f.t === 'url' && !/^https?:\/\//i.test(v)) {
      galat.push(f.l + ' harus diawali http:// atau https://.');
    }
  });
  (m.unik || []).forEach(function (k) {
    var v = data[k] === undefined || data[k] === null ? '' : String(data[k]).trim();
    if (!v) return;
    var dup = semuaBaris.filter(function (b) {
      return !dihapus_(b) && String(b.id) !== String(idSendiri || '') && String(b[k]).trim().toLowerCase() === v.toLowerCase();
    })[0];
    if (dup) galat.push(fieldModul_(m, k).l + ' "' + v + '" sudah dipakai data lain.');
  });
  return galat;
}

function ruangValid_() {
  try { return daftarModul_('ruang').map(function (r) { return r.nama_ruang; }); } catch (e) { return null; }
}

function jumlahAset_(d) {
  return ['jml_baik', 'jml_rusak_ringan', 'jml_rusak_berat'].reduce(function (a, k) { return a + (Number(d[k]) || 0); }, 0);
}

function gantiNamaRuang_(lama, baru) {
  var t = bacaTabel_(MODUL.aset.tab);
  t.baris.forEach(function (b) { if (String(b.ruang) === String(lama)) t.sheet.getRange(b._r, t.peta.ruang).setValue(baru); });
}

function sumberOpsi_(m) {
  var out = {};
  m.field.forEach(function (f) {
    if (!f.opsiDari || out[f.opsiDari]) return;
    try { out[f.opsiDari] = daftarModul_(f.opsiDari).map(function (r) { return String(r[f.opsiKunci || 'kode'] || ''); }).filter(Boolean); }
    catch (e) { /* tab belum ada: lewati pemeriksaan */ }
  });
  return out;
}

function kodeValid_() {
  try { return daftarModul_('kode_klasifikasi').map(function (r) { return r.kode; }); } catch (e) { return null; }
}

function siapkanBaru_(m, data, user, semua, konteks) {
  var baru = { id: Utilities.getUuid().replace(/-/g, '').slice(0, 12) };
  var sekarang = new Date();
  m.field.forEach(function (f) {
    var v = data[f.k];
    if (f.auto) v = '';
    if ((v === undefined || v === '') && f.awal) v = f.awal === 'hariini' ? hariIni_() : f.awal;
    baru[f.k] = nilaiTulis_(f, v);
  });
  baru.dibuat_oleh = user.username; baru.dibuat_pada = sekarang;
  baru.diubah_oleh = user.username; baru.diubah_pada = sekarang;
  baru.dihapus = false;
  return baru;
}

// dipanggil di dalam lock
function isiOtomatis_(kunci, m, baru, semua, konteks) {
  if (kunci === 'surat_masuk') {
    var tgl = baru.tanggal_terima;
    var th = isTanggal_(tgl) ? Number(Utilities.formatDate(tgl, tz_(), 'yyyy')) : new Date().getFullYear();
    baru.no_agenda = angka3_(nomorBerikut_('agenda_' + th, maksBerdasar_(semua, 'no_agenda', function (v) {
      var mm = /^(\d+)\/(\d{4})$/.exec(String(v).trim());
      return mm && Number(mm[2]) === th ? Number(mm[1]) : 0;
    }))) + '/' + th;
  } else if (kunci === 'siswa') {
    if (!baru.no_induk) {
      baru.no_induk = String(nomorBerikut_('counter_no_induk', maksBerdasar_(semua, 'no_induk', function (v) { return parseInt(v, 10) || 0; })));
    } else {
      naikkanCounter_('counter_no_induk', parseInt(baru.no_induk, 10) || 0);
    }
  } else if (kunci === 'surat_keluar') {
    baru.status = 'Draft';
  } else if (kunci === 'aset') {
    baru.jumlah = jumlahAset_(baru);
  }
}

function maksBerdasar_(semua, kolom, ekstrak) {
  var mx = 0;
  semua.forEach(function (b) { var n = ekstrak(b[kolom]); if (n > mx) mx = n; });   // termasuk baris yang dihapus
  return mx;
}

function nomorBerikut_(kunciCounter, maksAda) {
  var props = PropertiesService.getScriptProperties();
  var no = Math.max(Number(props.getProperty(kunciCounter) || 0), maksAda) + 1;   // tidak pernah dipakai ulang
  props.setProperty(kunciCounter, String(no));
  return no;
}

function naikkanCounter_(kunciCounter, n) {
  var props = PropertiesService.getScriptProperties();
  if (n > Number(props.getProperty(kunciCounter) || 0)) props.setProperty(kunciCounter, String(n));
}

function simpanModul_(kunci, data, user) {
  var m = modul_(kunci);
  var opsiSumber = sumberOpsi_(m);
  var hasilTulis = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var id = data.id ? String(data.id) : '';
    var lama = id ? t.baris.filter(function (b) { return String(b.id) === id && !dihapus_(b); })[0] : null;
    if (id && !lama) throw new Error('Data tidak ditemukan atau sudah dihapus oleh pengguna lain. Muat ulang daftar.');

    var gabung = {};
    if (lama) {
      m.field.forEach(function (f) { gabung[f.k] = nilaiKlien_(f, lama[f.k]); });
      Object.keys(data).forEach(function (k) {
        var f = fieldModul_(m, k);
        if (!f || f.auto) return;
        if (f.kunciJika && String(lama[f.kunciJika]).trim() !== '') return;
        gabung[k] = data[k];
      });
      if (kunci === 'siswa' && gabung.status && gabung.status !== 'Aktif' && !gabung.tanggal_keluar) gabung.tanggal_keluar = hariIni_();
      if (kunci === 'siswa' && gabung.status === 'Aktif') { /* tanggal keluar dibiarkan sesuai isian */ }
    } else {
      m.field.forEach(function (f) { gabung[f.k] = data[f.k]; });
    }

    var galat = validasiData_(m, gabung, t.baris, id, opsiSumber, lama);
    if (galat.length) throw new Error(galat.join(' '));

    var sekarang = new Date();
    if (lama) {
      var ubah = { diubah_oleh: user.username, diubah_pada: sekarang };
      m.field.forEach(function (f) {
        if (f.auto) return;
        if (f.kunciJika && String(lama[f.kunciJika]).trim() !== '') return;
        ubah[f.k] = nilaiTulis_(f, gabung[f.k]);
      });
      if (kunci === 'aset') ubah.jumlah = jumlahAset_(ubah);
      var dasar = t.sheet.getRange(lama._r, 1, 1, t.lebar).getValues()[0];
      t.sheet.getRange(lama._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, ubah, dasar)]);
      if (kunci === 'ruang' && String(lama.nama_ruang) !== String(ubah.nama_ruang)) gantiNamaRuang_(lama.nama_ruang, ubah.nama_ruang);
      var hasil = {};
      m.field.forEach(function (f) { hasil[f.k] = f.auto || (f.kunciJika && String(lama[f.kunciJika]).trim() !== '') ? lama[f.k] : ubah[f.k]; });
      if (kunci === 'aset') hasil.jumlah = ubah.jumlah;
      hasil.id = id; hasil.dibuat_oleh = lama.dibuat_oleh; hasil.dibuat_pada = lama.dibuat_pada;
      hasil.diubah_oleh = user.username; hasil.diubah_pada = sekarang;
      return barisKeKlien_(m, hasil);
    }
    var baru = siapkanBaru_(m, gabung, user);
    isiOtomatis_(kunci, m, baru, t.baris);
    var r = t.sheet.getLastRow() + 1;
    sediakanBaris_(t, r, 1);
    t.sheet.getRange(r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, baru)]);
    return barisKeKlien_(m, baru);
  });
  hapusCacheModul_(kunci);
  if (kunci === 'ruang') hapusCacheModul_('aset');   // nama ruangan ikut berubah di data barang
  return hasilTulis;
}

function hapusModul_(kunci, id, user) {
  var m = modul_(kunci);
  var hasilTulis = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var b = t.baris.filter(function (x) { return String(x.id) === String(id) && !dihapus_(x); })[0];
    if (!b) throw new Error('Data tidak ditemukan.');
    if (kunci === 'ruang') {
      var pakai = bacaTabel_(MODUL.aset.tab).baris.filter(function (x) { return !dihapus_(x) && String(x.ruang) === String(b.nama_ruang); }).length;
      if (pakai) throw new Error('Ruangan ini masih berisi ' + pakai + ' jenis barang. Pindahkan atau hapus barangnya dulu.');
    }
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar,
      { dihapus: true, diubah_oleh: user.username, diubah_pada: new Date() },
      t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0])]);
    return true;
  });
  hapusCacheModul_(kunci);
  return hasilTulis;
}

// impor massal: baris = [{kunci: nilai}], mengembalikan {ok, gagal:[{baris,alasan}]}
function imporModul_(kunci, baris, user) {
  var m = modul_(kunci);
  if (!m.impor) throw new Error('Modul ini tidak mendukung impor.');
  var opsiSumber = sumberOpsi_(m);
  var hasilTulis = dalamLock_(function () {
    var t = bacaTabel_(m.tab);
    var semua = t.baris.slice();
    var tulis = [], nomorTulis = [], gagal = [];
    baris.forEach(function (raw, i) {
      var nomor = raw._baris || (i + 2);
      var data = {};
      m.field.forEach(function (f) {
        var v = raw[f.k];
        if (v === undefined || v === null) v = '';
        data[f.k] = String(v).trim();
        if (f.t === 'pilih' && f.opsi && data[f.k]) {
          var cocok = f.opsi.filter(function (o) { return o.toLowerCase() === data[f.k].toLowerCase(); })[0];
          if (cocok) data[f.k] = cocok;
        }
      });
      m.field.forEach(function (f) {   // samakan huruf besar/kecil dengan isi master (mis. nama ruangan)
        var daftar = f.opsiDari && opsiSumber[f.opsiDari];
        if (!daftar || !data[f.k]) return;
        var cocok = daftar.filter(function (o) { return o.toLowerCase() === data[f.k].toLowerCase(); })[0];
        if (cocok) data[f.k] = cocok;
      });
      if (kunci === 'siswa' && !data.status) data.status = 'Aktif';
      if (kunci === 'pegawai' && !data.status) data.status = 'Aktif';
      var galat = validasiData_(m, data, semua, '', opsiSumber);
      if (galat.length) { gagal.push({ baris: nomor, alasan: galat.join(' ') }); return; }
      var baru = siapkanBaru_(m, data, user);
      if (kunci === 'siswa') baru.no_induk = amanSel_(data.no_induk || '');   // nomor lama boleh dibawa
      isiOtomatis_(kunci, m, baru, semua);
      semua.push(baru);
      tulis.push(arrayBaris_(t.peta, t.lebar, baru));
      nomorTulis.push(nomor);
    });
    var berhasil = 0;
    if (tulis.length) {
      var awalBaris = t.sheet.getLastRow() + 1;
      sediakanBaris_(t, awalBaris, tulis.length);
      try {
        t.sheet.getRange(awalBaris, 1, tulis.length, t.lebar).setValues(tulis);
        berhasil = tulis.length;
      } catch (e) {
        // satu nilai ditolak Sheets: tulis satu per satu agar hanya baris bermasalah yang dilewati dan dilaporkan
        for (var j = 0; j < tulis.length; j++) {
          try { t.sheet.getRange(awalBaris + berhasil, 1, 1, t.lebar).setValues([tulis[j]]); berhasil++; }
          catch (e2) { gagal.push({ baris: nomorTulis[j], alasan: String(e2.message || e2).replace(/^Exception:\s*/, '').slice(0, 200) }); }
        }
      }
    }
    return { ok: berhasil, gagal: gagal };
  });
  hapusCacheModul_(kunci);
  return hasilTulis;
}
