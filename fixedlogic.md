# QA Fixed Logic

Tanggal pengujian: 2026-08-06
Branch: `agent/security-ownership-fixes`
Metodologi: build produksi (`npm run build && npm run start`, port 3000) + Playwright browser nyata (login via UI, navigasi via klik sidebar — bukan hard reload) untuk keenam akun QA, terhadap backend `phonejaya` (kode sumber tidak diubah) yang dijalankan lokal dengan database seed karena `https://phonejaya.vercel.app` tidak dapat diakses dari sandbox eksekusi sesi ini (lihat catatan lingkungan di `notfixedlogic.md`). Semua temuan di bawah direproduksi dan diverifikasi ulang setelah perbaikan Fase 4.

Entri QA-001 s.d. QA-005 dari sesi sebelumnya (banyak berstatus "belum dapat diverifikasi") digantikan oleh entri di bawah, yang diverifikasi penuh end-to-end pada sesi ini.

## QA-101 — Login UI dan identitas akun, seluruh role

- Role: owner, kepala_cabang, kasir, teknisi, kurir, influencer
- Route: `/login` → landing page per role
- Alur: login melalui form UI nyata (bukan API langsung) untuk keenam akun QA di browser context terpisah, verifikasi redirect ke landing page yang benar, dan identitas (nama + role) yang tampil di sidebar/header.
- Hasil aktual: keenam akun berhasil login dan mendarat di landing page yang benar (`owner`→`/dashboard`, `kepala_cabang`→`/dashboard`, `kasir`→`/stok-kasir`, `teknisi`→`/service-list`, `kurir`→`/kurir-dashboard`, `influencer`→`/influencer-dashboard`). Nama dan role akun tampil benar di sidebar footer dan avatar header.
- Dampak UX: alur login jelas, loading state via spinner tombol, tidak ada redirect ganda/flicker.

## QA-102 — Route guard frontend (akses langsung route milik role lain)

