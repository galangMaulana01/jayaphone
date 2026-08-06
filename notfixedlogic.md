# QA Not Fixed / Belum Terverifikasi

Tanggal pengujian: 2026-08-06
Branch: `claude/jayaphone-frontend-qa-3lyr4h` (riwayat sebelumnya di branch ini sudah merge ke `main`; sesi lanjutan dimulai ulang dari `main` terbaru sesuai aturan sesi)

Sesi sebelumnya (QA-UNVERIFIED-001/002/003, QA-OBS-004) tidak dapat menyelesaikan QA browser nyata karena — seperti dikonfirmasi pada sesi itu — sandbox eksekusi memblokir akses jaringan keluar ke `https://phonejaya.vercel.app` (kebijakan egress proxy sesi menolak host tersebut dengan 403, dikonfirmasi lewat endpoint status proxy, bukan bug TLS/config yang bisa diperbaiki). Item tersebut **digantikan** oleh `fixedlogic.md` QA-101 s.d. QA-109, yang berhasil menuntaskan QA browser nyata dengan menjalankan backend `phonejaya` (kode sumber tidak diubah sama sekali) secara lokal di dalam sandbox, memakai database in-memory yang di-seed dengan enam akun QA yang sama plus data bisnis contoh — bukan data/koneksi produksi. Sesi lanjutan (dokumentasi di bawah + `fixedlogic.md` FIX-002 s.d. FIX-006 dan QA-110 s.d. QA-120) memakai metodologi identik untuk menutup NF-001 (wajib) dan menguntaskan seluruh 11 workflow tulis di NF-002. Detail metodologi ada di bagian "Catatan lingkungan" di bawah.

Dokumen ini berisi bug terverifikasi yang **belum** diperbaiki pada siklus ini, serta area yang sengaja belum diuji.

## NF-001 — Approval COD-Beli tidak menyediakan input kategori/kondisi unit (STATUS: DIPERBAIKI, lihat FIX-002)

- Status: **ditutup pada sesi lanjutan** — akar masalah diperbaiki, retest lolos (kasus blokir client-side, payload benar, dan jalur sukses end-to-end). Detail lengkap root cause, perbaikan, dan bukti retest sudah dipindahkan ke `fixedlogic.md` → **FIX-002**. Entri ini disisakan sebagai jejak referensi historis, bukan bug aktif.

## NF-002 — Workflow tulis (mutasi): hasil QA end-to-end (STATUS: DITUTUP — lihat rincian per item di bawah)

- Status: seluruh 11 workflow yang diwajibkan brief sudah diuji end-to-end (jalur sukses + jalur validasi-gagal/rejected-condition + status/data change + UI feedback + role restriction) terhadap backend lokal dengan dataset seed aman.
- **9 dari 11 workflow LOLOS tanpa perlu perbaikan** (bukti test di `fixedlogic.md`): Approval Repair (QA-110), Transfer Stok (QA-113), Data Customer (QA-114), Karyawan (QA-115), Data Service (QA-116), Sparepart (QA-117), Pengaturan/password (QA-118) — plus 2 workflow yang **butuh perbaikan frontend dan sekarang lolos**: Approval Sparepart (FIX-003 + QA-111) dan Request Sparepart (FIX-004 + QA-112).
- **1 dari 11 workflow (COD sisi kurir) ditutup sebagian**: accept, seluruh transisi status, dan submit-beli LOLOS (QA-119, setelah FIX-006 menghapus satu aksi yang backend-nya tidak pernah mendukung — lihat NF-006 di bawah untuk gap backend yang mendasarinya). Sub-aksi "Input Stok" untuk item non-beli tidak dapat diuji karena kode tersebut tidak pernah tereksekusi pada kondisi apa pun (dead/unreachable code) — lihat **NF-007** untuk alasan objektifnya, bukan digolongkan sebagai bug karena tidak berdampak ke user manapun.
- Manajemen Cabang awalnya GAGAL total (form Tambah/Edit hilang begitu field Kode diisi, lihat FIX-005) — sekarang LOLOS setelah perbaikan (bukti retest ada langsung di entri FIX-005: tambah cabang, set kepala, nonaktifkan, semua sukses).
- Detail retest, evidence, dan payload untuk setiap item ada di `fixedlogic.md` pada entri FIX-002 s.d. FIX-006 dan QA-110 s.d. QA-120.

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
- Catatan sesi lanjutan: tidak ada perubahan frontend pada sesi ini yang menyamarkan atau menutupi ketiga gap otorisasi backend di atas — status tetap sama seperti saat pertama kali dicatat, murni sebagai follow-up backend yang belum ditindaklanjuti.

## NF-005 — Backend: `ApproveBeliRequest.harga_jual` validator tidak pernah melihat `unit_data` karena urutan deklarasi field Pydantic v2 (BUKAN diperbaiki — larangan sesi mengubah backend)

