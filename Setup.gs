/** SETUP: menyiapkan tab Sheet (basis data) dan menu cadangan untuk pemilik Sheet. */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Tata Usaha')
    .addItem('Siapkan / Perbaiki Sheet', 'siapkanSheet')
    .addItem('Atur ulang kata sandi Admin (darurat)', 'aturUlangAdmin')
    .addToUi();
}

function siapkanSheet() {
  try {
    siapkanSemua_();
    SpreadsheetApp.getActive().toast('Sheet siap. Buka aplikasi web (Deploy > Test deployments) untuk mulai.', 'Tata Usaha', 8);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Gagal menyiapkan sheet', String(e.message || e), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function aturUlangAdmin() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('Reset Admin', 'Nama pengguna Admin (akan dibuat jika belum ada):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt('Reset Admin', 'Kata sandi baru (minimal 8 karakter):', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  try {
    pastikanSiap_();
    setelAdminDarurat_(a.getResponseText(), b.getResponseText());
    ui.alert('Selesai', 'Akun Admin siap dipakai untuk masuk.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Gagal', String(e.message || e), ui.ButtonSet.OK);
  }
}

// Cukup satu baca properti bila skema sudah sesuai versi. Tab yang hilang diperbaiki lewat menu Pemeliharaan.
function pastikanSiap_() {
  if (PropertiesService.getScriptProperties().getProperty('SKEMA_SIAP') === VERSI_SKEMA) return;
  dalamLock_(function () { siapkanSemua_(); });
}

function siapkanSemua_() {
  var ss = ss_();
  var tabPengaturan = tabDengan_(ss, 'Pengaturan', PENGATURAN_KOLOM);
  URUTAN_MODUL.forEach(function (k) { siapkanTabModul_(ss, MODUL[k]); });
  var tabPengguna = tabDengan_(ss, 'Pengguna', PENGGUNA_KOLOM);
  var tabPeran = tabDengan_(ss, 'Peran', PERAN_KOLOM);
  var tabAkt = tabDengan_(ss, 'Aktivitas', AKTIVITAS_KOLOM);

  // format
  formatJudul_(tabPengaturan);
  if (tabPengaturan.getLastRow() < 2) tabPengaturan.getRange(2, 1).setValue('');
  var cp = petaKolom_(tabPengaturan);
  tabPengaturan.getRange(2, 1, 1, tabPengaturan.getLastColumn()).setNumberFormat('@');
  if (!String(tabPengaturan.getRange(2, cp.kode_unit_kerja).getValue())) tabPengaturan.getRange(2, cp.kode_unit_kerja).setValue('TU');

  formatJudul_(tabPengguna);
  var cg = petaKolom_(tabPengguna);
  tabPengguna.getRange(2, 1, tabPengguna.getMaxRows() - 1, tabPengguna.getLastColumn()).setNumberFormat('@');
  tabPengguna.hideColumns(cg.hash); tabPengguna.hideColumns(cg.salt);
  formatJudul_(tabPeran);
  formatJudul_(tabAkt);
  tabAkt.getRange(2, 1, Math.max(1, tabAkt.getMaxRows() - 1), 1).setNumberFormat('dd/mm/yyyy HH:mm:ss');

  // isi awal peran
  // tambahkan baris izin untuk modul yang belum punya (juga saat aplikasi diperbarui dengan modul baru)
  var sudah = {};
  if (tabPeran.getLastRow() >= 2) tabPeran.getRange(2, 1, tabPeran.getLastRow() - 1, 2).getValues().forEach(function (r) { sudah[r[0] + '|' + r[1]] = 1; });
  var baris = [];
  PERAN_DAPAT_DIATUR.forEach(function (peran) {
    URUTAN_MODUL.forEach(function (k) {
      if (MODUL[k].adminSaja || sudah[peran + '|' + k]) return;
      var i = IZIN_AWAL[peran];
      baris.push([peran, k, i.lihat, i.tambah, i.ubah, i.hapus, i.cetak]);
    });
  });
  if (baris.length) tabPeran.getRange(Math.max(2, tabPeran.getLastRow() + 1), 1, baris.length, PERAN_KOLOM.length).setValues(baris);
  cacheHapus_('peran_v1');
  // daftar awal kode klasifikasi dan jenis surat (hanya bila tab masih kosong)
  isiAwal_(ss, MODUL.kode_klasifikasi, KODE_STANDAR, function (r) { return { kode: r[0], nama: r[1], kategori: r[2], keterangan: r[3], status: 'Aktif' }; });
  isiAwal_(ss, MODUL.jenis_surat, JENIS_STANDAR, function (r) { return { singkatan: r[0], nama: r[1], layout: r[2], keterangan: r[3], status: 'Aktif' }; });
  if (!String(pengaturan_().format_nomor || '')) simpanPengaturan_('format_nomor', FORMAT_NOMOR_AWAL);

  // lindungi tab basis data dari edit tak sengaja (peringatan saja; pemilik tetap bisa)
  ss.getSheets().forEach(function (s) {
    if (s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) return;
    s.protect().setWarningOnly(true).setDescription('Data dikelola lewat aplikasi web Tata Usaha');
  });

  // hapus lembar bawaan yang kosong
  ss.getSheets().forEach(function (s) {
    if (/^(Sheet1|Lembar ?1)$/i.test(s.getName()) && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  var urutan = ['Pengaturan'].concat(URUTAN_MODUL.map(function (k) { return MODUL[k].tab; }), ['Pengguna', 'Peran', 'Aktivitas']);
  urutan.forEach(function (n, i) { ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1); });
  ss.setActiveSheet(ss.getSheetByName('Pengaturan'));

  PropertiesService.getScriptProperties().setProperty('SKEMA_SIAP', VERSI_SKEMA);
  hapusSemuaCacheModul_();
  cacheHapus_('pengaturan_v1'); _pengaturan = null;
}

// pastikan tab ada dan semua kolom skema tersedia (kolom yang sudah ada tidak diubah)
function tabDengan_(ss, nama, kolom) {
  var s = ss.getSheetByName(nama) || ss.insertSheet(nama);
  var ada = s.getLastColumn() > 0 && String(s.getRange(1, 1).getValue()) !== '';
  if (!ada) {
    s.getRange(1, 1, 1, kolom.length).setValues([kolom]);
  } else {
    var peta = petaKolom_(s);
    var next = s.getLastColumn() + 1;
    kolom.forEach(function (k) { if (!peta[k]) { s.getRange(1, next).setValue(k); next++; } });
  }
  return s;
}

function formatJudul_(s) {
  s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
  s.setFrozenRows(1);
}

function isiAwal_(ss, m, daftar, keObj) {
  var s = ss.getSheetByName(m.tab);
  if (!s || s.getLastRow() >= 2) return;
  var t = bacaTabel_(m.tab);
  var isi = daftar.map(function (r) { return arrayBaris_(t.peta, t.lebar, siapkanBaru_(m, keObj(r), { username: 'sistem' })); });
  s.getRange(2, 1, isi.length, t.lebar).setValues(isi);
}

function hurufKolom_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function siapkanTabModul_(ss, m) {
  var s = tabDengan_(ss, m.tab, kolomModul_(m));
  formatJudul_(s);
  // bersihkan sisa aturan dari versi menu Sheet (dropdown, sorotan, proteksi kolom) yang menolak penulisan dari aplikasi
  s.getRange(2, 1, Math.max(1, s.getMaxRows() - 1), Math.max(1, s.getLastColumn())).clearDataValidations();
  s.setConditionalFormatRules([]);
  s.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { p.remove(); });
  var c = petaKolom_(s);
  var n = Math.max(1, s.getMaxRows() - 1);
  // satu panggilan per jenis format (bukan per kolom), supaya penyiapan pertama kali cepat
  var teks = [], tanggal = [], waktu = [];
  function a1(k) { var h = hurufKolom_(c[k]); return h + '2:' + h + (n + 1); }
  m.field.forEach(function (f) {
    if (f.t === 'tanggal') tanggal.push(a1(f.k)); else if (f.t !== 'angka') teks.push(a1(f.k));
  });
  ['dibuat_pada', 'diubah_pada'].forEach(function (k) { waktu.push(a1(k)); });
  if (teks.length) s.getRangeList(teks).setNumberFormat('@');
  if (tanggal.length) s.getRangeList(tanggal).setNumberFormat('dd/mm/yyyy');
  s.getRangeList(waktu).setNumberFormat('dd/mm/yyyy HH:mm');
  ['id', 'dibuat_oleh', 'dibuat_pada', 'diubah_oleh', 'diubah_pada', 'dihapus'].forEach(function (k) { s.hideColumns(c[k]); });
  return s;
}

/* ---------- pengaturan (baris 2 tab Pengaturan) ---------- */

// dibaca hampir di tiap permintaan: disimpan per eksekusi dan di CacheService, dihapus saat ada perubahan
var _pengaturan = null;

function pengaturan_() {
  if (_pengaturan) return _pengaturan;
  _pengaturan = cacheAmbil_('pengaturan_v1', 600, function () {
    var s = bukaTab_('Pengaturan');
    var c = petaKolom_(s);
    var v = s.getLastRow() >= 2 ? s.getRange(2, 1, 1, s.getLastColumn()).getValues()[0] : [];
    var o = {};
    Object.keys(c).forEach(function (k) { var x = v[c[k] - 1]; o[k] = x === undefined || x === null ? '' : String(x).trim(); });
    return o;
  });
  return _pengaturan;
}

function simpanPengaturan_(kunci, nilai) {
  var s = bukaTab_('Pengaturan');
  var c = petaKolom_(s);
  if (!c[kunci]) throw new Error('Kolom pengaturan "' + kunci + '" tidak ada.');
  s.getRange(2, c[kunci]).setNumberFormat('@').setValue(nilai);
  _pengaturan = null;
  cacheHapus_('pengaturan_v1');
}

// Jalankan sekali dari editor Apps Script (pilih "otorisasi" lalu Run) supaya Google meminta semua izin yang dibutuhkan.
function otorisasi() {
  ScriptApp.getProjectTriggers();
  DriveApp.getRootFolder();
  ss_();
  Logger.log('Izin sudah lengkap. Aplikasi siap dipakai.');
}
