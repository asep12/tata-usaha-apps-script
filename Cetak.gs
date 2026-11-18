/**
 * CETAK PDF. Dokumen dibangun langsung (Google Docs sementara -> PDF -> folder Drive) mengikuti format TU yang sudah
 * dipakai nyata (lihat reference/SPEC-template-surat-cetak.md). Kop, logo, dan identitas diambil dari menu Sekolah.
 */

var UKURAN_KERTAS = { A4: [595.28, 841.89], A4L: [841.89, 595.28], FOLIO: [609.45, 935.43] };
var CM = 28.35;
var _ukuran = 12;   // ukuran huruf dasar; dokumen padat (paket surat tugas) memakai 11 atau 10
var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/* ---------- format nilai ---------- */

function fmt_(v) {
  if (v === null || v === undefined) return '';
  if (isTanggal_(v)) return tglIndo_(v);
  var s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return tglIndo_(Utilities.parseDate(s, tz_(), 'yyyy-MM-dd'));
  return s;
}
function isoKeTgl_(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? Utilities.parseDate(iso, tz_(), 'yyyy-MM-dd') : null; }
function tglPanjang_(iso) { var d = isoKeTgl_(iso); return d ? tglIndo_(d) : ''; }
function hariDari_(iso) { var d = isoKeTgl_(iso); return d ? HARI_ID[Number(Utilities.formatDate(d, tz_(), 'u')) % 7] : ''; }
function rentangTanggal_(a, b) { var x = tglPanjang_(a), y = tglPanjang_(b); return !x ? '' : (y && b !== a ? x + ' s.d ' + y : x); }
function rentangHari_(a, b) { var x = hariDari_(a), y = hariDari_(b); return !x ? '' : (y && b !== a && y !== x ? x + ' s.d ' + y : x); }
function jk_(v) { return v === 'L' ? 'Laki-laki' : v === 'P' ? 'Perempuan' : (v || ''); }
function gabung_(arr, pemisah) { return arr.some(function (x) { return String(x || '').trim(); }) ? arr.map(function (x) { return String(x || '').trim() || '-'; }).join(pemisah) : ''; }
function namaBerkas_(s) { return String(s).replace(/[\\\/:*?"<>|]/g, '-'); }
function baris_(teks) { return String(teks || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
function titik_(n) { return new Array(n + 1).join('.'); }

function jabatanKepala_(p) { return ((p.status_kepala_sekolah || '') + ' Kepala Sekolah').trim(); }
function jabatanKepalaUnit_(p) { return ((p.status_kepala_sekolah || '') + ' Kepala ' + (p.nama_sekolah || '')).trim(); }
function kotaTanggal_(p, iso) { return (p.kota ? p.kota + ', ' : '') + (iso ? tglPanjang_(iso) : tglIndo_(new Date())); }

// penanda tangan surat keluar: kosong = kepala sekolah (dari menu Sekolah)
// Nama dicocokkan longgar (tanpa spasi, tanda baca, huruf besar/kecil) supaya "Edi Ruspandi, S.Pd" dan "edi ruspandi s.pd"
// dianggap kepala sekolah yang sama. Penandatangan lain: NIP dan jabatan diambil dari isian surat, lalu dari data pegawai.
function samaNama_(a, b) { return String(a || '').toLowerCase().replace(/[^a-z0-9]/g, '') === String(b || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function penandatangan_(s, p) {
  var nama = String(s.penandatangan || '').trim();
  var kepala = { nama: p.nama_kepala_sekolah, nip: p.nip_kepala_sekolah, jabatan: jabatanKepala_(p), jabatanUnit: jabatanKepalaUnit_(p) };
  if (!nama || samaNama_(nama, p.nama_kepala_sekolah)) return kepala;
  var peg = null;
  try { peg = daftarModul_('pegawai').filter(function (r) { return samaNama_(r.nama, nama); })[0] || null; } catch (e) { peg = null; }
  var jab = String(s.jabatan_penandatangan || '').trim() || (peg && peg.jabatan) || '';
  var nip = String(s.nip_penandatangan || '').trim() || (peg && peg.nip_nuptk) || '';
  if (peg && /kepala sekolah/i.test(peg.kategori || '') && !String(s.jabatan_penandatangan || '').trim()) jab = jabatanKepala_(p);
  return { nama: nama, nip: nip, jabatan: jab, jabatanUnit: jab ? jab + ' ' + (p.nama_sekolah || '') : nama };
}

/* ---------- pembangun dokumen ---------- */

function dokBaru_(judul, kertas, marginCm) {
  var doc = DocumentApp.create(judul);
  var body = doc.getBody();
  var uk = UKURAN_KERTAS[kertas || 'A4'];
  var m = marginCm || [2, 2, 2, 2.5];   // atas, kanan, bawah, kiri (kiri lebih lebar untuk lubang arsip)
  body.setPageWidth(uk[0]).setPageHeight(uk[1]);
  body.setMarginTop(m[0] * CM).setMarginRight(m[1] * CM).setMarginBottom(m[2] * CM).setMarginLeft(m[3] * CM);
  body.clear();
  return { doc: doc, body: body, lebar: uk[0] - (m[1] + m[3]) * CM };
}

function selesaiPdf_(d, nama, kategori) {
  var body = d.body;
  try {
    var c0 = body.getChild(0);
    var kosong = c0.getType() === DocumentApp.ElementType.PARAGRAPH && c0.asParagraph().getText() === '';
    if (kosong) for (var i = 0; i < c0.asParagraph().getNumChildren(); i++) if (c0.asParagraph().getChild(i).getType() === DocumentApp.ElementType.INLINE_IMAGE) kosong = false;
    if (kosong && body.getNumChildren() > 1) body.removeChild(c0);   // paragraf kosong bawaan dokumen baru
  } catch (e) { /* biarkan */ }
  body.editAsText().setFontFamily('Times New Roman');
  d.doc.saveAndClose();
  var f = DriveApp.getFileById(d.doc.getId());
  try {
    var folder = kategori ? folderCetak_(kategori) : DriveApp.getFolderById(dapatkanFolder_());
    var file = folder.createFile(f.getAs('application/pdf').setName(nama + '.pdf'));
    return { nama: nama + '.pdf', url: file.getUrl() };
  } finally {
    f.setTrashed(true);
  }
}

var RATA = function () {
  var A = DocumentApp.HorizontalAlignment;
  return { tengah: A.CENTER, kanan: A.RIGHT, kiri: A.LEFT, penuh: A.JUSTIFY };
};

// Google Docs menolak sisipan teks kosong ("Cannot insert an empty text element"), jadi teks kosong diganti spasi.
function aman_(t) { t = t === undefined || t === null ? '' : String(t); return t === '' ? ' ' : t; }
function selAman_(rows) { return rows.map(function (r) { return r.map(aman_); }); }

// paragraf baru di wadah (Body atau TableCell)
function p_(w, teks, o) {
  o = o || {};
  var par = w.appendParagraph(aman_(teks));
  gayaParagraf_(par, teks, o);
  return par;
}
function gayaParagraf_(par, teks, o) {
  par.setAlignment(RATA()[o.rata || 'kiri']);
  par.setSpacingBefore(o.sebelum || 0).setSpacingAfter(o.sesudah || 0).setLineSpacing(o.spasi || 1.15);
  par.setIndentStart(o.indent || 0).setIndentFirstLine(o.indentAwal !== undefined ? o.indentAwal : (o.indent || 0));
  if (teks) {
    par.editAsText().setBold(!!o.tebal).setUnderline(!!o.garis).setItalic(!!o.miring)
      .setFontSize(o.ukuran || _ukuran).setForegroundColor(o.warna || '#000000');
  }
  return par;
}

// isi sel tabel: baris = [[teks, opsi], ...]
function isiSel_(sel, baris, rata) {
  var pertama = sel.getChild(0).asParagraph();
  baris.forEach(function (b, i) {
    var o = b[1] || {};
    o.rata = o.rata || rata;
    var par;
    if (i === 0) { if (b[0]) pertama.setText(b[0]); par = pertama; }   // setText tidak mengembalikan paragrafnya
    else par = sel.appendParagraph(aman_(b[0]));
    gayaParagraf_(par, b[0], o);
  });
  sel.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(2).setPaddingRight(2);
}

function blob_(id) { if (!id) return null; try { return DriveApp.getFileById(id).getBlob(); } catch (e) { return null; } }

function gambarSel_(sel, b, lebar) {
  if (!b) return;
  var par = sel.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var img = par.appendInlineImage(b);
  img.setHeight(Math.round(img.getHeight() * lebar / img.getWidth())).setWidth(lebar);
}

// tabel keterangan "Label : isi" tanpa garis. semua=true menampilkan baris kosong juga (dipakai buku induk).
function tabelInfo_(w, rows, lebarLabel, lebarTotal, semua) {
  rows = rows.filter(function (r) { return r && (semua || String(r[1] === undefined || r[1] === null ? '' : r[1]).trim() !== ''); });
  if (!rows.length) return null;
  var t = w.appendTable(selAman_(rows.map(function (r) { return [r[0], ':', r[1]]; })));
  t.setBorderWidth(0);
  t.setColumnWidth(0, lebarLabel).setColumnWidth(1, 10).setColumnWidth(2, Math.max(60, lebarTotal - lebarLabel - 10));
  rows.forEach(function (r, i) {
    for (var c = 0; c < 3; c++) {
      var sel = t.getCell(i, c);
      sel.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(4);
      sel.editAsText().setFontSize(_ukuran).setBold(c === 2 && !!(r[2] && r[2].tebal));
    }
  });
  return t;
}

// tabel berbingkai dengan kepala abu-abu
function tabelBingkai_(w, kepala, rows, ukuranHuruf) {
  var t = w.appendTable(selAman_([kepala].concat(rows)));
  t.setBorderWidth(0.75);
  for (var r = 0; r < rows.length + 1; r++) for (var c = 0; c < kepala.length; c++) {
    var sel = t.getCell(r, c);
    sel.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(4).setPaddingRight(4);
    sel.editAsText().setFontSize(ukuranHuruf || 11);
    if (r === 0) { sel.setBackgroundColor('#e8e8e8'); sel.editAsText().setBold(true); }
  }
  return t;
}

function daftarBernomor_(w, judul, isi, o) {
  var items = baris_(isi);
  if (!items.length) return;
  o = o || {};
  if (judul) p_(w, judul, { sebelum: o.sebelum === undefined ? 6 : o.sebelum });
  items.forEach(function (x, i) { p_(w, (o.huruf ? String.fromCharCode(97 + (i % 26)) : (i + 1)) + '. ' + x, { indent: 36, indentAwal: 18, rata: 'penuh' }); });
}

function paragrafIsi_(w, teks) {
  baris_(teks).forEach(function (b) { p_(w, b, { rata: 'penuh', indentAwal: 36, sesudah: 4 }); });
}

/* ---------- kop surat ---------- */

// gaya: 'A' (1 logo, surat umum), 'B' (2 logo, surat tugas & laporan), 'sederhana' (buku induk), 'mini' (bukti nomor)
function kop_(d, gaya, p, w, lebar) {
  w = w || d.body; lebar = lebar || d.lebar;
  var A = DocumentApp.HorizontalAlignment;
  if ((gaya === 'A' || gaya === 'B') && p.kop_drive_file_id) {
    var kb = blob_(p.kop_drive_file_id);
    if (kb) {
      var par = w.appendParagraph(' ').setAlignment(A.CENTER);
      var img = par.appendInlineImage(kb);
      img.setHeight(Math.round(img.getHeight() * lebar / img.getWidth())).setWidth(Math.round(lebar));
      return;
    }
  }
  if (gaya === 'sederhana') {
    p_(w, String(p.nama_sekolah || '').toUpperCase(), { rata: 'tengah', tebal: true, ukuran: 16 });
    if (p.alamat) p_(w, p.alamat, { rata: 'tengah', ukuran: 10 });
    if (p.npsn) p_(w, 'NPSN: ' + p.npsn, { rata: 'tengah', ukuran: 10 });
    w.appendHorizontalRule();
    return;
  }
  if (gaya === 'mini') {
    var lb = blob_(p.logo_drive_file_id);
    if (lb) { var pl = w.appendParagraph(' ').setAlignment(A.CENTER); var im = pl.appendInlineImage(lb); im.setHeight(Math.round(im.getHeight() * 40 / im.getWidth())).setWidth(40); }
    p_(w, String(p.nama_sekolah || '').toUpperCase(), { rata: 'tengah', tebal: true, ukuran: 12 });
    if (p.alamat) p_(w, p.alamat, { rata: 'tengah', ukuran: 9, sesudah: 6 });
    return;
  }
  var lebarLogo = 62;
  var t = w.appendTable([[' ', ' ', ' ']]);
  t.setBorderWidth(0);
  t.setColumnWidth(0, lebarLogo).setColumnWidth(2, lebarLogo).setColumnWidth(1, Math.max(120, lebar - 2 * lebarLogo));
  var c0 = t.getCell(0, 0), c1 = t.getCell(0, 1), c2 = t.getCell(0, 2);
  [c0, c1, c2].forEach(function (c) { c.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER); });
  gambarSel_(c0, blob_(p.logo_drive_file_id), 58);
  if (gaya === 'B') gambarSel_(c2, blob_(p.logo_kanan_drive_file_id), 58);
  var teks = [];
  if (p.nama_pemerintah) teks.push([String(p.nama_pemerintah).toUpperCase(), { tebal: true, ukuran: 13 }]);
  if (p.nama_dinas) teks.push([String(p.nama_dinas).toUpperCase(), { tebal: true, ukuran: 13 }]);
  teks.push([String(p.nama_sekolah || '').toUpperCase(), { tebal: true, ukuran: gaya === 'B' ? 18 : 15 }]);
  if (p.alamat) teks.push([p.alamat, { ukuran: 10 }]);
  if (gaya === 'B' && p.kontak_web_email) teks.push([p.kontak_web_email, { ukuran: 10, warna: '#1155cc', garis: true }]);
  isiSel_(c1, teks, 'tengah');
  w.appendHorizontalRule();
}

/* ---------- tanda tangan (tabel 2 kolom; kolom kanan rata tengah) ---------- */

function ttd_(d, o, w, lebar) {
  w = w || d.body; lebar = lebar || d.lebar;
  p_(w, '', {});
  var t = w.appendTable([[' ', ' ']]);
  t.setBorderWidth(0);
  t.setColumnWidth(0, lebar / 2).setColumnWidth(1, lebar / 2);
  var kanan = [];
  (o.atas || []).forEach(function (x) { kanan.push([x, { rata: 'kiri' }]); });
  if (o.tanggal) kanan.push([o.tanggal, {}]);
  if (o.atasJabatan) kanan.push([o.atasJabatan, {}]);
  kanan.push([o.jabatan ? o.jabatan + ',' : '', {}]);
  for (var i = 0; i < (o.kosong || 4); i++) kanan.push(['', {}]);
  kanan.push([o.nama || '', { tebal: true, garis: true }]);
  if (o.nip !== false) kanan.push([o.nip ? 'NIP. ' + o.nip : 'NIP.', {}]);
  isiSel_(t.getCell(0, 1), kanan, 'tengah');
  isiSel_(t.getCell(0, 0), o.kiri || [['', {}]], 'tengah');
  return t;
}

/* ---------- surat keluar ---------- */

function cetakSuratKeluar_(id, user) {
  var s = cariBaris_('surat_keluar', id);
  if (!s.nomor_surat) throw new Error('Surat belum bernomor. Terbitkan dulu.');
  if (s.status === 'Dibatalkan') throw new Error('Surat ini berstatus Dibatalkan.');
  var p = pengaturan_();
  if (!p.nama_sekolah) throw new Error('Isi dulu data sekolah di menu Sekolah.');
  var ctx = konteksSurat_(s, p);
  var nama = (s.jenis_surat || 'Surat Keluar') + ' ' + namaBerkas_(s.nomor_surat);
  var hasil = ctx.layout === 'tugas' ? dokSuratTugas_(s, p, ctx, nama) : dokSuratKeluar_(s, p, ctx, nama);
  catatPdf_('surat_keluar', id, hasil.url);
  return hasil;
}

function konteksSurat_(s, p) {
  var j = daftarModul_('jenis_surat').filter(function (r) { return r.nama === s.jenis_surat; })[0];
  var k = daftarModul_('kode_klasifikasi').filter(function (r) { return r.kode === s.kode_klasifikasi; })[0];
  var terkait = baris_(s.pegawai_terkait).concat(baris_(s.siswa_terkait)).map(function (x) { return x.replace(/\s*\(.*\)\s*$/, ''); });
  return {
    layout: (j && LAYOUT_KUNCI[j.layout]) || 'umum', jenis: j,
    klasifikasi: s.kode_klasifikasi ? s.kode_klasifikasi + (k ? ' — ' + k.nama : '') : '',
    kepada: s.tujuan || terkait.join(', '),
    ttd: penandatangan_(s, p)
  };
}

function judulDok_(w, teks, nomor, ukuran) {
  p_(w, String(teks || '').toUpperCase(), { rata: 'tengah', tebal: true, garis: true, ukuran: ukuran || 13, sebelum: 8 });
  if (nomor) p_(w, 'Nomor: ' + nomor, { rata: 'tengah', sesudah: 10 });
}

function dokSuratKeluar_(s, p, ctx, nama) {
  var d = dokBaru_(nama, 'A4');
  var w = d.body, L = ctx.layout;
  kop_(d, 'A', p);
  if (L === 'edaran') {
    judulDok_(w, s.jenis_surat || 'Surat Edaran', s.nomor_surat);
    p_(w, 'TENTANG', { rata: 'tengah', tebal: true });
    p_(w, String(s.perihal || '').toUpperCase(), { rata: 'tengah', tebal: true, sesudah: 10 });
    tabelInfo_(w, [['Kepada Yth.', ctx.kepada], ['Tanggal', tglPanjang_(s.tanggal_surat)], ['Klasifikasi', ctx.klasifikasi]], 83, d.lebar);
  } else if (L === 'keputusan') {
    p_(w, ('KEPUTUSAN ' + ctx.ttd.jabatanUnit).toUpperCase(), { rata: 'tengah', tebal: true, sebelum: 8 });
    p_(w, 'NOMOR ' + s.nomor_surat, { rata: 'tengah' });
    p_(w, 'TENTANG', { rata: 'tengah', tebal: true });
    p_(w, String(s.perihal || '').toUpperCase(), { rata: 'tengah', tebal: true, sesudah: 10 });
  } else if (L === 'nota') {
    judulDok_(w, s.jenis_surat || 'Nota Dinas', s.nomor_surat);
    tabelInfo_(w, [['Kepada Yth.', ctx.kepada], ['Dari', s.dari], ['Sifat', s.sifat !== 'Biasa' ? s.sifat : ''], ['Lampiran', s.lampiran], ['Hal', s.perihal], ['Tanggal', tglPanjang_(s.tanggal_surat)]], 83, d.lebar);
    w.appendHorizontalRule();
  } else {
    // format umum (dipakai juga undangan dan keterangan): judul = nama jenis surat, nomor, tabel info
    judulDok_(w, s.jenis_surat || 'Surat', s.nomor_surat);
    tabelInfo_(w, [['Perihal', s.perihal], ['Kepada Yth.', ctx.kepada], ['Tanggal', tglPanjang_(s.tanggal_surat)], ['Klasifikasi', ctx.klasifikasi],
      ['Sifat', s.sifat !== 'Biasa' ? s.sifat : ''], ['Lampiran', s.lampiran]], 83, d.lebar);
  }
  p_(w, '', {});
  if (L === 'keterangan') {
    p_(w, 'Yang bertanda tangan di bawah ini, ' + ctx.ttd.jabatanUnit + ', menerangkan bahwa:', { rata: 'penuh', sesudah: 4 });
    tabelInfo_(w, baris_(s.identitas).map(function (b) { var i = b.indexOf(':'); return i > 0 ? [b.slice(0, i).trim(), b.slice(i + 1).trim()] : ['', b]; }), 128, d.lebar);
    p_(w, '', {});
  }
  if (L === 'keputusan') {
    p_(w, 'Menimbang:', { tebal: true });
    daftarBernomor_(w, '', s.menimbang, { huruf: true, sebelum: 0 });
    p_(w, 'Mengingat:', { tebal: true, sebelum: 6 });
    daftarBernomor_(w, '', s.mengingat, { sebelum: 0 });
    p_(w, 'MEMUTUSKAN', { rata: 'tengah', tebal: true, sebelum: 8 });
    p_(w, 'Menetapkan:', { tebal: true });
    baris_(s.memutuskan).forEach(function (b) { p_(w, b, { rata: 'penuh', indent: 18, sesudah: 2 }); });
  } else {
    paragrafIsi_(w, s.isi_ringkas || 'Isi surat menyusul.');
  }
  if (L === 'undangan') {
    tabelInfo_(w, [['Hari', rentangHari_(s.acara_tanggal, s.acara_tanggal_selesai)], ['Tanggal', rentangTanggal_(s.acara_tanggal, s.acara_tanggal_selesai)],
      ['Waktu', s.acara_waktu], ['Tempat', s.acara_tempat], ['Acara', s.acara_agenda]], 83, d.lebar);
  }
  daftarBernomor_(w, 'Pegawai yang ditugaskan:', s.pegawai_terkait);
  daftarBernomor_(w, 'Siswa terkait:', s.siswa_terkait);
  ttd_(d, { tanggal: kotaTanggal_(p, s.tanggal_surat), jabatan: ctx.ttd.jabatan, nama: ctx.ttd.nama, nip: ctx.ttd.nip, atasJabatan: L === 'keputusan' ? 'Ditetapkan di ' + (p.kota || '') : '' });
  daftarBernomor_(w, 'Tembusan:', s.tembusan, { sebelum: 10 });
  return selesaiPdf_(d, nama, 'Surat Keluar');
}

// "Nama | NIP/No. Induk | Pangkat/Gol | Jabatan | Tempat, tanggal lahir" per baris (format lama 3 kolom tetap terbaca)
function urai_orang_(teks) {
  return baris_(teks).map(function (b) {
    var k = (b.indexOf('|') >= 0 ? b.split('|') : b.split(',')).map(function (x) { return x.trim(); });
    if (k.length === 3) return { nama: k[0], nomor: k[1], pangkat: '', jabatan: k[2], ttl: '' };
    return { nama: k[0] || '', nomor: k[1] || '', pangkat: k[2] || '', jabatan: k[3] || '', ttl: k.slice(4).join(', ') };
  });
}

// Surat Tugas: satu paket per orang (Surat Tugas + Laporan Kegiatan), dipisah halaman. Kertas folio.
function dokSuratTugas_(s, p, ctx, nama) {
  var orang = urai_orang_(s.daftar_orang);
  if (!orang.length) throw new Error('Isi daftar yang ditugaskan dulu (satu orang per baris).');
  var d = dokBaru_(nama, 'FOLIO');
  var w = d.body;
  _ukuran = 11;
  try {
  orang.forEach(function (o, i) {
    if (i > 0) w.appendPageBreak();
    // halaman 1: surat tugas
    kop_(d, 'B', p);
    judulDok_(w, 'Surat Tugas', s.nomor_surat, 18);
    p_(w, 'Yang bertandatangan di bawah ini ' + ctx.ttd.jabatanUnit + ', maka dengan ini memberikan tugas kepada:', { rata: 'penuh', sesudah: 6 });
    var siswa = /^siswa$/i.test(o.jabatan);
    tabelInfo_(w, [
      ['Nama', o.nama, { tebal: true }], ['Tempat dan Tanggal Lahir', o.ttl], [siswa ? 'No. Induk' : 'NIP', o.nomor], ['Pangkat/Golongan', o.pangkat],
      ['Jabatan', o.jabatan], ['Instansi', p.nama_sekolah], ['Acara', s.acara_agenda], ['Hari', rentangHari_(s.acara_tanggal, s.acara_tanggal_selesai)],
      ['Tanggal', rentangTanggal_(s.acara_tanggal, s.acara_tanggal_selesai)], ['Waktu', s.acara_waktu], ['Tempat', s.acara_tempat]
    ], 128, d.lebar);
    daftarBernomor_(w, 'Dasar:', s.dasar);
    if (s.isi_ringkas) { p_(w, '', {}); paragrafIsi_(w, s.isi_ringkas); }
    p_(w, 'Demikian agar dilaksanakan sesuai dengan tugas dan mohon laporan setelah melaksanakan kegiatan tersebut.', { rata: 'penuh', sebelum: 8 });
    ttd_(d, {
      tanggal: kotaTanggal_(p, s.tanggal_surat), jabatan: ctx.ttd.jabatan, nama: ctx.ttd.nama, nip: ctx.ttd.nip,
      kiri: [['Telah Mengikuti,', {}], ['', {}], ['', {}], ['', {}], ['', {}], ['', {}], ['( ' + titik_(40) + ' )', {}], ['NIP.', {}]]
    });
    // halaman 2: laporan kegiatan (diisi tangan setelah kegiatan)
    w.appendPageBreak();
    kop_(d, 'B', p);
    judulDok_(w, 'Laporan Kegiatan', '', 14);
    // dipadatkan (3 baris isian per bagian) supaya pas satu lembar folio
    p_(w, 'BULAN : ' + titik_(45), { sebelum: 4, sesudah: 2 });
    ['I. JENIS KEGIATAN', 'II. LATAR BELAKANG / DASAR HUKUM', 'III. TUJUAN KEGIATAN', 'IV. SASARAN KEGIATAN', 'V. JADWAL KEGIATAN', 'VI. HASIL KEGIATAN'].forEach(function (j) {
      p_(w, j, { tebal: true, sebelum: 5 });
      for (var k = 0; k < 3; k++) p_(w, titik_(150), { indent: 18, spasi: 1.3 });
    });
    ttd_(d, {
      jabatan: 'Pelaksana', nama: o.nama, nip: siswa ? false : o.nomor, kosong: 3,
      kiri: [['Mengetahui,', {}], [ctx.ttd.jabatan + ',', {}], ['', {}], ['', {}], ['', {}], [ctx.ttd.nama || '', { tebal: true, garis: true }], [ctx.ttd.nip ? 'NIP. ' + ctx.ttd.nip : 'NIP.', {}]]
    });
    if (s.sertakan_sppd === 'Ya') {
      w.appendPageBreak();
      halamanSppd1_(d, s, p, ctx, o, siswa);
      w.appendPageBreak();
      halamanSppd2_(d, s, p, ctx);
    }
  });
  } finally { _ukuran = 12; }
  return selesaiPdf_(d, nama, 'Surat Tugas');
}

function hitungHari_(a, b) {
  var x = isoKeTgl_(a), y = isoKeTgl_(b) || x;
  if (!x) return '';
  var n = Math.round((y.getTime() - x.getTime()) / 86400000) + 1;
  return n > 0 ? n + ' hari' : '';
}

// sel tabel berisi beberapa baris teks
function selBaris_(sel, baris, opsi) {
  isiSel_(sel, baris.map(function (b) { return typeof b === 'string' ? [b, opsi || {}] : b; }), (opsi && opsi.rata) || 'kiri');
  sel.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(4).setPaddingRight(4);
}

// SPPD halaman 1: tabel bernomor 1-9 berbingkai penuh
function halamanSppd1_(d, s, p, ctx, o, siswa) {
  var w = d.body;
  kop_(d, 'B', p);
  judulDok_(w, 'Surat Perintah Perjalanan Dinas ( SPPD )', s.nomor_surat, 14);
  var kembali = s.acara_tanggal_selesai || s.acara_tanggal;
  var isi = [
    ['1.', ['Pejabat berwenang yang memberi perintah'], [ctx.ttd.jabatanUnit]],
    ['2.', ['Nama pegawai yang diperintahkan', siswa ? 'No. Induk' : 'NIP'], [[o.nama, { tebal: true }], o.nomor || '-']],
    ['3.', ['a. Pangkat/Golongan', 'b. Jabatan/Instansi', 'c. Tingkat biaya perjalanan dinas'], ['a. ' + (o.pangkat || '-'), 'b. ' + [o.jabatan, p.nama_sekolah].filter(Boolean).join(' / '), 'c. ']],
    ['4.', ['Maksud perjalanan dinas'], [s.acara_agenda || '']],
    ['5.', ['Alat angkutan yang dipergunakan'], [s.alat_angkutan || '']],
    ['6.', ['a. Tempat berangkat', 'b. Tempat tujuan'], [['a. ' + (s.tempat_berangkat || p.kota || ''), { tebal: true }], 'b. ' + (s.acara_tempat || '')]],
    ['7.', ['a. Lamanya perjalanan dinas', 'b. Tanggal berangkat', 'c. Tanggal harus kembali'],
      ['a. ' + (s.lamanya_perjalanan || hitungHari_(s.acara_tanggal, kembali)), 'b. ' + tglPanjang_(s.acara_tanggal), 'c. ' + tglPanjang_(kembali)]],
    ['8.', ['Pembebanan anggaran', 'a. Instansi', 'b. Mata anggaran'], ['', 'a. ' + (s.pembebanan_instansi || ''), 'b. ' + (s.pembebanan_mata_anggaran || '')]],
    ['9.', ['Keterangan lain-lain'], [s.keterangan_sppd || '']]
  ];
  var t = w.appendTable(isi.map(function () { return [' ', ' ', ' ']; }));
  t.setBorderWidth(0.75);
  t.setColumnWidth(0, 26).setColumnWidth(1, (d.lebar - 26) * 0.45).setColumnWidth(2, (d.lebar - 26) * 0.55);
  isi.forEach(function (r, i) {
    selBaris_(t.getCell(i, 0), [r[0]], { rata: 'tengah' });
    selBaris_(t.getCell(i, 1), r[1]);
    selBaris_(t.getCell(i, 2), r[2]);
  });
  ttd_(d, { atas: ['Dikeluarkan di : ' + (p.kota || ''), 'Pada Tanggal : ' + tglPanjang_(s.tanggal_surat)], jabatan: ctx.ttd.jabatan, nama: ctx.ttd.nama, nip: ctx.ttd.nip, kosong: 3 });
}

// SPPD halaman 2: kartu perjalanan I-VIII. Teks baku disalin apa adanya dari format yang sudah dipakai.
var SPPD_DIPERIKSA = 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.';
var SPPD_PERHATIAN = 'Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, Para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila menderita rugi akibat kesalahan, kelalaian dan kealpaannya';

function halamanSppd2_(d, s, p, ctx) {
  var w = d.body;
  var ukuranAsal = _ukuran;
  _ukuran = 10;   // kartu perjalanan berisi 8 bagian: huruf 10 supaya pas satu lembar
  p_(w, 'SPPD halaman 2  ·  Nomor: ' + s.nomor_surat, { rata: 'kanan', miring: true, ukuran: 9, sesudah: 4 });
  var asal = s.tempat_berangkat || p.kota || '';
  var kembali = s.acara_tanggal_selesai || s.acara_tanggal;
  var kosong = titik_(28);
  var ttdPejabat = [[ctx.ttd.jabatan + ',', { rata: 'tengah' }], ['', {}], ['', {}], [ctx.ttd.nama || '', { rata: 'tengah', tebal: true, garis: true }], [ctx.ttd.nip ? 'NIP. ' + ctx.ttd.nip : 'NIP.', { rata: 'tengah' }]];
  var transit = function (romawi) {
    return [
      [romawi + '. Tiba di : ' + kosong, 'Pada Tanggal : ' + kosong, 'Kepala : ' + kosong, '', '( ' + titik_(30) + ' )', 'NIP.'],
      ['Berangkat dari : ' + kosong, 'Ke : ' + kosong, 'Pada Tanggal : ' + kosong, 'Kepala : ' + kosong, '', '( ' + titik_(30) + ' )', 'NIP.']
    ];
  };
  var t = w.appendTable([0, 1, 2, 3, 4, 5, 6, 7].map(function () { return [' ', ' ']; }));
  t.setBorderWidth(0.75);
  t.setColumnWidth(0, d.lebar / 2).setColumnWidth(1, d.lebar / 2);
  // I. berangkat dari tempat kedudukan, ditandatangani pejabat berwenang
  selBaris_(t.getCell(0, 0), ['']);
  isiSel_(t.getCell(0, 1), [['I. Berangkat dari : ' + asal + ' (Tempat Kedudukan)', {}], ['Ke : ' + (s.acara_tempat || ''), {}], ['Pada Tanggal : ' + tglPanjang_(s.acara_tanggal), {}]].concat(ttdPejabat), 'kiri');
  // II-V. transit, diisi tangan
  ['II', 'III', 'IV', 'V'].forEach(function (r, i) {
    var x = transit(r);
    selBaris_(t.getCell(i + 1, 0), x[0]);
    selBaris_(t.getCell(i + 1, 1), x[1]);
  });
  // VI. tiba kembali di tempat kedudukan
  selBaris_(t.getCell(5, 0), ['VI. Tiba di : ' + asal + ' (Tempat Kedudukan)', 'Pada Tanggal : ' + tglPanjang_(kembali)]);
  isiSel_(t.getCell(5, 1), [[SPPD_DIPERIKSA, { rata: 'penuh' }]].concat(ttdPejabat), 'kiri');
  // VII. catatan, VIII. perhatian: satu sel selebar tabel
  selBaris_(t.getCell(6, 0), ['VII. Catatan Lain-lain', s.keterangan_sppd || '']);
  selBaris_(t.getCell(7, 0), [['VIII. PERHATIAN :', { tebal: true }], [SPPD_PERHATIAN, { rata: 'penuh' }]]);
  [6, 7].forEach(function (r) { try { t.getCell(r, 1).merge(); } catch (e) { /* bila tidak bisa digabung, sel kanan dibiarkan kosong */ } });
  _ukuran = ukuranAsal;
}

// Bukti pengeluaran nomor surat: slip kecil di tengah halaman, untuk nomor yang diminta unit lain.
function cetakBuktiNomor_(id) {
  var s = cariBaris_('surat_keluar', id);
  if (!s.nomor_surat) throw new Error('Surat belum bernomor. Terbitkan dulu.');
  var p = pengaturan_();
  var ctx = konteksSurat_(s, p);
  var nama = 'Bukti Nomor ' + namaBerkas_(s.nomor_surat);
  var d = dokBaru_(nama, 'A4', [2, 4.1, 2, 4.1]);
  var luar = d.body.appendTable([[' ']]);
  luar.setBorderWidth(2);
  var sel = luar.getCell(0, 0);
  sel.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(12).setPaddingRight(12);
  var lebar = d.lebar - 24;
  kop_(d, 'mini', p, sel, lebar);
  p_(sel, 'BUKTI PENGELUARAN NOMOR SURAT', { rata: 'tengah', tebal: true, garis: true, sebelum: 4, sesudah: 8 });
  var kotak = sel.appendTable([[aman_(s.nomor_surat)]]);
  kotak.setBorderWidth(1);
  var ks = kotak.getCell(0, 0);
  ks.setPaddingTop(8).setPaddingBottom(8);
  gayaParagraf_(ks.getChild(0).asParagraph(), s.nomor_surat, { rata: 'tengah', tebal: true, ukuran: 18 });
  p_(sel, '', {});
  tabelInfo_(sel, [['Jenis Surat', s.jenis_surat + (ctx.jenis ? ' (' + ctx.jenis.singkatan + ')' : '')], ['Klasifikasi', ctx.klasifikasi], ['Perihal', s.perihal],
    ['Kepada', ctx.kepada], ['Tanggal', tglPanjang_(s.tanggal_surat)], ['Diminta oleh', s.unit_pemohon]], 83, lebar);
  p_(sel, 'Nomor di atas sudah tercatat resmi di sistem TU dan siap dipakai. Surat aslinya dibuat dan dicetak sendiri oleh unit peminta. Mohon serahkan salinan surat yang sudah jadi ke TU untuk diarsipkan.',
    { rata: 'penuh', miring: true, ukuran: 9, sebelum: 8 });
  ttd_(d, { tanggal: kotaTanggal_(p, ''), jabatan: 'Petugas TU', nama: '', nip: false }, sel, lebar);
  return selesaiPdf_(d, nama, 'Bukti Nomor');
}

/* ---------- buku induk ---------- */

function cetakInduk_(kunci, id) {
  var r = cariBaris_(kunci, id);
  var p = pengaturan_();
  if (!p.nama_sekolah) throw new Error('Isi dulu data sekolah di menu Sekolah.');
  var siswa = kunci === 'siswa';
  var nama = (siswa ? 'Buku Induk Siswa ' : 'Buku Induk Pegawai ') + namaBerkas_(r.nama) + (r.no_induk ? ' ' + r.no_induk : '');
  var d = dokBaru_(nama, 'A4', [1.5, 1.5, 1.5, 1.5]);
  var w = d.body;
  kop_(d, 'sederhana', p);
  judulDok_(w, siswa ? 'Buku Induk Siswa' : 'Buku Induk Pegawai', '', 14);
  p_(w, '', {});
  var ttl = gabung_([r.tempat_lahir, tglPanjang_(r.tanggal_lahir)], ', ').replace(/^-, |, -$/g, '');
  var rows;
  if (siswa) {
    rows = [['Nomor Induk', r.no_induk], ['NISN', r.nisn], ['NIS Lokal', r.nis_lokal], ['Nama Lengkap', r.nama, { tebal: true }], ['Nama Panggilan', r.nama_panggilan],
      ['Jenis Kelamin', jk_(r.jenis_kelamin)], ['Tempat, Tanggal Lahir', ttl], ['Agama', r.agama], ['Kewarganegaraan', r.kewarganegaraan],
      ['Bahasa Sehari-hari', r.bahasa_sehari_hari], ['Golongan Darah', r.golongan_darah], ['Anak ke-berapa', r.anak_ke],
      ['Jml. Saudara (Kandung/Tiri/Angkat)', gabung_([r.saudara_kandung, r.saudara_tiri, r.saudara_angkat], ' / ')],
      ['Alamat', r.alamat], ['RT/RW', gabung_([r.rt, r.rw], ' / ')], ['Desa/Kelurahan', r.desa_kelurahan], ['Kecamatan', r.kecamatan],
      ['Kabupaten/Kota', r.kabupaten_kota], ['Provinsi', r.provinsi], ['Kode Pos', r.kode_pos], ['Jarak ke Sekolah', r.jarak_ke_sekolah ? r.jarak_ke_sekolah + ' KM' : ''],
      ['No. HP Orang Tua/Wali', r.no_hp_ortu], ['Nama Ayah', r.nama_ayah], ['Pendidikan/Pekerjaan Ayah', gabung_([r.pendidikan_ayah, r.pekerjaan_ayah], ' / ')],
      ['Nama Ibu', r.nama_ibu], ['Pendidikan/Pekerjaan Ibu', gabung_([r.pendidikan_ibu, r.pekerjaan_ibu], ' / ')]];
    if (r.nama_wali) rows = rows.concat([['Nama Wali', r.nama_wali], ['Hubungan Keluarga Wali', r.hubungan_wali], ['Pendidikan/Pekerjaan Wali', gabung_([r.pendidikan_wali, r.pekerjaan_wali], ' / ')]]);
    rows = rows.concat([['Asal Sekolah', r.asal_sekolah], ['Tanggal Masuk', tglPanjang_(r.tanggal_masuk)], ['Status Saat Ini', r.status]]);
    if (r.status && r.status !== 'Aktif') rows = rows.concat([['Tanggal Keluar/Lulus', tglPanjang_(r.tanggal_keluar)], ['Keterangan', r.keterangan_keluar]]);
    if (r.status === 'Lulus') { rows.push(['Nomor Ijazah/STTB', r.nomor_ijazah]); if (r.melanjutkan_ke) rows.push(['Melanjutkan ke Sekolah', r.melanjutkan_ke]); }
    if (r.status === 'Pindah') rows = rows.concat([['Pindah ke Sekolah', r.pindah_ke_sekolah], ['Pindah ke Tingkat', r.pindah_ke_tingkat]]);
  } else {
    rows = [['NIP/NUPTK', r.nip_nuptk], ['Nama Lengkap', r.nama, { tebal: true }], ['Jenis Kelamin', jk_(r.jenis_kelamin)], ['Tempat, Tanggal Lahir', ttl],
      ['Status Kepegawaian', r.status_kepegawaian], ['Jabatan', r.jabatan], ['Pangkat/Golongan', r.pangkat_golongan], ['Unit Kerja', p.nama_sekolah],
      ['Pendidikan Terakhir', r.pendidikan_terakhir], ['Tanggal Mulai Bertugas', tglPanjang_(r.tanggal_mulai_tugas)], ['Status Saat Ini', r.status]];
  }
  tabelInfo_(w, rows, 165, d.lebar, true);
  // riwayat: aplikasi ringan belum mencatat riwayat terpisah, jadi ditulis apa adanya
  if (siswa) {
    p_(w, 'Riwayat Kelas', { tebal: true, sebelum: 12, sesudah: 4 });
    p_(w, 'Belum ada riwayat kelas.', { miring: true, ukuran: 11 });
    p_(w, 'Riwayat Status', { tebal: true, sebelum: 10, sesudah: 4 });
    p_(w, 'Belum ada riwayat status.', { miring: true, ukuran: 11 });
  } else {
    p_(w, 'Riwayat Jabatan', { tebal: true, sebelum: 12, sesudah: 4 });
    p_(w, 'Belum ada riwayat jabatan.', { miring: true, ukuran: 11 });
  }
  ttd_(d, { tanggal: kotaTanggal_(p, ''), jabatan: jabatanKepala_(p), nama: p.nama_kepala_sekolah, nip: p.nip_kepala_sekolah });
  return selesaiPdf_(d, nama, siswa ? 'Buku Induk Siswa' : 'Buku Induk Pegawai');
}

/* ---------- surat keterangan siswa (dari detail siswa) ---------- */

function cetakKeterangan_(id, param) {
  var r = cariBaris_('siswa', id);
  var p = pengaturan_();
  if (!p.nama_sekolah) throw new Error('Isi dulu data sekolah di menu Sekolah.');
  var nama = 'Surat Keterangan ' + namaBerkas_(r.nama);
  var d = dokBaru_(nama, 'A4');
  var w = d.body;
  kop_(d, 'A', p);
  judulDok_(w, 'Surat Keterangan', String(param.nomor || '').trim() || titik_(30));
  p_(w, 'Yang bertanda tangan di bawah ini, ' + jabatanKepalaUnit_(p) + ', menerangkan bahwa:', { rata: 'penuh', sesudah: 4 });
  tabelInfo_(w, [['Nama', r.nama, { tebal: true }], ['NISN', r.nisn], ['Nomor Induk', r.no_induk], ['Tempat, Tanggal Lahir', gabung_([r.tempat_lahir, tglPanjang_(r.tanggal_lahir)], ', ')],
    ['Kelas', r.kelas_saat_ini], ['Nama Orang Tua/Wali', r.nama_ayah || r.nama_ibu || r.nama_wali]], 128, d.lebar);
  p_(w, '', {});
  p_(w, 'adalah benar peserta didik di ' + p.nama_sekolah + ' dengan status: ' + (r.status || '-') + '.', { rata: 'penuh', indentAwal: 36, sesudah: 4 });
  if (param.keperluan) p_(w, 'Surat keterangan ini dibuat untuk keperluan: ' + String(param.keperluan).trim() + '.', { rata: 'penuh', indentAwal: 36, sesudah: 4 });
  p_(w, 'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.', { rata: 'penuh', indentAwal: 36 });
  ttd_(d, { tanggal: kotaTanggal_(p, ''), jabatan: jabatanKepala_(p), nama: p.nama_kepala_sekolah, nip: p.nip_kepala_sekolah });
  return selesaiPdf_(d, nama, 'Surat Keterangan');
}

/* ---------- KIR ---------- */

function cetakKir_(id) {
  var ruang = cariBaris_('ruang', id);
  var items = daftarModul_('aset').filter(function (a) { return a.ruang === ruang.nama_ruang; })
    .sort(function (a, b) { return a.nama_barang.localeCompare(b.nama_barang, 'id'); });
  if (!items.length) throw new Error('Ruangan ini belum punya barang. Tambahkan barang dulu.');
  var p = pengaturan_();
  var nama = 'KIR ' + namaBerkas_(ruang.nama_ruang);
  var d = dokBaru_(nama, 'A4L', [1.5, 1.5, 1.5, 2]);
  var w = d.body;
  kop_(d, 'A', p);
  judulDok_(w, 'Kartu Inventaris Ruangan (KIR)', '', 13);
  tabelInfo_(w, [['Nama sekolah', p.nama_sekolah], ['Ruangan', ruang.nama_ruang + (ruang.jenis_ruang ? ' (' + ruang.jenis_ruang + ')' : '')], ['Kode ruangan', ruang.kode_ruang],
    ['Kondisi ruangan', ruang.kondisi_ruang], ['Penanggung jawab', ruang.penanggung_jawab]], 110, d.lebar);
  p_(w, '', {});
  var tot = { j: 0, b: 0, rr: 0, rb: 0 };
  var rows = items.map(function (a, i) {
    tot.j += Number(a.jumlah) || 0; tot.b += Number(a.jml_baik) || 0; tot.rr += Number(a.jml_rusak_ringan) || 0; tot.rb += Number(a.jml_rusak_berat) || 0;
    return [String(i + 1), a.nama_barang, a.merk_model, a.nomor_seri, a.tahun_perolehan, a.kode_barang, a.jumlah, a.jml_baik, a.jml_rusak_ringan, a.jml_rusak_berat, a.keterangan]
      .map(function (x) { return x === undefined || x === null ? '' : String(x); });
  });
  rows.push(['', 'Total', '', '', '', '', String(tot.j), String(tot.b), String(tot.rr), String(tot.rb), '']);
  var t = tabelBingkai_(w, ['No', 'Nama barang', 'Merk / model', 'No. seri', 'Tahun', 'Kode barang', 'Jumlah', 'Baik', 'Rusak ringan', 'Rusak berat', 'Keterangan'], rows, 9);
  var akhir = t.getRow(rows.length);
  for (var c = 0; c < akhir.getNumCells(); c++) akhir.getCell(c).editAsText().setBold(true);
  ttd_(d, { tanggal: kotaTanggal_(p, ''), jabatan: jabatanKepala_(p), nama: p.nama_kepala_sekolah, nip: p.nip_kepala_sekolah });
  return selesaiPdf_(d, nama, 'KIR');
}

/* ---------- folder hasil cetak ---------- */

/* ---------- folder aplikasi ----------
   Semua berkas dalam satu folder induk "Tata Usaha - {sekolah}":
     file Sheet ini, Hasil Cetak/{jenis dokumen}, Cadangan, Logo dan Kop. */

function folderAkar_() {
  var p = pengaturan_();
  if (p.folder_akar_id) { try { var f = DriveApp.getFolderById(p.folder_akar_id); if (!f.isTrashed()) return f; } catch (e) { /* buat baru */ } }
  var akar = DriveApp.createFolder('Tata Usaha - ' + (p.nama_sekolah || 'Sekolah'));
  simpanPengaturan_('folder_akar_id', akar.getId());
  try { DriveApp.getFileById(ss_().getId()).moveTo(akar); } catch (e) { /* file Sheet tetap di tempatnya */ }
  return akar;
}

function subFolder_(nama, induk) {
  induk = induk || folderAkar_();
  var props = PropertiesService.getScriptProperties(), kunci = 'fld_' + induk.getId() + '_' + nama;
  var id = props.getProperty(kunci);
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { /* cari ulang */ } }
  var it = induk.getFoldersByName(nama);
  var g = it.hasNext() ? it.next() : induk.createFolder(nama);
  props.setProperty(kunci, g.getId());
  return g;
}

// folder lama (dibuat versi sebelumnya) dipindah ke dalam folder induk dan diberi nama baku
function pindahKeAkar_(folder, namaBaru) {
  var akar = folderAkar_();
  var par = folder.getParents(), ada = false;
  while (par.hasNext()) if (par.next().getId() === akar.getId()) ada = true;
  if (!ada) folder.moveTo(akar);
  if (folder.getName() !== namaBaru) folder.setName(namaBaru);
  return folder;
}

function dapatkanFolder_() {
  var id = pengaturan_().folder_hasil_cetak_id;
  if (id) {
    try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) { pindahKeAkar_(f, 'Hasil Cetak'); return id; } } catch (e) { /* buat baru */ }
  }
  var g = subFolder_('Hasil Cetak');
  simpanPengaturan_('folder_hasil_cetak_id', g.getId());
  return g.getId();
}

function folderCetak_(kategori) { return subFolder_(kategori, DriveApp.getFolderById(dapatkanFolder_())); }

// rapikan semua berkas lama ke folder induk (aman dijalankan berulang)
function rapikanFolder_() {
  var akar = folderAkar_();
  try { DriveApp.getFileById(ss_().getId()).moveTo(akar); } catch (e) { /* abaikan */ }
  dapatkanFolder_();
  folderCadangan_();
  var p = pengaturan_(), logo = subFolder_('Logo dan Kop');
  ['logo_drive_file_id', 'logo_kanan_drive_file_id', 'kop_drive_file_id'].forEach(function (k) {
    if (p[k]) { try { DriveApp.getFileById(p[k]).moveTo(logo); } catch (e) { /* berkas tidak ada */ } }
  });
  return akar.getUrl();
}