- Prioritas: Medium
- Status: bug backend terkonfirmasi (ditemukan saat retest FIX-002/NF-001), **tidak diperbaiki** — aturan sesi melarang mengubah backend untuk menutupi kontrak yang salah, dan ini murni kode backend.
- Role terdampak: kasir (approve COD-beli untuk unit berkondisi Repair)
- Halaman/endpoint: `POST /cod/{cod_id}/approve` — skema `app/schemas/cod.py` → `ApproveBeliRequest`
- Langkah reproduksi: approve request COD-beli yang `unit_data.kondisi_hp === "Repair"` (harusnya tidak wajib isi harga jual toko, karena unit Repair belum tentu langsung dijual) tanpa mengisi `harga_jual`.
- Hasil aktual vs harapan: request selalu ditolak 422 "harga_jual wajib diisi", padahal secara bisnis unit Repair semestinya dikecualikan dari kewajiban ini. Root cause: `field_validator` pada `harga_jual` membaca `info.data.get("unit_data", {})` untuk memutuskan pengecualian — tetapi di Pydantic v2, `info.data` pada saat validator sebuah field berjalan **hanya** berisi field yang sudah divalidasi sebelumnya sesuai urutan deklarasi di kelas. Karena `harga_jual` dideklarasikan **sebelum** `unit_data` di kelas `ApproveBeliRequest`, `info.data["unit_data"]` selalu berupa dict kosong saat validator `harga_jual` berjalan — pengecualian untuk unit Repair tidak akan pernah aktif.
- Dampak: kasir tidak bisa approve COD-beli unit Repair tanpa mengisi harga jual toko akal-akalan (workaround yang salah secara bisnis), atau approval gagal total untuk kasus ini.
- Cara verifikasi ditemukan (bukan diperbaiki): retest NF-001 Kasus B menangkap 422 ini walau payload frontend sudah 100% benar (kategori/kondisi terisi sesuai pilihan) — membuktikan blocker ada di backend, bukan di frontend yang baru diperbaiki (FIX-002). Untuk menyelesaikan retest jalur-sukses penuh (Kasus C), Kondisi HP sengaja diubah ke "Mulus" agar tidak menyentuh bug ini — bukan cara memperbaikinya, hanya cara menghindarinya demi memverifikasi FIX-002 secara independen.
- Rekomendasi perbaikan (untuk tim backend): pindahkan deklarasi `unit_data` sebelum `harga_jual` di `ApproveBeliRequest`, atau ganti ke `model_validator(mode="after")` di level model agar bisa melihat seluruh field tanpa tergantung urutan deklarasi.

## NF-006 — Backend: tidak ada jalur yang didukung untuk kurir menolak broadcast COD yang belum diambil (`menunggu_kurir → ditolak` tidak dapat dieksekusi meski dideklarasikan valid)

- Prioritas: Medium
- Status: gap backend terkonfirmasi (dibaca dari kode + dicoba langsung lewat dua endpoint berbeda), **tidak diperbaiki** — mitigasi yang dilakukan murni di frontend (menghapus tombol yang tidak mungkin berhasil), lihat FIX-006 di `fixedlogic.md`.
- Role terdampak: kurir
- Endpoint yang dicoba: `POST /cod/kurir/{cod_id}/reject` (umum) dan `POST /cod/kurir/{cod_id}/reject-beli` (khusus tahap `sudah_bertemu_penjual`)
- Detail: `COD_BELI_FLOW`/`COD_JUAL_FLOW`/`COD_DELIVERY_FLOW` di `app/services/cod_service.py` semuanya mendeklarasikan `"menunggu_kurir": ["diterima", "ditolak"]` sebagai transisi valid. Namun `update_cod_status`'s logika klaim atomik hanya memberi pengecualian kepemilikan untuk `new_status == "diterima"` — tidak ada pengecualian setara untuk `"ditolak"`, sehingga pengecekan "apakah kamu kurir yang ditugaskan" pada jalur reject selalu gagal untuk item yang `kurir_id`-nya masih `None` (belum diambil siapa pun). Endpoint `reject-beli` juga tidak bisa dipakai karena mensyaratkan status sudah di `sudah_bertemu_penjual` dengan kurir yang sudah ter-assign — dua prasyarat yang bertentangan dengan skenario "menolak sebelum diambil".
- Dampak bisnis: kurir tidak punya cara resmi untuk secara aktif menandai "saya tidak mau job broadcast ini" — satu-satunya cara adalah mengabaikannya (tidak accept), yang secara fungsional setara tapi tidak memberi sinyal/data eksplisit ke sistem (mis. untuk analitik alasan penolakan).
- Rekomendasi perbaikan (untuk tim backend): tambahkan pengecualian kepemilikan yang sama untuk `new_status == "ditolak"` pada item yang `kurir_id` masih `None`, ATAU hapus `"ditolak"` dari daftar transisi valid `menunggu_kurir` di ketiga flow tersebut agar kontraknya konsisten dengan implementasi (saat ini kontrak deklaratif dan implementasi tidak sinkron).

## NF-007 — Frontend: aksi "Input Stok" kurir untuk item non-beli tidak dapat diuji — dead/unreachable code, bukan bug aktif

