// Uji alur server di Node dengan tiruan layanan Google (Sheets, Cache, Properties, Lock, Utilities).
// Menjalankan semua *.gs tanpa mengubahnya. Tidak menguji pembuatan PDF (DocumentApp/DriveApp).
// Jalankan: node preview/uji_server.js
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');

/* ---------------- tiruan Spreadsheet ---------------- */
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.get(this.r + i, this.c + j)); out.push(row); } return out; }
  getValue() { return this.sh.get(this.r, this.c); }
  setValues(v) {
    if (v.length !== this.nr || v.some(x => x.length !== this.nc)) throw new Error(`setValues ukuran salah ${v.length}x${v[0] && v[0].length} vs ${this.nr}x${this.nc}`);
    v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this;
  }
  setValue(x) { this.sh.set(this.r, this.c, x); return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.set(this.r + i, this.c + j, ''); return this; }
  getRow() { return this.r; } getNumRows() { return this.nr; } getNumColumns() { return this.nc; } getColumn() { return this.c; }
}
['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setVerticalAlignment', 'clearDataValidations', 'setDataValidation', 'setNote']
  .forEach(m => { Range.prototype[m] = function () { return this; }; });
Range.prototype.copyTo = function (tujuan, jenis) { this.sh.salinFormat = (this.sh.salinFormat || 0) + 1; return this; };
Range.prototype.protect = function () { const p = { setWarningOnly() { return p; }, setDescription() { return p; }, remove() {} }; this.sh.prot.push(p); return p; };

