# Membuat file uji TIRUAN (data karangan) dengan tata letak sama seperti ekspor Dapodik. Bukan data sekolah.
import openpyxl
out = 'C:/Tatausaha_appscript/preview/'

wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Daftar Peserta Didik'
ws['A1'] = 'Daftar Peserta Didik'; ws['A2'] = 'SEKOLAH CONTOH'; ws['A3'] = 'Tanggal unduh'
head = ['No', 'Nama', 'NIPD', 'JK', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Agama', 'Alamat', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan',
        'Kode Pos', 'Jenis Tinggal', 'Alat Transportasi', 'Telepon', 'HP', 'E-Mail', 'SKHUN', 'Penerima KPS', 'No. KPS', 'Data Ayah', '', '', '', '', '',
        'Data Ibu', '', '', '', '', '', 'Data Wali', '', '', '', '', '', 'Rombel Saat Ini', 'Sekolah Asal']
for i, v in enumerate(head, 1):
    ws.cell(5, i, v or None)
sub = ['Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK']
for g in range(3):
    for k, v in enumerate(sub):
        ws.cell(6, 25 + g * 6 + k, v)
rows = [
    ['Siswa Uji Satu', None, 'P', '0000000001', 'Kota Uji', '2013-01-13', '0', 'Islam', 'Jl. Uji No. 1', '7', '0', 'Dusun A', 'Kel. Uji', 'Kec. Uji', '42100', 'Bersama orang tua', 'Jalan kaki', None, '081200000001', None, None, 'Tidak', None,
     'Ayah Uji', '1988', 'S1', 'Wiraswasta', '1jt', '0', 'Ibu Uji', '1988', 'S1', 'IRT', '-', '0', None, None, None, None, None, None, '7A', 'SD UJI 1'],
    ['Siswa Uji Dua', '2602', 'L', '0000000002', 'Kota Uji', '2012-11-03', '0', 'Kristen', 'Jl. Uji No. 2', '3', '4', 'Dusun B', 'Kel. Uji', 'Kec. Uji', '42100', 'Bersama orang tua', 'Jalan kaki', '0211111', '081200000002', None, None, 'Tidak', None,
     'Ayah Dua', '1985', 'SMA', 'Buruh', '1jt', '0', 'Ibu Dua', '1986', 'SMA', 'IRT', '-', '0', 'Wali Dua', '1960', 'SMA', 'Pensiun', '-', '0', '8B', 'SD UJI 2'],
]
for r, data in enumerate(rows, 7):
    ws.cell(r, 1, r - 6)
    for c, v in enumerate(data, 2):
        ws.cell(r, c, v)
ws.merge_cells('Y5:AD5'); ws.merge_cells('AE5:AJ5'); ws.merge_cells('AK5:AP5')
wb.save(out + 'uji-dapodik-siswa.xlsx')

wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Daftar guru'
ws['A1'] = 'Daftar GTK'; ws['A2'] = 'SEKOLAH CONTOH'
head = ['No', 'Nama', 'NUPTK', 'JK', 'Tempat Lahir', 'Tanggal Lahir', 'NIP', 'Status Kepegawaian', 'Jenis PTK', 'Agama', 'Alamat Jalan', 'Telepon', 'HP', 'Email',
        'Tugas Tambahan', 'SK CPNS', 'Tanggal CPNS', 'SK Pengangkatan', 'TMT Pengangkatan']
for i, v in enumerate(head, 1):
    ws.cell(5, i, v)
for r, d in enumerate([
    [1, 'Guru Uji Satu', '1111111111111111', 'P', 'Kota Uji', '1995-01-01', '199501012025211001', 'PPPK Paruh Waktu', 'Guru', 'Islam', 'Jl. Uji', None, '0812', 'a@example.org', 'Guru wali', None, None, 'SK 1', '2025-10-01'],
    [2, 'Guru Uji Dua', '2222222222222222', 'L', 'Kota Uji', '1974-11-11', None, 'Honor Daerah TK.II Kab/Kota', 'Guru', 'Katholik', 'Jl. Uji 2', None, '0813', 'b@example.org', 'Wakil Kepala Sekolah Kurikulum', None, None, 'SK 2', '2022-02-02'],
    [3, 'Kepala Uji', '3333333333333333', 'L', 'Kota Uji', '1970-01-01', '197001011995011001', 'PNS', 'Guru', 'Islam', 'Jl. Uji 3', None, '0814', 'c@example.org', 'Kepala Sekolah', None, None, 'SK 3', '2010-01-01'],
], 6):
    for c, v in enumerate(d, 1):
        ws.cell(r, c, v)
wb.save(out + 'uji-dapodik-guru.xlsx')
print('ok')