- Prioritas: Low (informational, bukan defect yang berdampak ke user)
- Status: genuinely untestable — bukan gagal diuji karena keterbatasan waktu, tapi karena kombinasi state yang memicunya **tidak pernah terjadi** pada kontrak backend saat ini
- Halaman/komponen: `src/app/(app)/kurir-dashboard/page.tsx` — fungsi `inputStok()` dan cabang modal `selected?.type !== "beli"` pada modal "sudah_bertemu_penjual"
- Alasan objektif tidak dapat diuji: status `sudah_bertemu_penjual` **hanya** ada di `COD_BELI_FLOW` (`app/services/cod_service.py`) — `COD_JUAL_FLOW` dan `COD_DELIVERY_FLOW` tidak pernah memasuki status ini sama sekali (alur jual: `diterima → barang_akan_dijemput → barang_sudah_diambil → kurir_sedang_transaksi`; alur delivery: `diterima → kurir_menuju_toko → barang_sudah_diambil → sedang_diantar`). Karena modal yang memunculkan tombol "Input Stok" (untuk `item.type !== "beli"`) hanya terbuka ketika `item.status === "sudah_bertemu_penjual"`, dan status itu tidak pernah muncul untuk item bertipe selain "beli", kombinasi `type !== "beli"` DAN `status === "sudah_bertemu_penjual"` **mustahil terjadi** — `inputStok()` adalah dead code yang tidak bisa dijalankan lewat UI apa pun, bukan sesuatu yang "belum diuji" karena kurang waktu.
- Catatan tambahan (bukan bug aktif karena tidak pernah tereksekusi, tapi dicatat untuk transparansi jika suatu saat kode ini dihidupkan kembali): endpoint `POST /cod/kurir/input-stok` (`app/routes/cod.py`) membaca `payload.get("kat_kode", "AI")` dan `payload.get("kondisi_kode", "BN")` untuk membangun unit — sementara draft unit di frontend memakai key `kondisi` (bukan `kondisi_kode`) dan tidak pernah mengirim `kat_kode` sama sekali. Jika endpoint ini suatu saat dipakai, unit yang terbentuk akan mengalami masalah kategorisasi diam-diam yang sama seperti NF-001/FIX-002. Tidak diperbaiki pada sesi ini karena kode ini tidak reachable — memperbaiki fungsi yang tidak pernah dipanggil bukan prioritas, dan berisiko menambah kompleksitas tanpa manfaat yang bisa diverifikasi.
- Rekomendasi: keputusan produk — jika "kurir input stok langsung tanpa lewat kasir" untuk COD-jual memang fitur yang diinginkan, perlu ditambahkan status baru (mis. `sudah_bertemu_penjual`) ke `COD_JUAL_FLOW`/`COD_DELIVERY_FLOW` di backend beserta transisi UI yang sesuai. Jika tidak, `inputStok()`/tombol terkait sebaiknya dihapus sebagai dead code pada siklus pembersihan berikutnya — tidak dihapus pada sesi ini karena di luar cakupan NF-002 (menguji, bukan membersihkan kode yang tidak terkait langsung dengan bug yang ditemukan).

## Catatan lingkungan (bukan temuan produk)

- Sandbox eksekusi sesi ini memblokir seluruh akses internet umum kecuali daftar allowlist terbatas (npm/pypi registry, GitHub API, dll.) — `https://phonejaya.vercel.app` termasuk yang diblokir (proxy mengembalikan 403 "policy denial" pada CONNECT, dikonfirmasi lewat endpoint status proxy internal, bukan kesalahan konfigurasi TLS yang bisa diperbaiki dari sisi kita).
- Untuk tetap menuntaskan QA browser nyata sesuai permintaan (bukan sekadar audit kode statis), sesi ini menjalankan backend `phonejaya` **apa adanya** (tanpa modifikasi file apa pun) secara lokal di sandbox, memakai MongoDB in-memory (`mongomock-motor`, bukan server MongoDB sungguhan) yang di-seed dengan enam akun QA yang identik dengan kredensial di brief, plus data bisnis contoh (unit, transaksi, service, sparepart, customer, COD, dll.) untuk dua cabang (JYP, JYP2). Tidak ada koneksi ke database produksi, tidak ada data produksi yang dibaca/ditulis.
- Konsekuensi: seluruh temuan pada `fixedlogic.md` dan dokumen ini bersifat valid untuk **logika aplikasi** (frontend ↔ kontrak backend ↔ validasi), tetapi tidak dapat menjadi bukti tentang kondisi data produksi yang sesungguhnya (jumlah stok riil, transaksi riil, dll.) — hal itu berada di luar cakupan yang bisa diuji dari sandbox ini.

## Hal yang tidak dilakukan

- Tidak ada mutasi data bisnis produksi (seluruh pengujian tulis dilakukan terhadap database seed lokal, bukan produksi).
- Tidak ada perubahan file backend, dependency version, lockfile, atau environment variable pada repository backend.
- Tidak ada token, credential, isi `.env`, atau secret yang dicatat dalam dokumentasi ini.
