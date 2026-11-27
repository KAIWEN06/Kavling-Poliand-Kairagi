# Rencana: Pembatalan Cicilan, Wanprestasi 90 Hari, dan Pengembalian 50%

Status: **kode dan migrasi `202611300025` sudah ditulis, belum diterapkan ke database.** Keputusan di bagian 9 sudah final. Bagian 1 dan 2 menggambarkan keadaan sebelum perubahan.

## 1. Keadaan sekarang

Diperiksa dari kode, migrasi di commit terakhir, dan definisi fungsi di database aktif.

Sudah ada:
- Klien bisa menekan **Batalkan pembelian** di halaman Pembayaran, juga sebelum 90 hari.
- Admin atau Owner menyetujui atau menolak. Bila disetujui: transaksi `Cancelled`, kavling `Available`, komisi yang belum dibayar batal, pengembalian = 50% dari DP dan cicilan `Confirmed`, batas transfer 14 hari.
- Pembelian lunas tidak bisa dibatalkan.
- `detect_installment_defaults` menandai cicilan belum lunas sejak hari ke-90, hanya untuk tanggal jatuh tempo resmi.

Belum ada:
- Cara bagi Admin untuk mencatat klien yang menyatakan berhenti lewat WhatsApp, telepon, atau datang langsung.
- Pemanggil `detect_installment_defaults`. Aplikasi tidak memanggilnya dan job terjadwal juga tidak. Antreannya kosong.
- Layar antrean wanprestasi, surat peringatan, dan layar untuk mencatat transfer pengembalian (fungsinya `record_purchase_refund_payment` sudah ada di migrasi).

## 2. Cacat yang harus diperbaiki lebih dulu

Saat ini database belum punya transaksi batal, jadi belum ada data yang terkena.

| No | Cacat | Akibat | Perbaikan |
|---|---|---|---|
| B1 | Persetujuan pembatalan tidak menutup SPK. Statusnya tetap `Approved`, sedangkan `guard_spk_lot_availability` menolak pengajuan baru selama ada SPK `Submitted`, `Under Review`, atau `Approved`. | Kavling tampil tersedia, tetapi pengajuan SPK baru berstatus `Submitted` ditolak. | Di transaksi database yang sama, ubah SPK menjadi `Cancelled` dengan catatan. `transaction_id` dipertahankan sebagai riwayat. |
| B2 | Verifikasi pembayaran tidak memeriksa apakah transaksinya sudah batal. | Bukti `Pending` bisa dikonfirmasi setelah refund dihitung. Uang masuk buku kas tetapi tidak ikut dikembalikan. | Pembatalan tidak bisa disetujui selama ada pembayaran `Pending` atau `Needs Reupload`. Verifikasi dan unggah ulang pada transaksi batal ditolak. |
| B3 | Klien masih bisa mengirim pembayaran saat pengajuan batalnya diperiksa. | Nilai refund bisa berubah di tengah pemeriksaan. | Tolak kiriman baru selama ada pengajuan `Pending`. Hentikan pengingat tagihan untuk transaksi itu. |
| B4 | Persetujuan tidak memakai kunci yang sama dengan pengiriman pembayaran. | Dua proses bersamaan bisa lolos. | Pakai `pg_advisory_xact_lock(transaction_id)` di semua jalur pembatalan, seperti `submit_client_payment`. |
| B5 | Tidak ada layar pencatatan transfer pengembalian. | Refund tertahan di `Pending Transfer` dan arus keluarnya tidak tercatat. | Buat layarnya (tahap 2). |
| B6 | Data refund tidak menyimpan rekening tujuan. | Admin tidak tahu harus transfer ke mana. | Wajib isi bank, nomor rekening, dan nama pemilik. Nama berbeda dari pembeli memerlukan surat kuasa. |
| B7 | Penerimaan dicatat di akun kewajiban 2190. Saat batal, hanya bagian yang dikembalikan yang akan mengurangi akun itu. | 50% yang ditahan tercatat sebagai kewajiban selamanya. | Buat jurnal reklasifikasi saat pembatalan disetujui. Nama dan jenis akun diputuskan bagian akuntansi. |

## 3. Aturan yang diusulkan

### Tiga jalur, satu proses penyelesaian

| Jalur | Pemicu | Yang memulai | Syarat 90 hari |
|---|---|---|---|
| A. Klien lewat aplikasi | Klien tidak sanggup melanjutkan | Klien | Tidak ada |
| B. Dicatat Admin | Klien menyampaikan di luar aplikasi | Admin | Tidak ada, wajib ada surat pernyataan bertanda tangan |
| C. Wanprestasi | Menunggak 90 hari tanpa penyelesaian | Admin, dari antrean | Wajib, beserta surat peringatan |

