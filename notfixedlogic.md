# QA Not Fixed / Belum Terverifikasi

Tanggal pengujian: 2026-08-06
Branch: `agent/security-ownership-fixes`

Sesi sebelumnya (QA-UNVERIFIED-001/002/003, QA-OBS-004) tidak dapat menyelesaikan QA browser nyata karena — seperti dikonfirmasi pada sesi ini — sandbox eksekusi memblokir akses jaringan keluar ke `https://phonejaya.vercel.app` (kebijakan egress proxy sesi menolak host tersebut dengan 403, dikonfirmasi lewat endpoint status proxy, bukan bug TLS/config yang bisa diperbaiki). Item tersebut **digantikan** oleh `fixedlogic.md` QA-101 s.d. QA-109 pada sesi ini, yang berhasil menuntaskan QA browser nyata dengan menjalankan backend `phonejaya` (kode sumber tidak diubah sama sekali) secara lokal di dalam sandbox, memakai database in-memory yang di-seed dengan enam akun QA yang sama plus data bisnis contoh — bukan data/koneksi produksi. Detail metodologi ada di bagian "Catatan lingkungan" di bawah.

Dokumen ini berisi bug terverifikasi yang **belum** diperbaiki pada siklus ini, serta area yang sengaja belum diuji.

## NF-001 — Approval COD-Beli tidak menyediakan input kategori/kondisi unit → salah kategorisasi stok senyap

- Prioritas: High
- Status: bug terkonfirmasi (dibaca dari kode, bukan dugaan)
- Role terdampak: kasir dan owner (approval COD-beli menjadi unit stok baru)
- Halaman/komponen: `src/app/(app)/approval-cod/page.tsx` (endpoint `POST /cod/{cod_id}/approve`)
- Langkah reproduksi: buka menu Approval COD, approve sebuah request COD tipe "beli", isi draft (IMEI, merk, tipe, dst.) tanpa field kategori/kondisi karena memang tidak ada di form, submit.
- Hasil aktual vs harapan: berbeda dari Tambah Unit (lihat FIX-001 di `fixedlogic.md`), endpoint ini **tidak** menolak request — `app/services/cod_service.py` memakai default diam-diam `kat_kode="AI"`, `kondisi_kode="BN"` ketika field tersebut tidak ada di payload. Akibatnya setiap unit yang masuk lewat approval COD-beli akan selalu tercatat sebagai kategori "Android" kondisi "Baru/Normal" pada `unit_id` yang di-generate, **apapun** merk/kondisi asli HP-nya (mis. iPhone rusak dari COD tetap mendapat ID `*-AI-BN-*`). Harapannya kategori/kondisi unit yang dibuat mencerminkan data asli.
- Dampak bisnis: laporan/filter stok berdasarkan kategori (iPhone vs Android vs Tablet) menjadi tidak akurat untuk seluruh unit yang masuk lewat jalur COD-beli; ID unit menyesatkan tim gudang.
- Rekomendasi perbaikan: tambahkan dua dropdown Kategori + Kondisi Awal pada modal approve COD-beli, sama seperti perbaikan FIX-001 pada Tambah Unit, lalu kirim `kat_kode`/`kondisi_kode` di `unit_data`.
- Alasan belum diperbaiki pada siklus ini: ditemukan menjelang akhir sesi setelah alokasi waktu untuk siklus perbaikan pertama (FIX-001) terpakai; direkomendasikan sebagai prioritas #1 pada siklus perbaikan berikutnya.

## NF-002 — Workflow tulis (mutasi) belum diuji end-to-end

- Prioritas: Medium
- Status: belum diuji — bukan bug terkonfirmasi, murni keterbatasan waktu sesi
- Role terdampak: owner, kepala_cabang, kasir, teknisi, kurir
- Halaman: Approval Repair, Approval Sparepart, Transfer Stok (buat + approve), Data Customer (approve/reject/resubmit), Karyawan (tambah karyawan, reset password, pecat), Manajemen Cabang (tambah cabang, set/ganti kepala cabang, nonaktifkan), Pengaturan (ubah profil/password/foto), Data Service (update status oleh teknisi), Sparepart (update stok), Request Sparepart (respond/approve), seluruh aksi COD sisi kurir (accept/reject/status/input-stok/submit-beli).
- Alasan belum diuji: sesi ini memprioritaskan (a) memverifikasi ulang seluruh klaim sesi sebelumnya yang gagal karena blocker jaringan, dan (b) menuntaskan satu siklus perbaikan penuh (root-cause → fix → typecheck/build → retest → dokumentasi) untuk bug Critical yang ditemukan (FIX-001), sesuai urutan prioritas di brief (workflow buntu > validasi > route guard > loading/empty/error > tabel/filter/modal > visual). Read-only browsing (menu, tabel, filter dasar) untuk seluruh halaman ini SUDAH diuji dan lolos (lihat `fixedlogic.md` QA-107, QA-109) — yang belum diuji spesifik adalah submit form/aksi tulisnya.
- Rekomendasi: siklus QA berikutnya sebaiknya menguji minimal satu aksi tulis "jalur sukses" + satu "jalur validasi gagal" per halaman di atas, dengan data seed yang sama (aman, bukan data produksi).

## NF-003 — Field bebas teks tanpa validasi format, konsisten dengan backend (bukan bug, dicatat untuk transparansi)

