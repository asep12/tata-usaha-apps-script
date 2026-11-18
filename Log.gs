/** CATATAN AKTIVITAS, BUKTI DAMPAK, DAN CADANGAN OTOMATIS. */

var AKTIVITAS_KOLOM = ['waktu', 'pengguna', 'peran', 'modul', 'aksi', 'ringkas', 'durasi_detik', 'jumlah'];
var CADANGAN_MAKS = 8;

// Kegiatan yang dihitung sebagai "pekerjaan" untuk estimasi waktu. Kunci = modul|aksi pada catatan aktivitas.
var GRUP_KEGIATAN = [
  { id: 'surat_masuk', label: 'Mencatat surat masuk (no. agenda otomatis)', aksi: ['surat_masuk|tambah'] },
  { id: 'surat_keluar', label: 'Menerbitkan surat keluar (nomor otomatis)', aksi: ['surat_keluar|terbitkan'] },
  { id: 'cetak', label: 'Mencetak dokumen PDF (surat, buku induk, keterangan, KIR)', aksi: ['surat_keluar|cetak', 'surat_keluar|bukti', 'siswa|induk', 'pegawai|induk', 'siswa|keterangan', 'ruang|kir'] },
  { id: 'orang', label: 'Memasukkan data siswa atau pegawai', aksi: ['siswa|tambah', 'pegawai|tambah', 'siswa|impor', 'pegawai|impor'] },
  { id: 'barang', label: 'Mencatat ruangan dan barang inventaris', aksi: ['aset|tambah', 'aset|impor', 'ruang|tambah', 'ruang|impor'] }
];

function catat_(user, modul, aksi, ringkas, durasi, jumlah) {
  try {
    var s = ss_().getSheetByName('Aktivitas');
    if (!s) return;
    var d = Number(durasi);
    s.appendRow([new Date(), user.username || '', user.peran || '', modul, aksi, String(ringkas || '').slice(0, 160),
      isFinite(d) && d > 0 && d <= 1800 ? Math.round(d) : '', Number(jumlah) > 0 ? Number(jumlah) : 1]);
  } catch (e) { /* pencatatan tidak boleh menggagalkan aksi utama */ }
}

// nama pribadi tidak ditulis ke catatan; hanya data non-pribadi yang membantu pelacakan
function ringkasCatatan_(kunci, r) {
  if (!r) return '';
  if (kunci === 'surat_keluar') return r.nomor_surat || '';
  if (kunci === 'ruang' || kunci === 'aset' || kunci === 'kode_klasifikasi') return r[MODUL[kunci].judulField] || '';
  return '';
}

function apiCatatImpor(token, kunci, jumlah, detik) {
  var u = sesi_(token);
  modul_(kunci);
  catat_(u, kunci, 'impor', '', detik, jumlah);
  return true;
}

function median_(a) {
  if (!a.length) return null;
  var b = a.slice().sort(function (x, y) { return x - y; });
  var m = Math.floor(b.length / 2);
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}

function persen_(rows, fn) {
  if (!rows.length) return null;
  return Math.round(rows.filter(fn).length / rows.length * 1000) / 10;
}

function ambilBaseline_() {
  try { return JSON.parse(pengaturan_().baseline_json || '{}') || {}; } catch (e) { return {}; }
}

function apiBaselineSimpan(token, obj) {
  wajibAdmin_(sesi_(token));
  var bersih = {};
  GRUP_KEGIATAN.forEach(function (g) {
    var v = Number(obj && obj[g.id]);
    if (isFinite(v) && v > 0 && v < 600) bersih[g.id] = v;
  });
  simpanPengaturan_('baseline_json', JSON.stringify(bersih));
  return bersih;
}

