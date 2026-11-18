/** AKUN, PERAN, DAN SESI. Login memakai akun aplikasi (bukan email Google), dikelola admin. */

var HASH_ULANG = 600;
var SESI_DETIK = 6 * 3600;
var MAKS_GAGAL = 5;

function acak_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }

function hashSandi_(sandi, garam) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, garam + ':' + sandi, Utilities.Charset.UTF_8);
  for (var i = 0; i < HASH_ULANG; i++) d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d);
  return Utilities.base64Encode(d);
}

function cekSandi_(sandi) {
  if (String(sandi).length < 8) throw new Error('Kata sandi minimal 8 karakter.');
}

function cekUsername_(u) {
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new Error('Nama pengguna 3 sampai 30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
}

/* ---------- pengguna ---------- */

function daftarPengguna_() {
  return cacheAmbil_('pengguna_v1', 300, function () {
    return bacaTabel_('Pengguna').baris.filter(function (b) { return b.id; }).map(function (b) {
      return {
        id: String(b.id), username: String(b.username), nama: String(b.nama), peran: String(b.peran),
        hash: String(b.hash), salt: String(b.salt), aktif: b.aktif === true || String(b.aktif).toUpperCase() === 'TRUE',
        login_terakhir: isTanggal_(b.login_terakhir) ? isoWaktu_(b.login_terakhir) : String(b.login_terakhir || '')
      };
    });
  });
}

function penggunaPublik_(u) {
  return { id: u.id, username: u.username, nama: u.nama, peran: u.peran, aktif: u.aktif, login_terakhir: u.login_terakhir };
}

function tulisPengguna_(fn) {
  return dalamLock_(function () {
    var t = bacaTabel_('Pengguna');
    var hasil = fn(t);
    cacheHapus_('pengguna_v1');
    return hasil;
  });
}

function buatPengguna_(t, o) {
  var garam = acak_();
  var baris = {
    id: Utilities.getUuid().replace(/-/g, '').slice(0, 12), username: o.username, nama: o.nama, peran: o.peran,
    hash: hashSandi_(o.sandi, garam), salt: garam, aktif: true, login_terakhir: '', dibuat_pada: new Date()
  };
  t.sheet.getRange(t.sheet.getLastRow() + 1, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, baris)]);
  return baris;
}

/* ---------- peran & izin ---------- */

function matriksPeran_() {
  return cacheAmbil_('peran_v1', 300, function () {
    var m = {};
    bacaTabel_('Peran').baris.forEach(function (b) {
      if (!b.peran || !b.modul) return;
      m[b.peran] = m[b.peran] || {};
      m[b.peran][b.modul] = {};
      AKSI_IZIN.forEach(function (a) { m[b.peran][b.modul][a] = b[a] === true || String(b[a]).toUpperCase() === 'TRUE'; });
    });
    return m;
  });
}

function izinPengguna_(user) {
  var hasil = {};
  var mat = matriksPeran_();
  URUTAN_MODUL.forEach(function (k) {
    var m = MODUL[k];
    var o = {};
    AKSI_IZIN.forEach(function (a) {
      if (user.peran === 'Admin') o[a] = true;
      else if (m.adminSaja) o[a] = a === 'lihat';
      else o[a] = !!(mat[user.peran] && mat[user.peran][k] && mat[user.peran][k][a]);
    });
    hasil[k] = o;
  });
  return hasil;
}

function wajibIzin_(user, kunci, aksi) {
  var i = izinPengguna_(user)[kunci];
  if (!i || !i[aksi]) throw new Error('Anda tidak punya izin untuk tindakan ini.');
}

function wajibAdmin_(user) {
  if (user.peran !== 'Admin') throw new Error('Hanya Admin yang boleh melakukan ini.');
}

/* ---------- sesi ---------- */

// Sesi disimpan dua lapis: CacheService (cepat) dan PropertiesService (cadangan, karena Google boleh
// mengosongkan cache kapan saja; tanpa cadangan pengguna bisa tiba-tiba keluar di tengah pekerjaan).
function sesiSimpan_(token, uid) {
  CacheService.getScriptCache().put('sesi_' + token, uid, SESI_DETIK);
  PropertiesService.getScriptProperties().setProperty('sesi_' + token, uid + '|' + (Date.now() + SESI_DETIK * 1000));
}
function sesiHapus_(token) {
  CacheService.getScriptCache().remove('sesi_' + token);
  PropertiesService.getScriptProperties().deleteProperty('sesi_' + token);
}
// buang sesi kedaluwarsa dari PropertiesService supaya tidak menumpuk (dipanggil saat masuk)
function sesiBersihkan_() {
  var props = PropertiesService.getScriptProperties(), semua = props.getProperties(), kini = Date.now();
  Object.keys(semua).forEach(function (k) {
    if (k.indexOf('sesi_') !== 0) return;
    var habis = Number(String(semua[k]).split('|')[1]);
    if (!(habis > kini)) props.deleteProperty(k);
  });
}