- Prioritas: Low (observasi, bukan defect)
- Role terdampak: kasir, teknisi, kepala_cabang (form Customer, Service, Transaksi, COD, Cabang)
- Detail: field kontak/telepon (`kontak`, `kontak_customer`, `customer_kontak`, `telp`, `wa_number`, `wa_customer`) dan field deskriptif (Storage, RAM, Warna, Tipe SIM, Keamanan, Speaker, LCD) tidak memiliki validasi format di frontend maupun backend (dikonfirmasi lewat pembacaan `app/schemas/*.py` — field-field ini `str` polos tanpa regex/`Field(...)`). Ini **sengaja tidak diberi validasi baru** pada sesi ini karena brief secara eksplisit meminta untuk tidak menetapkan aturan panjang/format secara asal tanpa mengonfirmasi kontrak backend — dan kontraknya memang tidak memvalidasi format apa pun untuk field-field ini.
- Rekomendasi (opsional, bukan urgent): jika tim produk ingin nomor kontak lebih terstruktur, perubahan **harus** dimulai dari backend (kontrak validasi), baru frontend menyesuaikan — bukan sebaliknya.

## NF-004 — Route guard frontend vs otorisasi backend: dicatat terpisah sesuai permintaan

- Prioritas: informational
- Status: bukan bug — dokumentasi pemisahan tanggung jawab
- Frontend (`src/app/(app)/layout.tsx` + `src/lib/config/nav.ts`) memblokir render halaman yang bukan milik role secara konsisten untuk seluruh kombinasi yang diuji (lihat `fixedlogic.md` QA-102) — ini **hanya** proteksi UI/UX, mencegah kebingungan, BUKAN kontrol keamanan.
- Otorisasi backend sesungguhnya berada di `app/middlewares/auth.py` (dependency `require_owner`, `require_kepala_or_owner`, `require_kasir_teknisi_or_owner`, dll., dipakai per-route) dan sudah diverifikasi secara statis (audit kode, bukan request langsung ke setiap endpoint pada sesi ini) menegakkan role check di hampir seluruh endpoint. Beberapa catatan dari audit statis tersebut (bukan hasil pengujian dinamis, dan bukan sesuatu yang dapat diperbaiki dari sisi frontend karena aturan sesi melarang mengubah backend):
  - `GET /cod/{cod_id}` (detail COD) tidak memiliki pengecekan cross-branch seperti endpoint detail lain (units/service/transaksi/request-sparepart) — kasir/teknisi cabang lain berpotensi mengambil detail COD cabang lain bila menebak `cod_id`.
  - `GET /service` (list, bukan detail) tidak dibatasi per-role seperti endpoint list lain — kurir dan influencer (yang punya `cabang` di akun mereka) secara teknis bisa memanggil endpoint ini dan melihat seluruh tiket service cabangnya, meski frontend mereka tidak punya menu untuk itu.
  - `GET /karyawan/{id}/stats` mengembalikan envelope sukses tanpa key `message` (berbeda dari endpoint lain yang konsisten `{success,message,data}`) — tidak menyebabkan crash pada frontend saat ini karena tidak dibaca, tapi berisiko bila suatu saat ada kode yang mengasumsikan `message` selalu ada.
- Rekomendasi: item-item ini adalah temuan backend dan harus ditindaklanjuti oleh tim backend, bukan melalui perubahan frontend.

## Catatan lingkungan (bukan temuan produk)

- Sandbox eksekusi sesi ini memblokir seluruh akses internet umum kecuali daftar allowlist terbatas (npm/pypi registry, GitHub API, dll.) — `https://phonejaya.vercel.app` termasuk yang diblokir (proxy mengembalikan 403 "policy denial" pada CONNECT, dikonfirmasi lewat endpoint status proxy internal, bukan kesalahan konfigurasi TLS yang bisa diperbaiki dari sisi kita).
- Untuk tetap menuntaskan QA browser nyata sesuai permintaan (bukan sekadar audit kode statis), sesi ini menjalankan backend `phonejaya` **apa adanya** (tanpa modifikasi file apa pun) secara lokal di sandbox, memakai MongoDB in-memory (`mongomock-motor`, bukan server MongoDB sungguhan) yang di-seed dengan enam akun QA yang identik dengan kredensial di brief, plus data bisnis contoh (unit, transaksi, service, sparepart, customer, COD, dll.) untuk dua cabang (JYP, JYP2). Tidak ada koneksi ke database produksi, tidak ada data produksi yang dibaca/ditulis.
- Konsekuensi: seluruh temuan pada `fixedlogic.md` dan dokumen ini bersifat valid untuk **logika aplikasi** (frontend ↔ kontrak backend ↔ validasi), tetapi tidak dapat menjadi bukti tentang kondisi data produksi yang sesungguhnya (jumlah stok riil, transaksi riil, dll.) — hal itu berada di luar cakupan yang bisa diuji dari sandbox ini.

## Hal yang tidak dilakukan

- Tidak ada mutasi data bisnis produksi (seluruh pengujian tulis dilakukan terhadap database seed lokal, bukan produksi).
- Tidak ada perubahan file backend, dependency version, lockfile, atau environment variable pada repository backend.
- Tidak ada token, credential, isi `.env`, atau secret yang dicatat dalam dokumentasi ini.