class Sheet {
  constructor(name) { this.name = name; this.cells = {}; this.maxRows = 1000; this.prot = []; }
  key(r, c) { return r + ',' + c; }
  get(r, c) { const v = this.cells[this.key(r, c)]; return v === undefined ? '' : v; }
  set(r, c, v) { if (typeof v === 'string' && v === '') delete this.cells[this.key(r, c)]; else this.cells[this.key(r, c)] = v; if (r > this.maxRows) this.maxRows = r; }
  getName() { return this.name; }
  getLastRow() { let m = 0; for (const k in this.cells) { const r = +k.split(',')[0]; if (r > m) m = r; } return m; }
  getLastColumn() { let m = 0; for (const k in this.cells) { const c = +k.split(',')[1]; if (c > m) m = c; } return m; }
  getMaxRows() { return this.maxRows; }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') { const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d*))?$/.exec(r); const col = s => s.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); return new Range(this, +m[2], col(m[1]), 1, 1); }
    if (r < 1 || c < 1 || (nr !== undefined && nr < 1) || (nc !== undefined && nc < 1)) throw new Error(`getRange tidak sah (${r},${c},${nr},${nc}) di ${this.name}`);
    if (r + (nr || 1) - 1 > this.maxRows) throw new Error(`The coordinates of the range are outside the dimensions of the sheet. (${this.name} baris ${r + (nr || 1) - 1} > ${this.maxRows})`);
    return new Range(this, r, c, nr, nc);
  }
  getRangeList() { return { setNumberFormat() { return this; } }; }
  appendRow(row) { const r = this.getLastRow() + 1; row.forEach((v, j) => this.set(r, j + 1, v)); return this; }
  insertRowsAfter(a, n) { this.maxRows += n; return this; }
  hideColumns() { return this; } setFrozenRows() { return this; } autoResizeColumns() { return this; }
  setConditionalFormatRules() { return this; }
  getProtections(t) { return t === 'SHEET' ? this.prot.filter(p => p.sheet) : []; }
  protect() { const p = { sheet: true, setWarningOnly() { return p; }, setDescription() { return p; }, remove() {} }; this.prot.push(p); return p; }
}
class Spreadsheet {
  constructor() { this.sheets = [new Sheet('Sheet1')]; this.active = this.sheets[0]; }
  getId() { return 'SS1'; } getSpreadsheetTimeZone() { return 'Asia/Jakarta'; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  getSheets() { return this.sheets.slice(); }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
  setActiveSheet(s) { this.active = s; return s; } moveActiveSheet() {} toast() {}
}
const SS = new Spreadsheet();
let panggilanZona = 0;
const asliZona = SS.getSpreadsheetTimeZone.bind(SS);
SS.getSpreadsheetTimeZone = () => { panggilanZona++; return asliZona(); };

/* ---------------- tiruan layanan lain ---------------- */
const cacheStore = {}, propStore = {};
const pad = (n, l) => String(n).padStart(l || 2, '0');
function fmtDate(d, tz, f) {
  const map = { yyyy: d.getFullYear(), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()), HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()) };
  if (f === 'u') return String(d.getDay() === 0 ? 7 : d.getDay());
  if (f === 'M') return String(d.getMonth() + 1);
  if (f === 'd') return String(d.getDate());
  return f.replace(/'T'/g, 'T').replace(/yyyy|MM|dd|HH|mm|ss|M(?!M)/g, t => t === 'M' ? String(d.getMonth() + 1) : map[t]);
}
const ctx = {
  console, JSON, Math, Date, Object, Array, String, Number, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, Promise,
  SpreadsheetApp: { CopyPasteType: { PASTE_FORMAT: 'PASTE_FORMAT' }, getActive: () => SS, openById: () => SS, ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }, getUi: () => ({}), flush() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => propStore[k] === undefined ? null : propStore[k], setProperty: (k, v) => { propStore[k] = String(v); }, deleteProperty: k => { delete propStore[k]; }, getProperties: () => Object.assign({}, propStore) }) },
  CacheService: { getScriptCache: () => ({
    get: k => cacheStore[k] === undefined ? null : cacheStore[k],
    put: (k, v) => { if (String(v).length > 100000) throw new Error('cache terlalu besar'); cacheStore[k] = String(v); },
    putAll: m => { for (const k in m) if (String(m[k]).length > 100000) throw new Error('cache terlalu besar'); Object.assign(cacheStore, m); },
    getAll: ks => { const o = {}; ks.forEach(k => { if (cacheStore[k] !== undefined) o[k] = cacheStore[k]; }); return o; },
    remove: k => { delete cacheStore[k]; }
  }) },
  LockService: { getScriptLock: () => { let held = false; return { waitLock() { if (ctx.__lock) throw new Error('LOCK BERSARANG: dalamLock_ dipanggil di dalam lock lain'); ctx.__lock = true; held = true; }, releaseLock() { if (held) ctx.__lock = false; held = false; } }; } },
  Utilities: {
    formatDate: fmtDate,
    parseDate: (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return new Date(+m[1], +m[2] - 1, +m[3]); },
    getUuid: () => crypto.randomUUID(),
    computeDigest: (alg, v) => Array.from(crypto.createHash('sha256').update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map(b => b & 255))).digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: b => Buffer.from(Array.isArray(b) ? b.map(x => x & 255) : b).toString('base64'),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }
  },
  Logger: { log() {} },
  ScriptApp: { getProjectTriggers: () => [], WeekDay: {} },
  __lock: false
};