// hari: 0 = semua waktu
function apiDampak(token, hari) {
  var u = sesi_(token);
  if (u.peran !== 'Admin' && u.peran !== 'Pimpinan') throw new Error('Halaman ini hanya untuk Admin dan Pimpinan.');
  hari = Number(hari) || 0;
  var dari = hari ? new Date(Date.now() - hari * 86400000) : null;
  var baris = bacaTabel_('Aktivitas').baris.filter(function (b) { return isTanggal_(b.waktu) && (!dari || b.waktu >= dari); });
  var baseline = ambilBaseline_();

  var kegiatan = GRUP_KEGIATAN.map(function (g) {
    var jumlah = 0, perUnit = [];
    baris.forEach(function (b) {
      if (g.aksi.indexOf(b.modul + '|' + b.aksi) < 0) return;
      var n = Number(b.jumlah) || 1;
      jumlah += n;
      if (Number(b.durasi_detik) > 0) perUnit.push(Number(b.durasi_detik) / n);
    });
    var med = median_(perUnit);
    var base = baseline[g.id] || null;   // menit per unit, diisi Admin (bukan tebakan sistem)
    var hemat = base && med !== null ? Math.max(0, jumlah * (base - med / 60)) : null;
    return { id: g.id, label: g.label, jumlah: jumlah, sampel: perUnit.length, medianDetik: med === null ? null : Math.round(med * 10) / 10, baselineMenit: base, hematMenit: hemat === null ? null : Math.round(hemat) };
  });

  var pengguna = {};
  var masuk = 0;
  baris.forEach(function (b) { if (b.modul === 'auth') masuk++; if (b.pengguna) pengguna[b.pengguna] = 1; });
  var pertama = null;
  bacaTabel_('Aktivitas').baris.forEach(function (b) { if (isTanggal_(b.waktu) && (!pertama || b.waktu < pertama)) pertama = b.waktu; });

  var siswa = daftarModul_('siswa'), pegawai = daftarModul_('pegawai'), sk = daftarModul_('surat_keluar'), aset = daftarModul_('aset'), ruang = daftarModul_('ruang');
  var nomor = {}, ganda = 0, bernomor = 0;
  sk.forEach(function (r) { if (r.nomor_surat) { bernomor++; if (nomor[r.nomor_surat]) ganda++; nomor[r.nomor_surat] = 1; } });
  var aktif = siswa.filter(function (r) { return r.status === 'Aktif'; });

  var kualitas = [];
  function tambah(label, v, total) { if (v !== null) kualitas.push({ label: label, persen: v, total: total }); }
  tambah('Siswa aktif dengan NISN terisi', persen_(aktif, function (r) { return !!r.nisn; }), aktif.length);
  tambah('Siswa aktif dengan tanggal lahir terisi', persen_(aktif, function (r) { return !!r.tanggal_lahir; }), aktif.length);
  tambah('Siswa aktif dengan nama ibu terisi', persen_(aktif, function (r) { return !!r.nama_ibu; }), aktif.length);
  tambah('Pegawai dengan NIP/NUPTK terisi', persen_(pegawai, function (r) { return !!r.nip_nuptk; }), pegawai.length);
  tambah('Barang inventaris dengan tahun perolehan terisi', persen_(aset, function (r) { return !!r.tahun_perolehan; }), aset.length);

  var unitLab = 0, unitLabRusak = 0, unitTik = 0, unitTikRusak = 0, buku = 0;
  aset.forEach(function (r) {
    var j = Number(r.jumlah) || 0, rusak = (Number(r.jml_rusak_ringan) || 0) + (Number(r.jml_rusak_berat) || 0);
    if (r.kategori === 'Alat Peraga dan Laboratorium') { unitLab += j; unitLabRusak += rusak; }
    if (r.kategori === 'Peralatan TIK') { unitTik += j; unitTikRusak += rusak; }
    if (r.kategori === 'Buku dan Koleksi Perpustakaan') buku += j;
  });
  var abk = aktif.filter(function (r) { return r.kebutuhan_khusus; }).length;

  return {
    periodeHari: hari, sejak: pertama ? isoTanggal_(pertama) : '', totalCatatan: baris.length, kali_masuk: masuk, penggunaAktif: Object.keys(pengguna).length,
    kegiatan: kegiatan,
    surat: { diterbitkan: bernomor, ganda: ganda, total: sk.length },
    kualitas: kualitas,
    tema: {
      inklusif: { abk: abk, siswaAktif: aktif.length },
      stem: { unitLab: unitLab, unitLabRusak: unitLabRusak, unitTik: unitTik, unitTikRusak: unitTikRusak },
      literasi: { buku: buku, perpustakaan: ruang.filter(function (r) { return r.jenis_ruang === 'Perpustakaan'; }).length }
    },
    ringkasan: { siswa: siswa.length, pegawai: pegawai.length, ruang: ruang.length, jenisBarang: aset.length }
  };
}

/* ---------- cadangan ---------- */

