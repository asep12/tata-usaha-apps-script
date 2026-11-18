# Tata Usaha Ringan

Aplikasi administrasi tata usaha sekolah yang berjalan di **Google Sheets + Google Apps Script**. Gratis, tanpa server, tanpa hosting, dan tanpa instalasi di komputer sekolah. Cukup punya akun Google (disarankan akun **belajar.id** sekolah).

**Isi aplikasi:**

- **Surat masuk** dengan nomor agenda otomatis dan status penanganan.
- **Surat keluar** dengan nomor surat otomatis (tidak pernah dobel), berbagai jenis surat (umum, undangan, tugas + SPPD, keterangan, keputusan, edaran, nota dinas), dan cetak PDF dengan kop sekolah.
- **Buku induk siswa dan pegawai**, impor dari Excel/CSV (termasuk ekspor Dapodik), cetak buku induk dan surat keterangan siswa.
- **Inventaris barang** per ruangan dengan kondisi baik/rusak, dan cetak **KIR**.
- **Rekapitulasi** siswa dan pegawai, pencarian global (Ctrl+K), tema gelap, dan tampilan yang nyaman di HP.
- Akun aplikasi sendiri dengan peran **Admin**, **Operator**, dan **Pimpinan**.

Semua hasil cetak tersimpan di Google Drive sekolah, di folder **"Tata Usaha - (nama sekolah)"**.

---

## Daftar isi