/* ---------------- tiruan Google Docs dan Drive (merekam teks dokumen) ---------------- */
const dokTerakhir = { teks: [] };
function elemenTeks(rekam) {
  const t = { setBold() { return t; }, setUnderline() { return t; }, setItalic() { return t; }, setFontSize() { return t; }, setForegroundColor() { return t; }, setFontFamily() { return t; } };
  return t;
}
function Paragraf(teks, rekam) {
  const p = { _t: teks || '', _anak: [],
    setAlignment() { return p; }, setSpacingBefore() { return p; }, setSpacingAfter() { return p; }, setLineSpacing() { return p; },
    setIndentStart() { return p; }, setIndentFirstLine() { return p; }, editAsText() { return elemenTeks(); },
    setText(x) { if (x === '') throw new Error('Cannot insert an empty text element (setText)'); p._t = x; rekam.push(x); }, getText() { return p._t; },
    appendInlineImage() { const img = { getWidth: () => 100, getHeight: () => 50, setWidth() { return img; }, setHeight() { return img; } }; p._anak.push({ getType: () => 'INLINE_IMAGE' }); return img; },
    getNumChildren() { return p._anak.length; }, getChild(i) { return p._anak[i]; }, getType: () => 'PARAGRAPH', asParagraph() { return p; } };
  if (teks) rekam.push(teks);
  return p;
}
function Wadah(rekam) {
  const w = { _anak: [],
    appendParagraph(t) { if (t === '' || t === undefined) throw new Error('Cannot insert an empty text element (appendParagraph)'); const p = Paragraf(t, rekam); w._anak.push(p); return p; },
    appendTable(isi) {
      if (isi.some(r => r.some(x => x === ''))) throw new Error('Cannot insert an empty text element (appendTable)');
      const sel = isi.map(r => r.map(x => { const c = Wadah(rekam); c._anak.push(Paragraf(x, rekam)); c.setPaddingTop = () => c; c.setPaddingBottom = () => c; c.setPaddingLeft = () => c; c.setPaddingRight = () => c; c.setVerticalAlignment = () => c; c.setBackgroundColor = () => c; c.editAsText = () => elemenTeks(); c.merge = () => c; return c; }));
      const t = { setBorderWidth() { return t; }, setColumnWidth() { return t; }, getCell: (r, k) => sel[r][k], getRow: r => ({ getNumCells: () => sel[r].length, getCell: k => sel[r][k] }) };
      w._anak.push({ getType: () => 'TABLE' }); return t;
    },
    appendHorizontalRule() { w._anak.push({ getType: () => 'HR' }); }, appendPageBreak() { rekam.push('--- halaman baru ---'); },
    getChild(i) { return w._anak[i]; }, getNumChildren() { return w._anak.length; }, removeChild(c) { w._anak = w._anak.filter(x => x !== c); },
    editAsText() { return elemenTeks(); }
  };
  return w;
}
ctx.DocumentApp = {
  create() { dokTerakhir.teks = []; const body = Wadah(dokTerakhir.teks); ['setPageWidth', 'setPageHeight', 'setMarginTop', 'setMarginRight', 'setMarginBottom', 'setMarginLeft'].forEach(m => { body[m] = () => body; }); body.clear = () => { body._anak = [Paragraf('', [])]; };
    return { getBody: () => body, saveAndClose() {}, getId: () => 'DOC1' }; },
  HorizontalAlignment: { CENTER: 'C', RIGHT: 'R', LEFT: 'L', JUSTIFY: 'J' }, VerticalAlignment: { CENTER: 'C' },
  ElementType: { PARAGRAPH: 'PARAGRAPH', INLINE_IMAGE: 'INLINE_IMAGE' }
};
const folderMap = {}; let nFolder = 0; const pindahan = [];
function Folder(nama, induk) {
  const id = 'F' + (++nFolder);
  const f = { id, nama, induk, anak: [], trashed: false,
    getId: () => id, getName: () => f.nama, setName(n) { f.nama = n; return f; }, isTrashed: () => f.trashed, getUrl: () => 'https://drive/folders/' + id,
    getParents() { const arr = f.induk ? [f.induk] : []; let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; },
    moveTo(t) { f.induk = t; t.anak.push(f); pindahan.push(f.nama + ' -> ' + t.nama); return f; },
    getFoldersByName(n) { const arr = f.anak.filter(x => x.nama === n); let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; },
    createFolder(n) { const g = Folder(n, f); f.anak.push(g); return g; },
    createFile(b) { const nm = b && b._nama || 'berkas'; f.berkas = (f.berkas || []).concat(nm); return { getUrl: () => 'https://drive/file', getId: () => 'FILE' + nm }; } };
  folderMap[id] = f; return f;
}
const driveRoot = Folder('My Drive', null);
ctx.DriveApp = {
  getFileById: (id) => ({ getAs: () => { const b = { _nama: '', setName(n) { b._nama = n; return b; } }; return b; }, setTrashed() {}, getBlob: () => ({}), moveTo(t) { pindahan.push('file ' + id + ' -> ' + t.nama); } }),
  getFolderById: (id) => { if (!folderMap[id]) throw new Error('folder tidak ada'); return folderMap[id]; },
  createFolder: (n) => driveRoot.createFolder(n)
};
ctx.__folder = { folderMap, pindahan, driveRoot };

vm.createContext(ctx);
fs.readdirSync(root).filter(f => f.endsWith('.gs')).forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));