function sesi_(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error('SESI_HABIS');
  var c = CacheService.getScriptCache();
  var uid = c.get('sesi_' + token), perbarui = false;
  if (!uid) {
    var p = String(PropertiesService.getScriptProperties().getProperty('sesi_' + token) || '').split('|');
    if (p[0] && Number(p[1]) > Date.now()) { uid = p[0]; perbarui = Number(p[1]) - Date.now() < SESI_DETIK * 500; }
  }
  if (!uid) throw new Error('SESI_HABIS');
  var user = daftarPengguna_().filter(function (u) { return u.id === uid; })[0];
  if (!user || !user.aktif) throw new Error('SESI_HABIS');
  if (perbarui) sesiSimpan_(token, uid); else c.put('sesi_' + token, uid, SESI_DETIK);
  return user;
}

function apiStatusAwal() {
  pastikanSiap_();
  var p = pengaturan_();
  return { adaPengguna: daftarPengguna_().length > 0, sekolah: p.nama_sekolah, logo: logoUri_(p.logo_drive_file_id) };
}

function apiBuatAdmin(nama, username, sandi) {
  username = String(username || '').trim().toLowerCase();
  nama = String(nama || '').trim();
  if (!nama) throw new Error('Nama wajib diisi.');
  cekUsername_(username); cekSandi_(sandi);
  tulisPengguna_(function (t) {
    var ada = t.baris.filter(function (b) { return b.id; }).length;
    if (ada) throw new Error('Akun sudah pernah dibuat. Masuk dengan akun yang ada.');
    buatPengguna_(t, { username: username, nama: nama, peran: 'Admin', sandi: sandi });
  });
  return apiMasuk(username, sandi);
}

function apiMasuk(username, sandi) {
  username = String(username || '').trim().toLowerCase();
  sandi = String(sandi || '');
  var c = CacheService.getScriptCache();
  var kg = 'gagal_' + username;
  var gagal = Number(c.get(kg) || 0);
  if (gagal >= MAKS_GAGAL) throw new Error('Terlalu banyak percobaan salah. Coba lagi dalam 10 menit atau minta admin mereset kata sandi.');
  var user = daftarPengguna_().filter(function (u) { return u.username === username; })[0];
  var cocok = user ? hashSandi_(sandi, user.salt) === user.hash : (hashSandi_(sandi, 'x'), false);
  if (!cocok) {
    c.put(kg, String(gagal + 1), 600);
    throw new Error('Nama pengguna atau kata sandi salah.');
  }
  if (!user.aktif) throw new Error('Akun ini dinonaktifkan. Hubungi admin sekolah.');
  c.remove(kg);
  var token = acak_().slice(0, 64);
  try { sesiBersihkan_(); } catch (e) { /* bukan hal kritis */ }
  sesiSimpan_(token, user.id);
  try {
    tulisPengguna_(function (t) {
      var b = t.baris.filter(function (x) { return String(x.id) === user.id; })[0];
      if (b) t.sheet.getRange(b._r, t.peta.login_terakhir).setValue(new Date());
    });
  } catch (e) { /* bukan hal kritis */ }
  catat_(user, 'auth', 'masuk', '', null, 1);
  return bootstrap_(token, user);
}

function apiSesi(token) {
  var user = sesi_(token);
  pastikanSiap_();   // sesi lama tetap memicu pembaruan struktur Sheet setelah aplikasi diperbarui
  return bootstrap_(token, user);
}

function apiKeluar(token) {
  if (token && /^[a-f0-9]{64}$/.test(token)) sesiHapus_(token);
  return true;
}

function bootstrap_(token, user) {
  var izin = izinPengguna_(user);
  var modul = {};
  URUTAN_MODUL.forEach(function (k) { if (izin[k].lihat) modul[k] = modul_(k); });
  var p = pengaturan_();
  return {
    token: token,
    user: { id: user.id, nama: user.nama, username: user.username, peran: user.peran },
    izin: izin, modul: modul, urutan: URUTAN_MODUL,
    sekolah: { nama_sekolah: p.nama_sekolah, jenjang: p.jenjang, npsn: p.npsn, alamat: p.alamat, kota: p.kota,
      nama_kepala_sekolah: p.nama_kepala_sekolah, nip_kepala_sekolah: p.nip_kepala_sekolah, status_kepala_sekolah: p.status_kepala_sekolah },
    logo: logoUri_(p.logo_drive_file_id),
    hariIni: hariIni_(),
    beranda: (function () { try { return dataBeranda_(user); } catch (e) { return null; } })()   // hemat satu panggilan saat membuka aplikasi
  };
}