Ketiganya memakai satu fungsi perhitungan, supaya angka di layar klien, layar Admin, dan data refund selalu sama.

Marketing boleh meneruskan informasi ke Admin, tetapi tidak bisa membuat atau menyetujui pembatalan.

### Hitungan
- Dasar: semua DP dan cicilan `Confirmed`, termasuk cicilan yang dibayar di muka.
- Pengembalian: 50% dari dasar, dibulatkan ke bawah ke rupiah penuh.
- Tidak masuk dasar: booking fee dan denda.
- Denda yang belum dibayar tidak dipotong dari pengembalian, lalu ditutup dengan status baru `Closed`. Jangan memakai `Waived`, karena artinya Admin membebaskan denda.
- Dasar nol: refund `Not Applicable`.

Contoh: DP Rp20.000.000 dan 6 cicilan Rp2.000.000 terkonfirmasi. Dasar Rp32.000.000, dikembalikan Rp16.000.000.

### Penghitung 90 hari (jalur C)
1. Dihitung dari jatuh tempo resmi tertua yang belum lunas. Hari ke-90 sudah termasuk, sama dengan fungsi yang aktif.
2. Jadwal yang belum resmi (sebelum PPJB) tidak dihitung.
3. Bila bukti bayar cicilan itu masih menunggu verifikasi, kasus ditahan sampai diverifikasi.
4. Satu transaksi menjadi satu kasus, walaupun beberapa cicilan menunggak. Tabel sekarang membuat satu baris per cicilan, jadi antrean harus mengelompokkannya.
5. Bila seluruh tunggakan lewat 90 hari sudah dibayar, kasus ditutup otomatis (`Dismissed`).
6. Sistem hanya menandai. **Pembatalan selalu diputuskan manusia.**
7. Job terjadwal memanggil fungsi internal setiap hari. Fungsi yang ada sekarang mensyaratkan login Admin, sehingga tidak bisa dipanggil job.

### Peringatan sebelum penetapan

| Waktu sejak jatuh tempo | Tindakan |
|---|---|
| H+30 | Surat peringatan 1 |
| H+60 | Surat peringatan 2 |
| H+75 | Surat peringatan 3, menyebut tenggat 14 hari dan akibatnya |
| H+90 atau lebih | Masuk antrean. Tombol penetapan aktif bila SP3 sudah diterima dan tenggatnya lewat |

Setiap surat menyimpan tanggal kirim, cara kirim, dan bukti terima. Notifikasi aplikasi saja tidak dianggap cukup sebelum notaris menyetujuinya.

## 4. Alur status

```
Pengajuan: Pending ──> Approved ──> refund Pending Transfer ──> Paid
              │
              ├──> Rejected
              └──> Withdrawn   (ditarik klien sebelum diputuskan)
```

Saat `Approved`, semua ini terjadi dalam satu transaksi database:
1. Cek ulang: belum batal, belum lunas, tidak ada pembayaran menggantung.
2. Hitung ulang refund. Bila berbeda dari angka yang ditampilkan, batalkan proses dan minta Admin memuat ulang.
3. Transaksi menjadi `Cancelled`. Trigger yang ada melepas kavling.
4. SPK menjadi `Cancelled` (B1).
5. Denda terbuka ditutup, kasus wanprestasi ditautkan ke pengajuan.
6. Komisi belum cair menjadi batal (sudah berjalan). Komisi yang sudah dibayar tidak ditarik.
7. Data refund dan jurnal reklasifikasi dibuat.
8. Notifikasi dikirim (sudah berjalan).

Jadwal cicilan dan riwayat pembayaran tidak dihapus. Persetujuan tidak bisa diurungkan; bila keliru, dibuat SPK baru dan dikoreksi lewat pencatatan keuangan.

Kavling langsung tersedia saat disetujui. Kewajiban refund tetap berjalan, tidak menunggu kavling terjual lagi.

## 5. Tombol dan layar

Istilah yang dipakai di semua layar: **pembatalan pembelian**. "Batalkan pembayaran" mudah tertukar dengan menolak bukti transfer.

### Klien, halaman Pembayaran
Tombol sudah ada. Yang ditambah:
- Rincian sebelum mengirim: total terkonfirmasi, nilai dikembalikan, nilai tidak dikembalikan, booking fee.
- Isian rekening tujuan dan alasan.
- Centang persetujuan atas rincian di atas, lalu geser untuk mengirim.
- Tombol **Tarik pengajuan** selama masih `Pending`.
- Bila ada pembayaran menunggu verifikasi: pengajuan boleh dikirim, disertai pemberitahuan bahwa keputusan menunggu verifikasi.
- Setelah disetujui: status refund, batas transfer, dan bukti transfer tetap bisa dibuka.