/* ---------------- skenario ---------------- */
let lulus = 0, gagal = 0;
function uji(nama, fn) {
  try { const r = fn(); lulus++; console.log('  ok  ' + nama + (r !== undefined ? '  -> ' + r : '')); return r; }
  catch (e) { gagal++; console.log('  GAGAL ' + nama + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
}
function harusGagal(nama, fn, pola) {
  try { fn(); gagal++; console.log('  GAGAL ' + nama + ': seharusnya ditolak'); }
  catch (e) { if (pola && !pola.test(e.message)) { gagal++; console.log('  GAGAL ' + nama + ': pesan tak terduga: ' + e.message); } else { lulus++; console.log('  ok  ' + nama + ' (ditolak: ' + e.message.slice(0, 70) + ')'); } }
}
const c = ctx;
let T, adm;
console.log('== penyiapan dan akun');
uji('status awal + setup', () => JSON.stringify(c.apiStatusAwal()).slice(0, 60));
uji('tab dibuat', () => SS.getSheets().map(s => s.name).join(','));
adm = uji('buat admin', () => { const b = c.apiBuatAdmin('Admin Uji', 'admin', 'rahasia123'); T = b.token; return b.user.peran + ' modul=' + Object.keys(b.modul).length; });
harusGagal('login sandi salah', () => c.apiMasuk('admin', 'salah'), /salah/);
uji('login ulang', () => { T = c.apiMasuk('admin', 'rahasia123').token; return 'token ok'; });
uji('sesi', () => c.apiSesi(T).user.username);
uji('sesi bertahan saat cache dikosongkan Google', () => { Object.keys(cacheStore).filter(k => k.startsWith('sesi_')).forEach(k => delete cacheStore[k]); return c.apiSesi(T).user.username; });
uji('sesi kedaluwarsa dibuang saat masuk', () => { propStore['sesi_' + 'b'.repeat(64)] = 'u|1'; c.apiMasuk('admin', 'rahasia123'); return propStore['sesi_' + 'b'.repeat(64)] === undefined ? 'dibuang' : (() => { throw new Error('masih ada'); })(); });
uji('simpan pengaturan', () => c.apiPengaturanSimpan(T, { nama_sekolah: 'SMP Uji', jenjang: 'SMP', kota: 'Kota Contoh', kode_unit_kerja: 'TU', format_nomor: '{kode}/{urut}/{jenis}/{unit}/{bulan}/{tahun}', nama_kepala_sekolah: 'Kepala Uji', nip_kepala_sekolah: '1970' }));
harusGagal('format nomor tanpa {urut}', () => c.apiPengaturanSimpan(T, { nama_sekolah: 'SMP Uji', jenjang: 'SMP', format_nomor: '{kode}/{tahun}' }), /urut/);
uji('pengaturan terbaca', () => c.apiPengaturanAmbil(T).format_nomor);

console.log('== master surat');
uji('kode bawaan', () => c.apiList(T, 'kode_klasifikasi').length + ' kode');
uji('jenis bawaan', () => c.apiList(T, 'jenis_surat').length + ' jenis');
uji('muat daftar awal (tidak duplikat)', () => JSON.stringify(c.apiMuatStandar(T, 'kode_klasifikasi')));

console.log('== surat keluar');
const sk = uji('tambah draft surat tugas', () => c.apiSimpan(T, 'surat_keluar', { tanggal_surat: '2026-10-01', jenis_surat: 'Surat Tugas', kode_klasifikasi: '424', perihal: 'Bimtek', tujuan: 'Guru', daftar_orang: 'Ani | 123 | III/a | Guru | Kota Contoh, 01 Januari 1990', acara_tanggal: '2026-10-05', acara_tanggal_selesai: '2026-10-06', sertakan_sppd: 'Ya' }, 40).id);
harusGagal('jenis surat tak dikenal', () => c.apiSimpan(T, 'surat_keluar', { tanggal_surat: '2026-10-01', jenis_surat: 'Surat Ngawur', kode_klasifikasi: '424', perihal: 'x', tujuan: 'y' }), /tidak ada di daftar/);
uji('terbitkan (format sekolah)', () => c.apiAksi(T, 'surat_keluar', 'terbitkan', sk).nomor_surat);
const sk2 = uji('surat kedua', () => c.apiSimpan(T, 'surat_keluar', { tanggal_surat: '2026-10-02', jenis_surat: 'Surat Undangan', kode_klasifikasi: '005', perihal: 'Rapat', tujuan: 'Ortu' }).id);
uji('nomor kedua berurutan', () => c.apiAksi(T, 'surat_keluar', 'terbitkan', sk2).nomor_surat);
harusGagal('terbitkan dua kali', () => c.apiAksi(T, 'surat_keluar', 'terbitkan', sk2), /sudah bernomor/);
uji('ubah surat terbit (field terkunci aman)', () => c.apiSimpan(T, 'surat_keluar', { id: sk2, perihal: 'Rapat orang tua' }).perihal);
uji('batalkan', () => c.apiAksi(T, 'surat_keluar', 'batalkan', sk2).status);
uji('daftar surat via cache', () => c.apiList(T, 'surat_keluar').map(r => r.nomor_surat + ':' + r.status).join(', '));

console.log('== siswa, pegawai, impor');
uji('jenjang SMP -> tingkat 7-9', () => c.apiSesi(T).modul.siswa.field.find(f => f.k === 'tingkat').opsi.join(','));
const sw = uji('tambah siswa', () => c.apiSimpan(T, 'siswa', { nama: 'Budi', jenis_kelamin: 'L', tanggal_lahir: '2012-05-01', kelas_saat_ini: '7A', tingkat: '7', status: 'Aktif', nisn: '0012345678' }, 30).no_induk);
harusGagal('NISN ganda', () => c.apiSimpan(T, 'siswa', { nama: 'Ganda', jenis_kelamin: 'P', tanggal_lahir: '2012-01-01', kelas_saat_ini: '7B', status: 'Aktif', nisn: '0012345678' }), /sudah dipakai/);
uji('impor 150 siswa', () => { const rows = Array.from({ length: 150 }, (_, i) => ({ _baris: i + 2, nama: 'Siswa ' + i, jenis_kelamin: i % 2 ? 'P' : 'L', tanggal_lahir: '2012-02-0' + (1 + i % 9), kelas_saat_ini: (7 + i % 3) + 'A', tingkat: String(7 + i % 3), nisn: '00' + (90000000 + i), agama: 'Islam' })); const r = c.apiImpor(T, 'siswa', rows); return r.ok + ' masuk, ' + r.gagal.length + ' gagal'; });
uji('catat impor', () => c.apiCatatImpor(T, 'siswa', 150, 12));
uji('ubah status siswa -> tanggal keluar otomatis', () => { const id = c.apiList(T, 'siswa')[0].id; const r = c.apiSimpan(T, 'siswa', { id, status: 'Pindah' }); return r.status + ' ' + r.tanggal_keluar; });
uji('tambah pegawai', () => c.apiSimpan(T, 'pegawai', { nama: 'Guru A', jenis_kelamin: 'P', jabatan: 'Guru', kategori: 'Guru', status: 'Aktif', status_kepegawaian: 'PPPK Paruh Waktu', pangkat_golongan: 'IX' }).nama);
uji('hapus pegawai', () => { const id = c.apiList(T, 'pegawai')[0].id; c.apiHapus(T, 'pegawai', id); return c.apiList(T, 'pegawai').length + ' tersisa'; });

console.log('== inventaris');
uji('tambah ruang', () => c.apiSimpan(T, 'ruang', { nama_ruang: 'Lab Komputer', jenis_ruang: 'Laboratorium Komputer', kondisi_ruang: 'Baik' }).nama_ruang);
uji('tambah barang (total otomatis)', () => c.apiSimpan(T, 'aset', { nama_barang: 'PC', ruang: 'Lab Komputer', kategori: 'Peralatan TIK', jml_baik: '10', jml_rusak_ringan: '2', jml_rusak_berat: '1' }).jumlah);
harusGagal('barang di ruang tak dikenal', () => c.apiSimpan(T, 'aset', { nama_barang: 'X', ruang: 'Gudang Hantu', jml_baik: '1', jml_rusak_ringan: '0', jml_rusak_berat: '0' }), /tidak ada di daftar/);
uji('ganti nama ruang ikut ke barang', () => { const r = c.apiList(T, 'ruang')[0]; c.apiSimpan(T, 'ruang', { id: r.id, nama_ruang: 'Lab TIK' }); return c.apiList(T, 'aset')[0].ruang; });
harusGagal('hapus ruang berisi barang', () => c.apiHapus(T, 'ruang', c.apiList(T, 'ruang')[0].id), /masih berisi/);

console.log('== laporan, akun, peran');
uji('beranda: lini waktu tanpa login', () => { const a = c.apiBeranda(T).aktivitas; if (!a.length || a.some(x => x.modul === 'auth')) throw new Error(JSON.stringify(a)); return a.length + ' kegiatan, terbaru ' + a[0].modul + '|' + a[0].aksi; });
uji('beranda', () => { const b = c.apiBeranda(T); return 'siswa aktif ' + b.siswa.aktif + ', barang ' + b.aset.unit + ' unit'; });
uji('dampak', () => { const d = c.apiDampak(T, 30); return d.kegiatan.map(k => k.id + '=' + k.jumlah).join(' ') + ' | ganda ' + d.surat.ganda; });
uji('simpan waktu manual', () => JSON.stringify(c.apiBaselineSimpan(T, { surat_keluar: 10, orang: 3 })));
uji('tambah operator', () => c.apiPenggunaSimpan(T, { nama: 'Op', username: 'operator', peran: 'Operator', sandi: 'rahasia123' }));
uji('hak akses', () => { const p = c.apiPeranAmbil(T); c.apiPeranSimpan(T, p.matriks); return p.modul.length + ' modul'; });
let TO;
uji('login operator', () => { TO = c.apiMasuk('operator', 'rahasia123').token; return 'ok'; });
harusGagal('operator tidak boleh hapus', () => c.apiHapus(TO, 'siswa', c.apiList(TO, 'siswa')[0].id), /izin/);
harusGagal('operator tidak boleh ubah kode', () => c.apiSimpan(TO, 'kode_klasifikasi', { kode: '999', nama: 'x' }), /izin|Admin/);
harusGagal('token palsu', () => c.apiList('x'.repeat(64), 'siswa'), /SESI_HABIS/);
uji('ganti sandi sendiri', () => c.apiUbahSandiSaya(TO, 'rahasia123', 'rahasia456'));
uji('keluar', () => c.apiKeluar(T));
harusGagal('token setelah keluar ditolak (cache + cadangan)', () => c.apiSesi(T), /SESI_HABIS/);

console.log('== tab penuh (lebih dari 1.000 baris)');
uji('simpan saat tab sudah penuh menambah baris + format', () => { T = c.apiMasuk('admin', 'rahasia123').token; const s = SS.getSheetByName('Pegawai'); s.maxRows = s.getLastRow(); c.apiSimpan(T, 'pegawai', { nama: 'Pegawai Baris Baru', jenis_kelamin: 'P', jabatan: 'Staf', kategori: 'Tenaga Kependidikan', status: 'Aktif' }); if (!s.salinFormat) throw new Error('format tidak disalin'); return 'maks baris ' + s.maxRows; });
uji('impor saat tab penuh', () => { const s = SS.getSheetByName('Pegawai'); s.maxRows = s.getLastRow(); const r = c.apiImpor(T, 'pegawai', [1, 2, 3].map(i => ({ nama: 'Impor ' + i, jenis_kelamin: 'L', jabatan: 'Guru Mapel', kategori: 'Guru', status: 'Aktif' }))); if (r.ok !== 3) throw new Error(JSON.stringify(r)); return r.ok + ' masuk'; });

console.log('== penandatangan (NIP)');
uji('kosong -> kepala sekolah', () => { const t = c.penandatangan_({}, c.pengaturan_()); return t.nama + ' / NIP ' + t.nip + ' / ' + t.jabatan; });
uji('nama kepala ditulis beda gaya -> tetap NIP kepala', () => c.penandatangan_({ penandatangan: '  kepala   UJI ' }, c.pengaturan_()).nip);
uji('pegawai lain -> NIP dari data pegawai', () => { T = c.apiMasuk('admin', 'rahasia123').token; c.apiSimpan(T, 'pegawai', { nama: 'Wakasek Satu', jenis_kelamin: 'L', jabatan: 'Wakil Kepala Sekolah', kategori: 'Guru', status: 'Aktif', nip_nuptk: '198001' }); const t = c.penandatangan_({ penandatangan: 'wakasek satu' }, c.pengaturan_()); return t.nip + ' / ' + t.jabatan; });

console.log('== cetak PDF (isi dokumen)');
const isiDok = () => dokTerakhir.teks.join(' | ');
T = c.apiMasuk('admin', 'rahasia123').token;
uji('surat umum: NIP kepala ikut', () => { const id = c.apiSimpan(T, 'surat_keluar', { tanggal_surat: '2026-10-03', jenis_surat: 'Surat Keluar Umum', kode_klasifikasi: '000', perihal: 'Uji NIP', tujuan: 'Siapa saja', isi_ringkas: 'Isi uji' }).id; c.apiAksi(T, 'surat_keluar', 'terbitkan', id); c.apiAksi(T, 'surat_keluar', 'cetak', id); const t = isiDok(); if (!/NIP\. 1970/.test(t)) throw new Error('NIP tidak ada. Isi: ' + t.slice(-300)); return 'ada "NIP. 1970"'; });
uji('surat tugas + SPPD: NIP kepala ikut', () => { c.apiAksi(T, 'surat_keluar', 'cetak', c.apiList(T, 'surat_keluar').find(r => r.jenis_surat === 'Surat Tugas').id); const t = isiDok(); const n = (t.match(/NIP\. 1970/g) || []).length; if (!n) throw new Error('NIP tidak ada. Isi: ' + t.slice(0, 400)); return n + ' kali muncul, halaman: ' + ((t.match(/halaman baru/g) || []).length + 1); });
uji('bukti nomor', () => { c.apiAksi(T, 'surat_keluar', 'bukti', c.apiList(T, 'surat_keluar')[0].id); return /BUKTI PENGELUARAN/.test(isiDok()) ? 'ok' : 'judul hilang'; });
uji('buku induk siswa', () => { c.apiAksi(T, 'siswa', 'induk', c.apiList(T, 'siswa')[1].id); const t = isiDok(); if (!/NIP\. 1970/.test(t)) throw new Error('NIP hilang: ' + t.slice(-200)); return 'ok'; });
uji('buku induk pegawai', () => { c.apiAksi(T, 'pegawai', 'induk', c.apiList(T, 'pegawai')[0].id); return /BUKU INDUK PEGAWAI/.test(isiDok()) ? 'ok' : 'judul hilang'; });
uji('surat keterangan siswa', () => { c.apiAksi(T, 'siswa', 'keterangan', c.apiList(T, 'siswa')[1].id, { nomor: '422/1', keperluan: 'beasiswa' }); return /beasiswa/.test(isiDok()) ? 'ok' : 'keperluan hilang'; });
uji('KIR', () => { c.apiAksi(T, 'ruang', 'kir', c.apiList(T, 'ruang')[0].id); return /KARTU INVENTARIS/.test(isiDok()) ? 'ok' : 'judul hilang'; });

console.log('== folder aplikasi');
uji('PDF masuk ke Hasil Cetak/<jenis>', () => { const f = Object.values(ctx.__folder.folderMap); const akar = f.find(x => /^Tata Usaha - /.test(x.nama)); const hasil = akar.anak.find(x => x.nama === 'Hasil Cetak'); return akar.nama + ' / ' + hasil.anak.map(x => x.nama + '(' + (x.berkas || []).length + ')').join(', '); });
uji('rapikan berkas lama', () => { c.apiRapikanFolder(T); const akar = Object.values(ctx.__folder.folderMap).find(x => /^Tata Usaha - /.test(x.nama)); return akar.anak.map(x => x.nama).join(', ') + ' | Sheet dipindah: ' + ctx.__folder.pindahan.some(x => /file SS1/.test(x)); });
console.log('== kinerja');
uji('panggilan zona waktu (seharusnya sedikit)', () => panggilanZona + ' kali');
uji('kunci cache modul', () => Object.keys(cacheStore).filter(k => k.startsWith('modul_')).length + ' kunci');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