/* ---------- panel admin: pengguna ---------- */

function apiPenggunaDaftar(token) {
  wajibAdmin_(sesi_(token));
  return daftarPengguna_().map(penggunaPublik_);
}

function apiPenggunaSimpan(token, d) {
  var aku = sesi_(token); wajibAdmin_(aku);
  var nama = String(d.nama || '').trim();
  var username = String(d.username || '').trim().toLowerCase();
  if (!nama) throw new Error('Nama wajib diisi.');
  cekUsername_(username);
  if (SEMUA_PERAN.indexOf(d.peran) < 0) throw new Error('Peran tidak valid.');
  if (d.sandi) cekSandi_(d.sandi);
  return tulisPengguna_(function (t) {
    var semua = t.baris.filter(function (b) { return b.id; });
    var dup = semua.filter(function (b) { return String(b.username) === username && String(b.id) !== String(d.id || ''); })[0];
    if (dup) throw new Error('Nama pengguna "' + username + '" sudah dipakai.');
    if (!d.id) {
      if (!d.sandi) throw new Error('Kata sandi awal wajib diisi untuk akun baru.');
      buatPengguna_(t, { username: username, nama: nama, peran: d.peran, sandi: d.sandi });
      return true;
    }
    var b = semua.filter(function (x) { return String(x.id) === String(d.id); })[0];
    if (!b) throw new Error('Akun tidak ditemukan.');
    var aktif = d.aktif !== false;
    var adminAktifLain = semua.filter(function (x) {
      return String(x.id) !== String(d.id) && x.peran === 'Admin' && (x.aktif === true || String(x.aktif).toUpperCase() === 'TRUE');
    }).length;
    if ((d.peran !== 'Admin' || !aktif) && b.peran === 'Admin' && !adminAktifLain) throw new Error('Harus tersisa minimal satu Admin aktif.');
    if (String(b.id) === aku.id && !aktif) throw new Error('Anda tidak bisa menonaktifkan akun sendiri.');
    var isi = { username: username, nama: nama, peran: d.peran, aktif: aktif };
    if (d.sandi) { var g = acak_(); isi.salt = g; isi.hash = hashSandi_(d.sandi, g); }
    var dasar = t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0];
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, isi, dasar)]);
    return true;
  });
}

function apiPeranAmbil(token) {
  wajibAdmin_(sesi_(token));
  return { matriks: matriksPeran_(), peran: PERAN_DAPAT_DIATUR, modul: URUTAN_MODUL.filter(function (k) { return !MODUL[k].adminSaja; })
    .map(function (k) { return { k: k, judul: MODUL[k].judul }; }), aksi: AKSI_IZIN };
}

function apiPeranSimpan(token, matriks) {
  wajibAdmin_(sesi_(token));
  dalamLock_(function () {
    var t = bacaTabel_('Peran');
    var baris = [];
    PERAN_DAPAT_DIATUR.forEach(function (peran) {
      URUTAN_MODUL.forEach(function (k) {
        if (MODUL[k].adminSaja) return;
        var o = { peran: peran, modul: k };
        AKSI_IZIN.forEach(function (a) { o[a] = !!(matriks[peran] && matriks[peran][k] && matriks[peran][k][a]); });
        if (!o.lihat) { o.tambah = false; o.ubah = false; o.hapus = false; o.cetak = false; }
        baris.push(arrayBaris_(t.peta, t.lebar, o));
      });
    });
    if (t.sheet.getLastRow() >= 2) t.sheet.getRange(2, 1, t.sheet.getLastRow() - 1, t.lebar).clearContent();
    t.sheet.getRange(2, 1, baris.length, t.lebar).setValues(baris);
    cacheHapus_('peran_v1');
  });
  return true;
}

// darurat: dipanggil dari menu Sheet oleh pemilik file
function setelAdminDarurat_(username, sandi) {
  username = String(username).trim().toLowerCase();
  cekUsername_(username); cekSandi_(sandi);
  tulisPengguna_(function (t) {
    var b = t.baris.filter(function (x) { return String(x.username) === username; })[0];
    if (!b) { buatPengguna_(t, { username: username, nama: 'Administrator', peran: 'Admin', sandi: sandi }); return; }
    var g = acak_();
    var dasar = t.sheet.getRange(b._r, 1, 1, t.lebar).getValues()[0];
    t.sheet.getRange(b._r, 1, 1, t.lebar).setValues([arrayBaris_(t.peta, t.lebar, { salt: g, hash: hashSandi_(sandi, g), aktif: true, peran: 'Admin' }, dasar)]);
  });
  CacheService.getScriptCache().remove('gagal_' + username);
}