- Role: seluruh role, diuji lintas sampai 9 route asing per role
- Route contoh: `/dashboard`, `/influencer-dashboard`, `/stok-kasir`, `/service-list`, `/kurir-dashboard`, `/karyawan`, `/cabang`, `/approval-repair`, `/transaksi`, `/log`
- Alur: setelah login sebagai role tertentu, ketik langsung URL milik role lain di address bar (bukan klik menu).
- Hasil aktual: untuk **setiap** kombinasi role×route asing yang diuji, halaman tetap di URL yang diminta tetapi menampilkan pesan `Halaman "<page>" tidak tersedia untuk role <role>.` beserta tombol kembali ke halaman utama role tersebut. Komponen halaman asli **tidak pernah mount** — dikonfirmasi tidak ada request data bisnis yang terkirim ke backend untuk route yang diblokir (network log kosong untuk endpoint terkait), dan tidak ada kebocoran data pada DOM.
- Catatan penting (lihat juga Aturan #4 di brief): ini murni **route guard frontend** (`isPageAllowedForRole` pada `src/app/(app)/layout.tsx`). Verifikasi otorisasi **backend** per endpoint didokumentasikan terpisah pada temuan referensi backend (lihat bagian bawah `notfixedlogic.md`) — backend memang menegakkan role check di hampir semua endpoint melalui dependency FastAPI, tapi ini dicatat sebagai lapisan yang berbeda dan tidak boleh disamakan dengan "menu tersembunyi = aman".

## QA-103 — Logout dan proteksi pasca-logout

- Role: seluruh role
- Route: tombol "Keluar" (menu akun di header) pada seluruh role
- Alur: klik avatar → klik "Keluar", lalu coba akses langsung route protected yang baru saja dikunjungi.
- Hasil aktual: logout membersihkan token dan state, redirect ke `/login` mulus tanpa flash konten. Setelah logout, akses langsung ke route protected via URL selalu diarahkan balik ke `/login` — tidak ada momen di mana data lama masih tampil.

## QA-104 — Empty state pada halaman tanpa data

- Role: kasir (Approval COD), teknisi (Log Aktivitas), kurir (Dashboard COD, Log Aktivitas), influencer (Dashboard, Video Saya, Log Aktivitas)
- Alur: buka halaman yang datanya kosong/belum ada untuk kondisi seed saat ini.
- Hasil aktual: seluruh halaman di atas menampilkan pesan kosong yang jelas dalam Bahasa Indonesia (mis. "Tidak ada notifikasi", pesan "belum ada" pada tabel/list) — tidak ada halaman blank atau layout yang rusak saat data kosong.

## QA-105 — Alur transaksi sparepart (guest checkout), role kasir

- Role: kasir
- Route: `/input-transaksi`
- Alur: tambahkan sparepart ke keranjang, pilih tipe customer Guest, isi nama, klik "Konfirmasi Transaksi".
- Hasil aktual: transaksi berhasil tersimpan, modal "Transaksi Berhasil" tampil dengan No. Struk, ringkasan item, total bayar, dan opsi "Cetak Struk"/"Tutup". Tidak ada error console maupun request gagal selama alur.

## QA-106 — Tambah Unit, role kasir (setelah perbaikan Fase 4 — lihat FIX-001)

- Role: kasir
- Route: `/tambah-unit`
- Alur: pilih Kategori + Kondisi Awal, isi IMEI tidak valid → submit (harus ditolak client-side tanpa request ke backend) → perbaiki IMEI menjadi valid → submit lagi.
- Hasil aktual: IMEI tidak valid ditolak di client dengan pesan jelas `IMEI harus 14-16 digit angka, atau isi "-" jika tidak ada` — dikonfirmasi nol request `POST /units` terkirim ke backend untuk kasus ini. Submit dengan data valid berhasil, backend mengembalikan ID unit yang benar (format `{CABANG}-{KAT}-{KONDISI}-{seq}`, contoh `JYP-IP-BN-101`), dan pesan sukses kontekstual dari backend ditampilkan langsung ke user.
- Sebelum perbaikan, workflow ini 100% gagal untuk setiap input (lihat FIX-001 di bawah).

## QA-107 — Halaman berbasis kartu/list (bukan tabel) merender data dengan benar

- Role: owner (Karyawan, Manajemen Cabang, Log Aktivitas), teknisi (Data Service), influencer (Katalog Produk)
- Alur: buka halaman, verifikasi visual via screenshot.
- Hasil aktual: seluruh halaman ini menggunakan layout kartu/grid (bukan `<table>`) dan merender data seed dengan benar — badge status, tombol aksi (Reset PW, Pecat, Set Kepala, Detail Statistik, dll) semua tampil sesuai role.

## QA-108 — Typecheck dan build produksi

- Alur: `npm run typecheck` lalu `npm run build` dijalankan ulang setelah perbaikan Fase 4.
- Hasil aktual: keduanya sukses tanpa error. Build menghasilkan 36 route statis, termasuk `/tambah-unit` (2.57 kB, naik dari 2.2 kB karena penambahan dua dropdown).

## QA-109 — Regresi akhir enam role pasca perbaikan

- Alur: ulangi navigasi penuh via klik sidebar untuk seluruh halaman milik enam role (14, 14, 9, 4, 3, 5 halaman) setelah perbaikan FIX-001 diterapkan.
- Hasil aktual: 0 console error dan 0 failed network request di seluruh 49 kunjungan halaman + 6 alur logout. Perbaikan pada `/tambah-unit` tidak menimbulkan regresi pada halaman/role lain.

---

## Riwayat perbaikan Fase 4

### FIX-001 — Form "Tambah Unit" tidak dapat menyimpan unit sama sekali

- Prioritas: Critical
- Role terdampak: kasir
- Route/komponen: `src/app/(app)/tambah-unit/page.tsx`
- Root cause: backend `UnitCreateRequest` (`app/schemas/unit.py`) mewajibkan field `kat_kode` dan `kondisi_kode` (tanpa default) untuk membangun `unit_id` dan label `kondisi` di server (`app/services/unit_service.py` → `next_unit_id()`). Form frontend tidak memiliki field ini sama sekali — sebagai gantinya field "Unit ID" bebas teks diminta dari user, padahal backend **selalu** men-generate `unit_id` sendiri dan mengabaikan input tersebut. Setiap submit — apapun isinya — pasti gagal 422 dengan pesan mentah Pydantic tanpa nama field: `Field required; Field required`. Field "Kondisi / Kelengkapan" juga terbukti tidak pernah dibaca backend (tidak ada di schema, otomatis diabaikan) sehingga menyesatkan user yang mengira input tersebut tersimpan.
- Perbaikan: menambahkan dropdown "Kategori" (kat_kode: iPhone/Android/Tablet/Accessories) dan "Kondisi Awal" (kondisi_kode: Baru-Normal/Minus/Ex Inter/Reject) sesuai mapping asli backend (`_KATEGORI_MAP`/`_KONDISI_MAP` di `app/utils/id_generator.py`), menghapus field "Unit ID" manual dan field "Kondisi / Kelengkapan" yang tidak pernah tersimpan, serta menampilkan ID yang benar-benar di-generate backend pada pesan sukses (`response.data.unit_id`, bukan input user).
- Perbaikan tambahan (validasi IMEI): backend memvalidasi IMEI dengan regex `^\d{14,16}$` (kecuali sentinel `"-"`) — bukan panjang yang dikira-kira. Ditambahkan validasi client-side yang sama persis sebelum request dikirim, dengan pesan `IMEI harus 14-16 digit angka, atau isi "-" jika tidak ada`, agar user tidak perlu menunggu round-trip ke server untuk kesalahan format yang sederhana.
- Verifikasi: lihat QA-106. Typecheck + build sukses; retest browser mengonfirmasi IMEI invalid diblokir tanpa network call, dan submit valid berhasil dengan ID server yang benar.
