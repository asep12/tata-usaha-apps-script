# Panduan Tata Usaha Ringan

## Untuk yang memasang (admin teknis)
Ikuti langkah demi langkah di [README.md](README.md#2-langkah-pemasangan-sekitar-15-menit): buat Google Sheet baru, salin 11 file ke editor Apps Script, jalankan `otorisasi`, lalu terbitkan sebagai aplikasi web.

Lupa kata sandi Admin: di Sheet, menu **Tata Usaha > Atur ulang kata sandi Admin (darurat)** (hanya pemilik Sheet).

## Untuk staf TU
- **Surat masuk:** Tambah, isi asal dan perihal. No. agenda otomatis. Ubah status di panel detail.
- **Surat keluar:** Tambah sebagai draft dan pilih **jenis surat**; isian khusus muncul sesuai jenisnya (undangan: tanggal, waktu, tempat, acara; tugas: dasar dan yang ditugaskan; keputusan: menimbang, mengingat, memutuskan; dst.). Lalu **Terbitkan dan beri nomor**, lalu **Cetak PDF**. Nomor tidak dipakai ulang, walau surat dibatalkan atau dihapus.
- **Admin, sebelum mulai:** di **Sekolah** isi format nomor surat (mis. `{kode}/{urut}/{unit}/{tahun}`) dan, bila ada, unggah **kop surat** berupa gambar. Periksa **Kode klasifikasi** dan **Jenis surat**; tombol **Muat daftar awal** menambahkan daftar standar yang belum ada.
- **Siswa dan pegawai:** Tambah satu per satu atau **Impor Excel/CSV** (file .xlsx atau CSV, termasuk ekspor Dapodik; baris judul dicari otomatis). Dari panel detail: buku induk PDF dan surat keterangan siswa.
- **Inventaris:** buat daftar **Ruangan** dulu (kelas, perpustakaan, lab, gudang, dst.), lalu isi **Inventaris Barang** per ruangan dengan jumlah Baik, Rusak ringan, Rusak berat (total otomatis). Dari detail ruangan: lihat isi ruangan dan **Cetak KIR (PDF)**. Ruangan yang masih berisi barang tidak bisa dihapus.
- PDF tersimpan di Google Drive, folder "Tata Usaha - (nama sekolah)" > Hasil Cetak.

## Batasan
- Kecepatan tiap aksi 1 sampai 3 detik (Apps Script). Nyaman untuk ratusan sampai sekitar seribu baris per modul.
- Dua orang mengubah data yang sama bersamaan: yang terakhir menyimpan menang.
- Tidak ada riwayat perubahan rinci; hanya "dibuat oleh" dan "diubah oleh" per baris.