### Admin, tab Pembatalan di Keuangan
Tombol **Catat pembatalan** di kepala tab, juga dari detail pembeli.

1. Pilih transaksi cicilan yang masih berjalan.
2. Pilih sumber: datang langsung, WhatsApp, telepon, surat.
3. Isi tanggal dan alasan.
4. Unggah surat pernyataan bertanda tangan (wajib, disimpan privat).
5. Isi rekening tujuan.
6. Periksa rincian hitungan dari server.
7. Simpan sebagai pengajuan `Pending`. Kavling belum dilepas.

Persetujuan memakai dialog yang sudah ada, ditambah rincian angka, daftar penghalang (misalnya "1 pembayaran belum diverifikasi" beserta tautannya), dan geser untuk konfirmasi.

Untuk jalur B, penyetuju sebaiknya berbeda dari pencatat. Bila klien punya akun, ia menerima notifikasi saat pengajuan dibuat sehingga bisa menyanggah.

Bila klien sudah punya pengajuan `Pending`, Admin diarahkan ke pengajuan itu. Database sudah membatasi satu pengajuan `Pending` per transaksi.

### Admin, tab baru "Tunggakan"
Satu kartu per transaksi: kavling, pembeli, umur tunggakan, nilai tunggakan, status peringatan. Aksi: catat surat peringatan, beri perpanjangan (alasan dan tanggal wajib), tetapkan wanprestasi.

### Admin, daftar refund
Menunggu transfer, diurutkan menurut batas waktu, dengan tanda lewat tenggat. Pencatatan memerlukan tanggal, nomor referensi bank, dan bukti transfer.

### Ketentuan UI saat dibuat
Mengikuti `DESIGN.md`: target sentuh minimal 44px, isian minimal 16px agar iPhone tidak memperbesar layar (isian catatan keputusan yang ada mewarisi 12px), kontras minimal 4,5:1, geser hanya untuk aksi yang tidak bisa diurungkan, tombol terkunci selama proses menyimpan, dan angka rupiah memakai `tabular-nums`.

## 6. Kasus khusus

| Kasus | Perlakuan |
|---|---|
| Klien berhenti sebelum 90 hari | Jalur A atau B. Hitungan sama |
| Klien sudah menunggak, lalu mengajukan sendiri | Jalur A atau B. Kasus tunggakan ditautkan, tidak dibuat dua refund |
| Uang masuk setelah pembatalan disetujui | Dikembalikan penuh, dicatat terpisah dari refund 50% |
| Pembeli meninggal | Jangan dibatalkan otomatis. Tahan, urus bersama ahli waris |
| Penjual yang lalai (legalitas, kavling bermasalah) | Bukan jalur ini. Tidak boleh kena potongan 50% |
| Salah pilih kavling | Pakai koreksi SPK yang sudah ada, bukan pembatalan |
| Klien ingin menjadwal ulang atau mengalihkan ke orang lain | Perpanjangan dicatat; pengalihan di luar cakupan rencana ini |
| Klien tidak punya akun aplikasi | Jalur B atau C, bukti berupa dokumen |
| Transaksi tunai dengan pembayaran sebagian | Aturan 50% saat ini tidak menghitung `Cash Purchase`, sehingga hasilnya Rp0. Blokir di aplikasi sampai ada keputusan |
| Sertifikat sudah diserahkan atau sudah lunas | Tidak bisa dibatalkan (sudah berjalan) |

## 7. Risiko hukum: periksa sebelum diberlakukan

Ini bukan nasihat hukum. Minta notaris atau konsultan hukum memeriksa:

1. **Batas potongan.** Ringkasan sumber sekunder menyebut Permen PUPR 11/PRT/M/2019 tentang PPJB rumah: bila pembeli lalai setelah PPJB dan sudah membayar lebih dari 10% harga, pengembang berhak memotong 10% dari **harga transaksi**; bila paling tinggi 10%, seluruh pembayaran menjadi hak pengembang. Potongan 50% dari pembayaran bisa melebihi batas itu.
   Contoh: harga Rp200.000.000, sudah dibayar Rp80.000.000. Aturan 50% menahan Rp40.000.000, patokan 10% harga menahan Rp20.000.000.
   Yang belum dipastikan: apakah aturan itu berlaku untuk kavling tanpa bangunan, isi pasalnya di teks resmi, dan apakah sudah diubah. Sumber: [artikel Hukumonline](https://www.hukumonline.com/klinik/a/pembatalan-jual-beli-rumah-cl6113/), [teks di peraturan.go.id](https://peraturan.go.id/files/bn777-2019.pdf) (belum saya baca langsung).
2. **Somasi dan pembatalan sepihak.** Tanyakan penerapan KUHPerdata Pasal 1238 (pernyataan lalai) dan Pasal 1266 (pembatalan lewat pengadilan, serta klausul yang mengesampingkannya).
3. **Klausul tertulis.** Aturan 90 hari, surat peringatan, potongan, dan tenggat refund harus ada di PPJB dan ketentuan SPK. Tujuh ketentuan SPK sekarang belum memuatnya. Pembeli lama terikat pada dokumen yang mereka tanda tangani; aturan baru tidak otomatis berlaku bagi mereka.
4. **Sebelum PPJB.** Ketentuan SPK nomor 6 menyatakan SPK batal otomatis dan booking fee hangus bila PPJB dan DP tidak dipenuhi. Nasib DP yang sudah dibayar belum diatur.

Karena angka 50% mungkin berubah, simpan persentase dan versi ketentuan pada tiap transaksi. Angka tidak ditanam di fungsi.

## 8. Tahap pengerjaan

Migrasi hanya ditulis sebagai file. Pemilik proyek yang menerapkannya.

| Tahap | Isi | Bergantung pada |
|---|---|---|
| 0 | Pastikan file migrasi yang terhapus di folder kerja memang disengaja | - |
| 1 | B1 sampai B4 | 0 |
| 2 | Rekening tujuan, tombol Catat pembatalan, rincian hitungan, tarik pengajuan, layar pencatatan refund | 1, keputusan K1–K4 |
| 3 | Job harian, tab Tunggakan, surat peringatan, penetapan wanprestasi | 2, keputusan K5, hasil bagian 7 |
| 4 | Jurnal reklasifikasi (B7), laporan, pembaruan ketentuan SPK | akuntansi dan notaris |

B1 sampai B4 tidak bergantung pada keputusan bisnis, sehingga bisa dikerjakan lebih dulu.

### Uji wajib
- Setelah batal, kavling bisa diajukan SPK lagi.
- Konfirmasi atau unggah ulang pembayaran pada transaksi batal ditolak.
- Persetujuan ditolak selama ada pembayaran menggantung.
- Kirim pembayaran dan setujui pembatalan bersamaan: hanya satu yang berhasil.
- Dua kali menekan setuju menghasilkan satu refund.
- Hitungan benar untuk: dengan DP, tanpa DP, bayar di muka, dasar nol, angka ganjil.
- Hari ke-89 tidak ditandai, hari ke-90 ditandai, jadwal tidak resmi tidak ditandai.
- Klien dan Marketing tidak bisa memanggil fungsi Admin; klien tidak bisa melihat data klien lain.
- Beranda, Pembayaran, Dokumen, laporan Marketing, dan buku kas tetap benar setelah batal.

## 9. Keputusan

| No | Pertanyaan | Keputusan |
|---|---|---|
| K1 | Berhenti sukarela sebelum 90 hari juga 50%? | Ya |
| K2 | Siapa menyetujui pembatalan yang dicatat Admin? | Tanpa persetujuan kedua, langsung berlaku. Ini menggantikan usulan di bagian 5 |
| K3 | Denda belum dibayar dipotong dari refund? | Tidak |
| K4 | Tenggat transfer refund | 14 hari |
| K5 | Jadwal surat peringatan | H+30, H+60, H+75, tenggang 14 hari sejak surat ketiga |
| K6 | Kapan uang muka dibayar? | Saat PPJB. Klien baru bisa membayar setelah PPJB ditandai siap diproses |

Karena tidak ada persetujuan kedua, surat pernyataan bertanda tangan wajib diunggah untuk pembatalan yang dicatat Admin, dan server memastikan berkasnya ada.

## 10. Perbedaan penerapan dari rencana

- Antrean tunggakan dihitung langsung dari jadwal cicilan saat dibuka, sehingga tidak memerlukan job deteksi harian. `default_reviews` hanya diisi saat wanprestasi ditetapkan. Admin mendapat notifikasi pada hari ke-30, 60, 75, dan 90 melalui job pengingat yang sudah ada.
- Surat peringatan hanya berlaku bila dikirim pada atau setelah H+30, H+60, atau H+75 dari jatuh tempo tertua yang belum lunas. Bila cicilan tertua dilunasi, hitungan mengikuti cicilan tertua berikutnya.
- Tombol Catat pembatalan ada di tab Pembatalan. Pintasan dari detail pembeli belum dibuat.

Belum dikerjakan:
- Jurnal reklasifikasi bagian yang ditahan (B7), menunggu keputusan akun dari bagian akuntansi.
- Pembaruan tujuh ketentuan SPK dan PPJB, menunggu notaris.
- Pencatatan terpisah untuk uang yang masuk setelah pembatalan.
- Daftar periksa "Uji wajib" di bagian 8 belum dijalankan pada database.