1. [Yang perlu disiapkan](#1-yang-perlu-disiapkan)
2. [Langkah pemasangan (sekitar 15 menit)](#2-langkah-pemasangan-sekitar-15-menit)
3. [Pengaturan pertama setelah terpasang](#3-pengaturan-pertama-setelah-terpasang)
4. [Memperbarui ke versi terbaru](#4-memperbarui-ke-versi-terbaru)
5. [Masalah yang sering terjadi](#5-masalah-yang-sering-terjadi)
6. [Untuk pengembang](#6-untuk-pengembang)

---

## 1. Yang perlu disiapkan

- **Laptop atau komputer** dengan browser **Google Chrome**. Pemasangan tidak bisa dilakukan dari HP, tetapi setelah terpasang aplikasinya bisa dipakai di HP.
- **Akun Google sekolah.** Akun ini akan menjadi **pemilik** semua data, jadi pakai akun resmi sekolah (misalnya akun belajar.id operator atau TU), bukan akun pribadi.
- **Halaman GitHub ini** terbuka di tab lain, untuk menyalin kode.
- **Logo sekolah** berupa gambar PNG atau JPG (opsional, bisa diunggah belakangan dari dalam aplikasi).

Aplikasi ini **tidak membawa data atau logo sekolah mana pun**. Setelah dipasang, aplikasi masih kosong dan semua data milik sekolah Anda sendiri.

> **Tips:** Selama pemasangan, buka Chrome yang hanya masuk ke **satu** akun Google (atau pakai jendela samaran). Apps Script sering gagal bila Chrome masuk ke beberapa akun sekaligus.

---

## 2. Langkah pemasangan (sekitar 15 menit)

Aplikasi ini terdiri dari **11 file**. Anda akan membuat file-file itu di editor Apps Script, lalu menyalin isinya satu per satu dari GitHub. Tidak perlu memahami kodenya; cukup salin dan tempel.

### Cara menyalin isi satu file dari GitHub

Cara ini dipakai berulang kali di langkah 4 sampai 6, jadi pahami dulu:

1. Di daftar file pada halaman GitHub ini, klik nama file, misalnya **Api.gs**. Isi kodenya akan tampil.
2. Di kanan atas kotak kode ada beberapa tombol kecil. Klik tombol **Copy raw file** (ikon dua kotak bertumpuk). Muncul tanda centang singkat, artinya seluruh isi file sudah tersalin.
3. Pindah ke tab editor Apps Script, klik di dalam area kode, tekan **Ctrl+A** (pilih semua), lalu **Ctrl+V** (tempel).
4. Tekan **Ctrl+S** (atau klik ikon disket) untuk menyimpan.

> **Bila tombol Copy raw file tidak terlihat:** klik tombol **Raw**. Halaman berisi teks polos akan terbuka; tekan **Ctrl+A** lalu **Ctrl+C** untuk menyalin semuanya.
>
> **Jangan** memblok kode dengan menyeret mouse, karena mudah ada baris yang tertinggal.

### Daftar centang

Centang di kertas atau catatan setiap kali satu file selesai ditempel dan disimpan:

| Jenis | Nama file di editor | Salin dari GitHub |
|---|---|---|
| Skrip | `Api` | [Api.gs](Api.gs) |
| Skrip | `Auth` | [Auth.gs](Auth.gs) |
| Skrip | `Cetak` | [Cetak.gs](Cetak.gs) |
| Skrip | `Log` | [Log.gs](Log.gs) |
| Skrip | `Repo` | [Repo.gs](Repo.gs) |
| Skrip | `Setup` | [Setup.gs](Setup.gs) |
| Skrip | `Skema` | [Skema.gs](Skema.gs) |
| HTML | `Index` | [Index.html](Index.html) |
| HTML | `App` | [App.html](App.html) |
| HTML | `Style` | [Style.html](Style.html) |
| Pengaturan | `appsscript.json` | [appsscript.json](appsscript.json) |

### Langkah 1 — Buat Google Sheet baru

1. Buka [sheets.new](https://sheets.new) dengan akun Google sekolah.
2. Beri nama, misalnya **Tata Usaha - SMP Negeri ...** (klik tulisan "Spreadsheet tanpa judul" di kiri atas).

Sheet ini akan menjadi tempat penyimpanan semua data. Tab-tab di dalamnya dibuat otomatis oleh aplikasi.

### Langkah 2 — Buka editor Apps Script

1. Di Sheet tadi, klik menu **Ekstensi** → **Apps Script**.
2. Tab baru terbuka berisi editor dengan satu file bernama `Kode.gs` (atau `Code.gs`).
3. Klik tulisan **Project tanpa judul** di kiri atas, ganti menjadi **Tata Usaha**, lalu klik **Ganti nama**.

### Langkah 3 — Tampilkan file pengaturan `appsscript.json`

1. Di editor, klik ikon **roda gigi (Setelan project)** di menu paling kiri.
2. Centang **Tampilkan file manifes "appsscript.json" di editor**.
3. Klik ikon **< > (Editor)** di menu kiri untuk kembali ke daftar file.

### Langkah 4 — Buat 7 file skrip

Ulangi untuk setiap skrip: `Api`, `Auth`, `Cetak`, `Log`, `Repo`, `Setup`, `Skema`.

1. Klik tanda **+** di samping tulisan **File** → pilih **Skrip**.
2. Ketik namanya **persis** seperti di tabel (misalnya `Api`), tanpa `.gs` karena editor menambahkannya sendiri. Tekan **Enter**.
3. Di GitHub, buka file yang sama (misalnya [Api.gs](Api.gs)), lalu klik tombol **Copy raw file** (ikon dua kotak bertumpuk) di kanan atas isi file.
4. Kembali ke editor, klik di dalam file baru, tekan **Ctrl+A** lalu **Ctrl+V** untuk menempel (isi bawaan otomatis tertimpa).
5. Tekan **Ctrl+S** untuk menyimpan.

Setelah ketujuh file selesai, **hapus file `Kode.gs` bawaan**: klik titik tiga di sampingnya → **Hapus**.

### Langkah 5 — Buat 3 file HTML

Ulangi untuk `Index`, `App`, dan `Style`.

1. Klik **+** di samping **File** → pilih **HTML**.
2. Ketik namanya persis (misalnya `Index`), tanpa `.html`. Tekan **Enter**.
3. Salin isinya dari GitHub dengan tombol **Copy raw file**, lalu di editor tekan **Ctrl+A** dan **Ctrl+V**.
4. Tekan **Ctrl+S**.

> File `App` cukup panjang (sekitar 2.000 baris). Pastikan baris terakhirnya `</script>`, tanda bahwa semua isi sudah tertempel.

### Langkah 6 — Isi `appsscript.json`

1. Klik file **appsscript.json** di daftar file.
2. Salin isi [appsscript.json](appsscript.json) dari GitHub, lalu di editor tekan **Ctrl+A** dan **Ctrl+V**.
3. Tekan **Ctrl+S**.

**Periksa sebelum lanjut:** daftar file di editor harus berisi tepat 11 file (tidak ada `Kode.gs` lagi), yaitu `appsscript.json`, `Api.gs`, `App.html`, `Auth.gs`, `Cetak.gs`, `Index.html`, `Log.gs`, `Repo.gs`, `Setup.gs`, `Skema.gs`, dan `Style.html`. Huruf besar dan kecil pada nama file berpengaruh.

### Langkah 7 — Berikan izin akses (sekali saja)

1. Di bagian atas editor ada kotak pilihan fungsi. Pilih **otorisasi**, lalu klik **Jalankan**.
2. Muncul jendela **Otorisasi diperlukan** → klik **Tinjau izin** → pilih akun Google sekolah.
3. Bila muncul peringatan *"Google belum memverifikasi aplikasi ini"*, klik **Lanjutan** → **Buka Tata Usaha (tidak aman)**. Peringatan ini wajar untuk skrip buatan sendiri; kodenya hanya berjalan di akun Anda.
4. Klik **Izinkan**.
5. Di bawah, Log eksekusi menampilkan *"Izin sudah lengkap. Aplikasi siap dipakai."*

Izin yang diminta: Google Sheets (menyimpan data), Google Drive (menyimpan PDF, logo, dan cadangan), dan Google Docs (membuat dokumen cetak).

### Langkah 8 — Terbitkan sebagai aplikasi web

1. Klik tombol biru **Terapkan** (Deploy) di kanan atas → **Deployment baru**.
2. Klik ikon roda gigi di samping **Pilih jenis** → pilih **Aplikasi web**.
3. Isi:
   - **Deskripsi:** `Versi pertama`
   - **Jalankan sebagai:** **Saya** (akun sekolah)
   - **Yang memiliki akses:** **Siapa saja**
4. Klik **Terapkan**, lalu salin **URL aplikasi web** (berakhiran `/exec`).

Simpan URL itu. Itulah alamat aplikasi yang dibagikan ke staf TU. Masuk ke aplikasi tetap memakai akun aplikasi (nama pengguna + kata sandi), jadi orang tanpa akun tidak bisa melihat data.

### Langkah 9 — Buka aplikasi dan buat akun Admin

1. Buka URL `/exec` tadi.
2. Pembukaan pertama memerlukan beberapa detik karena aplikasi menyiapkan tab-tab di Sheet.
3. Muncul formulir **Buat akun Admin pertama**. Isi nama, nama pengguna, dan kata sandi (minimal 8 karakter).

Selesai, aplikasi siap dipakai.

---

## 3. Pengaturan pertama setelah terpasang

Masuk sebagai Admin, lalu buka **Pengaturan**:

1. **Sekolah:** isi nama sekolah, **jenjang** (SD/SMP/SMA/SMK), NPSN, alamat, kota, nama dan NIP kepala sekolah.
2. **Logo:** selama logo belum diunggah, di kiri atas aplikasi dan di halaman Pengaturan tampil **kotak bergaris putus-putus bertuliskan "Logo"**. Klik kotak itu, lalu pilih gambar logo sekolah (PNG atau JPG). Gambar otomatis diperkecil dan disimpan di Google Drive sekolah. Logo dipakai di menu, layar masuk, dan kop semua surat. Ada dua tempat: **logo kiri** (lencana pemerintah daerah atau sekolah) dan **logo kanan** (opsional, untuk kop dua logo).
3. **Kop surat (opsional):** bila sekolah punya kop surat berupa gambar selebar halaman, unggah di bagian Kop surat agar cetakan memakai kop asli. Tanpa kop gambar, cetakan memakai kop teks dari logo dan data sekolah.
4. **Format nomor surat**, misalnya `{kode}/{urut}/{unit}/{tahun}` menghasilkan `421/007/TU/2026`.
5. **Kode klasifikasi** dan **Jenis surat:** klik **Muat daftar awal** untuk mengisi daftar standar. Daftar ini bisa ditambah sendiri.
6. **Pengguna:** buat akun untuk staf, lalu pilih perannya:
   - **Admin:** semua akses, termasuk pengaturan dan pengguna.
   - **Operator:** mengisi data dan mencetak; hak persisnya diatur di matriks hak akses.
   - **Pimpinan:** melihat data dan laporan.
7. **Data siswa dan pegawai:** buka menu **Siswa** atau **Pegawai** → **Impor Excel/CSV**. File ekspor Dapodik bisa langsung dipakai karena baris judulnya dicari otomatis.

> **Penting:** jangan mengubah isi tab di Google Sheet secara langsung. Semua perubahan lewat aplikasi, supaya nomor surat dan validasi tetap benar.

**Lupa kata sandi Admin?** Buka Google Sheet-nya (sebagai pemilik), klik menu **Tata Usaha** → **Atur ulang kata sandi Admin (darurat)**. Menu ini muncul setelah Sheet dibuka ulang.

---

## 4. Memperbarui ke versi terbaru

Data Anda **tidak hilang** saat memperbarui, karena data ada di Sheet, sedangkan yang diganti hanya kode.

1. Untuk setiap file yang berubah, buka file itu di editor, lalu tempel isi terbaru dari GitHub (**Ctrl+A** lalu **Ctrl+V**, kemudian **Ctrl+S**). Bila ragu file mana yang berubah, ganti saja kesebelasnya.
2. Klik **Terapkan** → **Kelola deployment** → klik ikon **pensil (Edit)** pada deployment yang ada.
3. Pada **Versi**, pilih **Versi baru** → **Terapkan**.

URL aplikasi tetap sama. Jangan membuat "Deployment baru", karena itu menghasilkan URL baru yang berbeda.

Untuk memastikan versi baru sudah aktif, lihat nomor versi di pojok kanan bawah aplikasi (misalnya `v3.4`), atau di menu **Akun saya**.

---

## 5. Masalah yang sering terjadi

| Masalah | Penyebab dan solusi |
|---|---|
| Halaman putih atau "Maaf, tidak dapat membuka file saat ini" | Chrome masuk ke beberapa akun Google. Buka di jendela samaran atau profil Chrome dengan satu akun. |
| Perubahan kode tidak muncul | Deployment belum diperbarui. Ikuti [langkah 4](#4-memperbarui-ke-versi-terbaru) bagian *Versi baru*, lalu muat ulang halaman dengan **Ctrl+F5**. |
| `ReferenceError: ... is not defined` | Ada file yang belum dibuat atau namanya salah ketik. Cocokkan dengan daftar 11 file di langkah 6. |
| "Otorisasi diperlukan" muncul lagi | Versi baru membutuhkan izin tambahan. Jalankan lagi fungsi **otorisasi** (langkah 7). |
| Impor Excel ditolak "Pilih dari daftar" | Sheet lama berisi validasi data. Buka Sheet → menu **Tata Usaha** → **Siapkan / Perbaiki Sheet**. |
| Aplikasi terasa lambat | Wajar 1–3 detik per aksi karena Google Apps Script. Nyaman untuk ratusan sampai sekitar 1.000 data per menu. |

**Batasan yang perlu diketahui:**

- Bila dua orang mengubah data yang sama bersamaan, yang terakhir menyimpan yang dipakai.
- Riwayat perubahan rinci per kolom tidak ada; yang tercatat adalah siapa membuat dan siapa terakhir mengubah setiap baris, serta catatan kegiatan.

---

## 6. Untuk pengembang

Bila Anda terbiasa dengan terminal, kode bisa dikirim dengan [clasp](https://github.com/google/clasp) alih-alih salin-tempel:

```bash
npm install -g @google/clasp
clasp login
clasp clone <ID-script-Anda>   # ID ada di Setelan project editor Apps Script
clasp push -f
clasp deploy -i <ID-deployment> -d "keterangan"
```

`.clasp.json` berisi ID project Anda sendiri dan sengaja tidak ikut di repo ini.

**Struktur kode:**

| File | Isi |
|---|---|
| `Skema.gs` | Satu sumber definisi semua menu data (kolom, form, tabel, validasi). Tambah kolom cukup di sini. |
| `Repo.gs` | Baca dan tulis Sheet, cache, kunci (LockService) supaya nomor tidak dobel. |
| `Auth.gs` | Akun, kata sandi bergaram (SHA-256), sesi, peran, dan hak akses. |
| `Api.gs` | Fungsi yang dipanggil dari browser: simpan, hapus, terbitkan nomor surat, beranda. |
| `Cetak.gs` | Pembuatan PDF lewat Google Docs (surat, SPPD, buku induk, keterangan, KIR). |
| `Log.gs` | Catatan kegiatan, cadangan otomatis, dan laporan dampak. |
| `Setup.gs` | Menyiapkan tab Sheet, menu darurat, dan fungsi `otorisasi`. |
| `Index.html`, `App.html`, `Style.html` | Tampilan aplikasi dalam satu halaman. Pustaka luar hanya pembaca Excel (SheetJS dari cdnjs), dimuat saat mengimpor. |

**Pratinjau dan uji tanpa Google** (butuh Node.js):

```bash
node preview/uji_server.js      # menguji alur server dengan tiruan layanan Google
node preview/build.js           # merakit preview/index.html dengan data contoh
```

Lalu buka `preview/index.html` lewat server lokal, misalnya `python -m http.server --directory preview`. Akun contoh: `admin` / `rahasia123`. Semua data di folder `preview/` adalah data fiktif.

---

## Lisensi

[MIT](LICENSE). Boleh dipakai, diubah, dan dibagikan, termasuk untuk sekolah lain, dengan tetap mencantumkan kredit **asep12**.