function folderCadangan_() {
  var id = pengaturan_().cadangan_folder_id;
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return pindahKeAkar_(f, 'Cadangan'); } catch (e) { /* buat baru */ } }
  var g = subFolder_('Cadangan');
  simpanPengaturan_('cadangan_folder_id', g.getId());
  return g;
}

function daftarCadangan_() {
  var it = folderCadangan_().getFiles(), a = [];
  while (it.hasNext()) { var f = it.next(); a.push({ nama: f.getName(), url: f.getUrl(), waktu: f.getDateCreated() }); }
  a.sort(function (x, y) { return y.waktu - x.waktu; });
  return a;
}

function cadangkanSekarang_() {
  var folder = folderCadangan_();
  var nama = 'Cadangan Tata Usaha ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH.mm');
  var f = DriveApp.getFileById(ss_().getId()).makeCopy(nama, folder);
  var semua = daftarCadangan_();
  for (var i = CADANGAN_MAKS; i < semua.length; i++) {   // simpan CADANGAN_MAKS terbaru; sisanya ke tempat sampah (bisa dipulihkan)
    var it = folder.getFilesByName(semua[i].nama);
    while (it.hasNext()) it.next().setTrashed(true);
  }
  simpanPengaturan_('cadangan_terakhir', isoWaktu_(new Date()));
  return { nama: nama, url: f.getUrl() };
}

// dipanggil oleh pemicu mingguan
function cadanganOtomatis() {
  try { cadangkanSekarang_(); } catch (e) { console.error('Cadangan gagal: ' + e.message); }
}

function pemicuCadangan_() {
  return ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'cadanganOtomatis'; });
}

function apiCadanganStatus(token) {
  wajibAdmin_(sesi_(token));
  var p = pengaturan_();
  return {
    otomatis: pemicuCadangan_().length > 0, terakhir: p.cadangan_terakhir || '', maks: CADANGAN_MAKS,
    folderUrl: p.cadangan_folder_id ? 'https://drive.google.com/drive/folders/' + p.cadangan_folder_id : '',
    daftar: p.cadangan_folder_id ? daftarCadangan_().slice(0, CADANGAN_MAKS).map(function (c) { return { nama: c.nama, url: c.url, waktu: isoWaktu_(c.waktu) }; }) : []
  };
}

function apiCadanganSekarang(token) {
  var u = sesi_(token); wajibAdmin_(u);
  var h = cadangkanSekarang_();
  catat_(u, 'cadangan', 'manual', '', null, 1);
  return h;
}

function apiCadanganOtomatis(token, aktif) {
  wajibAdmin_(sesi_(token));
  var ada = pemicuCadangan_();
  if (aktif && !ada.length) ScriptApp.newTrigger('cadanganOtomatis').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
  if (!aktif) ada.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  return pemicuCadangan_().length > 0;
}

// Lini waktu Beranda: kegiatan terbaru (tanpa login). Admin/Pimpinan melihat semua, peran lain hanya kegiatannya sendiri.
// Hanya 200 baris terakhir yang dibaca supaya Beranda tetap cepat walau catatan sudah ribuan baris.
function aktivitasTerbaru_(u, n) {
  var s = ss_().getSheetByName('Aktivitas');
  if (!s) return [];
  var akhir = s.getLastRow();
  if (akhir < 2) return [];
  var awal = Math.max(2, akhir - 199), semua = u.peran === 'Admin' || u.peran === 'Pimpinan';
  var k = {}; AKTIVITAS_KOLOM.forEach(function (x, i) { k[x] = i; });
  var hasil = [];
  var v = s.getRange(awal, 1, akhir - awal + 1, AKTIVITAS_KOLOM.length).getValues();
  for (var i = v.length - 1; i >= 0 && hasil.length < (n || 6); i--) {
    var b = v[i];
    if (!isTanggal_(b[k.waktu]) || b[k.modul] === 'auth') continue;
    if (!semua && String(b[k.pengguna]) !== u.username) continue;
    hasil.push({ waktu: isoWaktu_(b[k.waktu]), pengguna: String(b[k.pengguna] || ''), modul: String(b[k.modul]), aksi: String(b[k.aksi]), ringkas: String(b[k.ringkas] || ''), jumlah: Number(b[k.jumlah]) || 1 });
  }
  return hasil;
}
