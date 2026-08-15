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

---

## Sesi lanjutan — NF-001 (wajib) dan QA tulis (write) untuk NF-002

Tanggal pengujian: 2026-08-06 (lanjutan hari yang sama)
Branch: `claude/jayaphone-frontend-qa-3lyr4h` (dibuat ulang dari `main` terbaru — PR sesi sebelumnya untuk branch ini sudah merge, sehingga sesi ini memulai riwayat baru dari `main`, sesuai aturan sesi).
Metodologi: sama seperti sesi Fase 4 (build produksi + Playwright browser nyata), backend `phonejaya` dijalankan lokal (kode sumber tidak diubah) dengan MongoDB in-memory (`mongomock-motor`) yang di-seed data QA aman untuk keenam akun + skenario tambahan (COD beli/jual, service, request sparepart, dll.) — **bukan** data/koneksi produksi. Seluruh aksi tulis (create/update/approve/reject) pada bagian ini dieksekusi terhadap dataset seed lokal tersebut.

### FIX-002 — Approval COD-Beli tidak menyediakan input Kategori/Kondisi Awal unit (menutup NF-001)

- Prioritas: High
- Role terdampak: kasir, owner (unit hasil approval COD-beli)
- Route/komponen: `src/app/(app)/approval-cod/page.tsx`, `src/lib/api/index.ts` (`cod.approve`), file baru `src/lib/config/unitCodes.ts`
- Root cause: sama pola dengan FIX-001 — modal approve COD-beli tidak punya field Kategori/Kondisi Awal sama sekali, sehingga `unit_data` yang dikirim tidak pernah membawa `kat_kode`/`kondisi_kode`. Backend (`app/services/cod_service.py`) diam-diam default ke `kat_kode="AI"` (Android), `kondisi_kode="BN"` (Baru/Normal) ketika field ini absen — setiap unit dari jalur COD-beli tercatat sebagai Android/Baru apa pun kondisi HP aslinya (termasuk iPhone rusak/Repair).
- Perbaikan:
  - Dibuat modul terpusat `src/lib/config/unitCodes.ts` (`KATEGORI_OPTIONS`, `KONDISI_OPTIONS`, `IMEI_PATTERN`, helper label) sebagai **satu-satunya** sumber opsi/label, dipakai bersama oleh Tambah Unit (FIX-001) dan Approval COD-Beli — sesuai permintaan agar kedua form konsisten.
  - Modal approve COD-beli sekarang punya dua dropdown wajib: Kategori dan Kondisi Awal, dengan teks bantu "Kategori dan Kondisi Awal menentukan ID unit yang dibuat (contoh: JYP-IP-BN-005) dan kategori stok pada laporan — pilih sesuai kondisi HP sebenarnya, bukan default."
  - Kedua field direset ke kosong (`""`) setiap kali modal dibuka (`openApprove()`) — tidak pernah membawa nilai sisa dari approval sebelumnya.
  - Validasi client-side: submit diblokir dengan toast "Kategori dan Kondisi Awal unit wajib dipilih sebelum approve" jika salah satu kosong — nol request ke `/cod/{id}/approve` terkirim saat diblokir.
  - `unit_data` yang dikirim membawa `kat_kode`, `kondisi_kode`, dan label turunannya (`kategori`, `kondisi`) langsung dari pilihan user (`labelForKatKode`/`labelForKondisiKode`), tidak pernah dari default tersembunyi.
- Retest (lihat juga `nf001_retest.js`):
  - **Kasus A (blokir client-side)**: buka approve untuk request COD-beli iPhone 13 Pro Max kondisi Repair tanpa pilih Kategori/Kondisi Awal → klik "Approve & Simpan" → toast blokir tampil, **0** request `POST /cod/{id}/approve` terkirim ke backend (dikonfirmasi via network listener).
  - **Kasus B (payload benar, bukan default)**: pilih Kategori=iPhone, Kondisi Awal=Ex Inter, Kondisi HP tetap "Repair" (persis seperti input kurir) → payload keluar yang tertangkap: `unit_data.kat_kode === "IP"`, `unit_data.kondisi_kode === "EX"`, `unit_data.kategori === "iPhone"` (bukan "Android"), `unit_data.kondisi === "Ex Inter"` (bukan "Baru/Normal"), `unit_data.kondisi_hp` tetap "Repair" — seluruhnya benar, tidak ada nilai yang diam-diam berubah jadi default lama.
  - **Kasus C (jalur sukses penuh end-to-end)**: approve dengan Kategori=iPhone, Kondisi Awal=Ex Inter, Kondisi HP=Mulus (untuk menghindari bug backend NF-005 yang tidak berkaitan — lihat `notfixedlogic.md`) → toast sukses tampil, unit baru terverifikasi via API (`GET /units?cabang=JYP`) dengan `kategori`, `kondisi`, `kondisi_hp` yang benar-benar sesuai pilihan, bukan Android/Baru.
  - Tipe approval COD lain (jual, delivery) tidak tersentuh oleh perubahan ini — modal approve COD-beli adalah satu-satunya yang memiliki draft unit; dikonfirmasi tidak ada regresi pada daftar/aksi approval COD lain saat retest.
- Verifikasi: `npm run typecheck` dan `npm run build` sukses setelah perubahan.

### FIX-003 — Approval Sparepart mengirim Mongo `_id` padahal backend mencocokkan berdasarkan `req_id`

- Prioritas: High
- Role terdampak: kasir
- Route/komponen: `src/app/(app)/approval-sparepart/page.tsx`, `src/lib/api/index.ts` (`requestSparepart.approve`)
- Root cause: backend (`app/services/request_sparepart_service.py` → `approve_request`) melakukan filter atomik berdasarkan field bisnis `req_id` (contoh `JYP-REQ-001`), bukan `_id` Mongo. Frontend memanggil `Api.requestSparepart.approve(selected.id, ...)` — `selected.id` adalah `_id` Mongo, bukan `req_id` — sehingga filter atomik backend tidak pernah menemukan dokumen yang cocok dan mengembalikan `409 Conflict` untuk **setiap** approval, apa pun datanya.
- Perbaikan: menambahkan field `req_id: string` ke tipe `RequestSparepart` (`src/lib/types/index.ts`) dan mengganti seluruh pemanggilan `.approve()` serta tampilan tabel untuk memakai `r.req_id`, bukan `r.id`.
- Retest: lihat QA-111 — approve dengan harga valid sekarang sukses (sebelumnya selalu 409).
- Verifikasi: `npm run typecheck` dan `npm run build` sukses.

### FIX-004 — Request Sparepart: approval Kepala Cabang memanggil endpoint kasir-only (403), dan form create kehilangan field wajib backend

- Prioritas: High
- Role terdampak: teknisi (create), kepala_cabang (respond/approve)
- Route/komponen: `src/app/(app)/request-sparepart/page.tsx`
- Root cause (dua bug independen di komponen yang sama):
  1. Fungsi `respond()` yang dipakai tombol "Setujui" milik kepala cabang memanggil `Api.requestSparepart.approve(...)` — endpoint ini (`app/routes/request_sparepart.py` → hanya menerima role kasir, dipakai untuk approval **harga**) mengembalikan 403 untuk kepala cabang. Kepala cabang seharusnya memanggil endpoint `respond` (`status: "Diterima"|"Ditolak"`) sesuai peran gate-nya di alur (KC menyetujui permintaan secara prinsip; kasir yang approve harga di tahap berikutnya).
  2. Form "+ Request Baru" (teknisi) tidak memiliki field `service_id` (wajib — backend memvalidasi teknisi hanya boleh request untuk service yang sedang dia kerjakan) maupun `product_link` (wajib ketika `sp_id` kosong, sesuai `validate_product_link` di `app/schemas/request_sparepart.py`, untuk part baru/belum terkatalog) — submit untuk part baru selalu gagal validasi backend tanpa pesan yang jelas di frontend.
- Perbaikan:
  - `respond()` ditulis ulang: hanya menerima keputusan `"Diterima"|"Ditolak"`, selalu memanggil `Api.requestSparepart.respond(selected.req_id, {status, estimasi_tiba, catatan})` — tidak lagi memanggil `.approve()` untuk keputusan kepala cabang.
  - `canCreate` dibatasi ke role teknisi, `canApprove`/tombol respond dibatasi ke role kepala_cabang (sebelumnya gating role tidak konsisten dengan kontrak backend).
  - Ditambahkan field "Link Produk" (wajib, tipe url) yang tampil saat SP ID dikosongkan, dan field "Service ID" ditandai wajib dengan teks bantu. Field "Harga Jual" yang tidak pernah dibaca backend pada tahap create dihapus dari modal ini (bukan bagian skema `RequestSparepartCreateRequest`).
- Retest: lihat QA-112 — create dengan Link Produk terisi sukses; create dengan field kosong diblokir client-side; respond kepala cabang (Setujui) sukses tanpa 403.
- Verifikasi: `npm run typecheck` dan `npm run build` sukses.

### QA-110 — Approval Repair, role kasir

- Route: `/approval-repair`
- Alur: approve unit repair (SVC-004, iPhone 11) dengan harga jual kosong (blokir) lalu isi 3.200.000 (sukses); role-check teknisi memanggil `POST /units/{id}/approve-repair` langsung → 403.
- Hasil: blokir dengan pesan "Harga jual harus lebih dari 0", 0 network call saat diblokir. Setelah isi harga, sukses — unit terverifikasi via API berstatus `Tersedia` dengan `harga_jual` benar. Teknisi mendapat 403 sesuai role restriction. 0 console error.

### QA-111 — Approval Sparepart, role kasir (setelah perbaikan FIX-003)

- Route: `/approval-sparepart`
- Alur: proses request "Baterai iPhone 12" dengan harga jual kosong (blokir) lalu isi 175.000 (sukses).
- Hasil: blokir dengan pesan "Harga jual wajib diisi", 0 network call saat diblokir. Submit dengan harga valid sukses, toast "disetujui" tampil. 0 console error, 0 failed request.

### QA-112 — Request Sparepart: create (teknisi) + respond (kepala cabang) (setelah perbaikan FIX-004)

- Role: teknisi (create), kepala_cabang (respond)
- Route: `/request-sparepart`
- Alur teknisi: buka "+ Request Baru", isi Nama Sparepart + Service ID (SVC-001) + Link Produk (karena SP ID dikosongkan — part baru/belum terkatalog) → sukses; lalu coba submit kosong → blokir "Nama sparepart dan jumlah wajib diisi", 0 POST.
- Alur kepala cabang: proses request "LCD iPhone 11" (Pending) → klik "Tolak" tanpa catatan → blokir "Catatan wajib diisi saat menolak", 0 `POST /respond`; isi tanggal estimasi + catatan lalu klik "Setujui" → sukses, toast "diterima" tampil, payload `respond` terverifikasi mengandung `status: "Diterima"`.
- Hasil: 0 console error di kedua sisi.

### QA-113 — Transfer Stok: create (kepala cabang) + approve/reject (owner)

- Role: kepala_cabang (create), owner (respond), kasir (role-check)
- Route: `/transfer-stok`
- Alur: kepala cabang buka "+ Transfer Baru", submit tanpa pilih cabang tujuan/unit → blokir "Pilih cabang tujuan dan minimal satu unit", 0 POST; pilih cabang JYP2 + unit JYP-IP-BN-001 → sukses, toast "berhasil diajukan". Kasir mengakses `/transfer-stok` langsung via URL → route guard menampilkan pesan "tidak tersedia" (kasir memang tidak punya menu ini). Owner memproses TRF-001 (Pending) → klik Tolak tanpa catatan → blokir "Catatan wajib diisi jika transfer ditolak", 0 PATCH; isi catatan → sukses, toast "ditolak" tampil.
- Hasil: 0 console error, 0 failed request di seluruh alur.

### QA-114 — Data Customer: create (kasir) + approve/reject/resubmit (kepala cabang/kasir)

- Role: kasir (create, resubmit), kepala_cabang (approve/reject)
- Route: `/customers`
- Alur: kasir tambah customer baru dengan field kosong → blokir "Nama dan kontak wajib diisi", 0 POST; isi data valid → sukses, dan dikonfirmasi kasir tidak melihat tombol Setujui/Tolak (bukan approver). Kepala cabang menolak customer baru tanpa alasan → blokir "Alasan reject wajib diisi", 0 PATCH; isi alasan → sukses (badge menjadi Rejected). Kepala cabang approve customer Pending lain → sukses, toast "disetujui". Kasir mengajukan ulang customer yang sudah Rejected → sukses, toast "diajukan ulang".
- Hasil: 0 console error, 0 failed request.

### QA-115 — Karyawan: tambah (kepala cabang) + reset password & nonaktifkan (owner)

- Role: kepala_cabang (create), owner (reset password, pecat)
- Route: `/karyawan`
- Alur: kepala cabang tambah karyawan QA baru dengan field kosong → blokir "Nama, username, dan password wajib diisi", 0 POST; isi data valid → sukses, dan dikonfirmasi kepala cabang tidak melihat tombol Reset PW/Pecat (owner-only). Owner reset password karyawan tersebut dengan password pendek → blokir "Password minimal 6 karakter", 0 PATCH; isi password valid → sukses, **diverifikasi dengan login ulang memakai password baru — berhasil**. Owner menonaktifkan (Pecat) karyawan QA tersebut → sukses, toast "dinonaktifkan".
- Hasil: 0 console error, 0 failed request. Data yang diubah adalah karyawan QA yang dibuat khusus untuk pengujian ini, bukan data produksi.

### FIX-005 — Form Tambah/Edit Cabang hilang total saat mengisi field "Kode" pada mode tambah

- Prioritas: Critical
- Role terdampak: owner (satu-satunya role dengan akses Manajemen Cabang)
- Route/komponen: `src/app/(app)/cabang/page.tsx`
- Root cause: modal Tambah/Edit Cabang dibungkus ternary rusak `{(!editing&&form.kode==="")||editing?<div>...form...</div>:null}` — kondisi ini benar hanya saat form baru dibuka (kode masih `""`) atau saat mode edit. Begitu user mengetik satu karakter pada field Kode di mode **tambah**, `form.kode===""` menjadi `false`, `editing` tetap `null`, sehingga seluruh form (termasuk field lain dan tombol Simpan) langsung lenyap dari DOM — modal jadi kosong, tidak bisa dipakai untuk menambah cabang sama sekali.
- Perbaikan: ternary rusak dihapus, div form sekarang selalu dirender di dalam `<Modal>` (tanpa syarat berbasis nilai `form.kode`) — modal terbuka/tertutup tetap dikontrol oleh prop `isOpen` pada `<Modal>` seperti seharusnya.
- Retest: buka "+ Tambah Cabang", isi field Kode ("JYP3") lebih dulu → field lain (Nama Cabang, dst.) dan tombol Simpan tetap terlihat/berfungsi (sebelum perbaikan ini akan lenyap) → isi Nama → submit → sukses, toast "berhasil ditambahkan". Lanjut set kepala cabang (blokir field kosong → sukses dengan data valid, diverifikasi login dengan akun kepala baru berhasil) dan nonaktifkan cabang (sukses). 0 console error, 0 failed request di seluruh alur.
- Verifikasi: `npm run typecheck` dan `npm run build` sukses setelah perubahan.

### QA-116 — Data Service: update status oleh teknisi

- Role: teknisi
- Route: `/service-list`
- Alur: update SVC-002 dari "Antrian" ke "Proses" tanpa upload Foto BEFORE → blokir "Foto BEFORE wajib diupload", 0 `PUT /service/{id}`. Update SVC-002 dari "Antrian" ke "Ditolak" (transisi yang memang tidak mewajibkan foto) dengan catatan → sukses, toast "berhasil diupdate".
- Hasil: 0 console error.

### QA-117 — Sparepart: update stok oleh kepala cabang

- Role: kepala_cabang
- Route: `/sparepart`
- Alur: buka Update Stok "Baterai Samsung S21", klik Simpan tanpa mengubah delta → tombol berlaku sebagai no-op guard (0 `PATCH /sparepart/{id}/stok` terkirim untuk delta kosong); isi delta -3 dengan catatan "Terpakai untuk service SVC-001" → sukses, toast "diperbarui".
- Hasil: 0 console error.

### QA-118 — Pengaturan (Settings): ubah password, role kasir

- Role: kasir
- Route: `/settings`
- Alur: isi password baru "short" (di bawah minimum) pada kedua field konfirmasi → blokir "Password minimal 6 karakter", 0 `PATCH /auth/me/password`; isi password baru yang valid dan cocok pada kedua field → sukses, toast "berhasil diubah". **Diverifikasi login ulang dengan password baru — berhasil.**
- Hasil: 0 console error.
- Catatan: pengujian ubah profil/foto pada halaman ini tidak dilakukan pada siklus ini — lihat `notfixedlogic.md` untuk alasan objektifnya (bukan ditandai sebagai bug).

### FIX-006 — Tombol "Reject" pada COD kurir (status `menunggu_kurir`) tidak pernah berhasil — dihapus dari frontend

- Prioritas: Medium
- Role terdampak: kurir
- Route/komponen: `src/app/(app)/kurir-dashboard/page.tsx`
- Root cause (backend, bukan sesuatu yang bisa "diperbaiki" dari frontend tanpa mengubah kontrak): tombol Reject pada item COD yang masih berstatus `menunggu_kurir` (belum diambil kurir mana pun) awalnya memanggil endpoint reject umum. Investigasi kode `app/services/cod_service.py` (`update_cod_status`) menunjukkan logika "klaim atomik" hanya punya pengecualian kepemilikan untuk transisi `new_status == "diterima"` — **tidak ada** pengecualian serupa untuk `"ditolak"`. Karena item `menunggu_kurir` belum punya `kurir_id` (masih `None`), pengecekan kepemilikan pada jalur reject akan selalu gagal dengan 403 "Bukan kurir yang ditugaskan", walaupun `COD_BELI_FLOW`/`COD_JUAL_FLOW`/`COD_DELIVERY_FLOW` secara deklaratif mencantumkan `menunggu_kurir → ditolak` sebagai transisi yang valid. Endpoint reject khusus COD-beli (`reject-beli`) juga tidak bisa dipakai di sini karena mensyaratkan status `sudah_bertemu_penjual` + `kurir_id` yang sudah ter-assign — dua prasyarat yang justru belum terpenuhi pada tahap `menunggu_kurir`. Kesimpulannya: **tidak ada jalur backend yang mendukung kurir menolak broadcast job yang belum diambil**, meski UI menyediakan tombolnya.
- Kenapa tidak "diperbaiki" dengan mengganti endpoint lagi: sudah dicoba pada endpoint reject umum maupun `reject-beli` — keduanya gagal karena alasan kontrak di atas, bukan karena kesalahan pemilihan endpoint di frontend. Mengubah backend untuk menutupi ini dilarang secara eksplisit oleh aturan sesi ini.
- Perbaikan (frontend-only, sesuai aturan agar tidak meninggalkan aksi yang permanen gagal): tombol "Reject" dan modal "Reject COD" untuk status `menunggu_kurir` dihapus dari `kurir-dashboard`. Kurir yang tidak berminat pada suatu broadcast job cukup membiarkannya (tidak accept) — job tetap tersedia untuk kurir lain, sehingga tidak ada kehilangan fungsi bisnis, hanya menghapus tombol yang sebelumnya selalu gagal.
- Retest (`kurir_retest.js`): pada baris item `menunggu_kurir`, tombol Reject sudah tidak ada (`count === 0`), tombol Accept tetap ada dan berfungsi (POST `/accept` terkirim, toast "diterima" tampil), tidak ada sisa modal "Reject COD" di halaman manapun. 0 console error.
- Verifikasi: `npm run typecheck` dan `npm run build` sukses setelah perubahan.
- Tindak lanjut backend (tidak diubah dari sesi ini): lihat NF-006 di `notfixedlogic.md`.

### QA-119 — COD sisi kurir: alur status penuh + submit beli (setelah FIX-006)

- Role: kurir
- Route: `/kurir-dashboard`
- Alur: accept broadcast job COD-beli (`menunggu_kurir → diterima`) → "Mulai Tugas" (`→ kurir_menuju_lokasi`) → "Sudah Bertemu" (`→ sudah_bertemu_penjual`) → "Submit Data Beli" dengan field kosong → blokir "Harga deal dan data unit wajib diisi", 0 `POST /submit-beli`; isi harga deal + data unit lengkap → sukses, toast "dikirim untuk approval" tampil, payload terverifikasi membawa `deal_price` dan `unit_data` yang benar, dan status COD berpindah ke `menunggu_approval_kasir` (diverifikasi via API).
- Hasil: 0 console error di seluruh rangkaian status.
- Catatan: aksi "Input Stok" (untuk tipe COD selain beli pada status `sudah_bertemu_penjual`) tidak dapat diuji — kode ini tidak pernah tereksekusi pada kondisi apa pun; lihat NF-007 di `notfixedlogic.md` untuk alasan objektifnya.

### QA-120 — Typecheck, build, dan regresi enam role (sesi lanjutan)

- Alur: `npm run typecheck` dan `npm run build` dijalankan ulang setelah seluruh perbaikan FIX-002 s.d. FIX-006; regresi navigasi penuh via klik sidebar untuk keenam role (owner, kepala_cabang, kasir, teknisi, kurir, influencer) memakai server produksi (`npm run start`) yang sama dipakai untuk seluruh QA di atas.
- Hasil aktual: typecheck dan build sukses tanpa error/warning baru. 0 console error dan 0 failed network request pada seluruh halaman yang terdampak perubahan sesi ini, di keenam role. Route guard frontend tetap berfungsi seperti pada QA-102 (tidak diubah pada sesi ini).

## Sesi lanjutan — Legacy Gap Analysis (GAP-001 s.d. GAP-012)

Tanggal pengujian: 2026-08-07
Branch: `claude/jayaphone-frontend-qa-3lyr4h`
Konteks: `LEGACY_GAP_ANALYSIS.md` mendokumentasikan 13 gap antara logika legacy (`index.html`/`main.js`/`svg.js`) dan hasil migrasi Next.js. GAP-001 s.d. GAP-012 diimplementasikan satu per satu sesuai urutan permintaan user ("mulai GAP-001 sampai selesai"); GAP-013 murni cross-reference ke NF-007 yang sudah ada, tidak butuh pekerjaan baru. Setiap gap diverifikasi dengan siklus yang sama: `npm run typecheck` → `npm run build` → restart server produksi lokal + backend `phonejaya` lokal (seed data QA, database in-memory) → skrip Playwright browser nyata dengan screenshot → regresi 6-role → commit + push individual.

### GAP-001 — Breakdown margin/profit + spek lengkap di Detail Unit

- Route: `/stok`, `/stok-kasir`
- Perbaikan: `UnitDetailModal.tsx` baru (dipakai bersama oleh kedua halaman) menambahkan section "Finansial (Owner Only)" (harga modal/harga jual/margin Rp+%, role-gated `owner`), field spek yang sebelumnya hilang (IMEI2, tipe SIM, keamanan, speaker, LCD, battery health), dan section Keluhan. `/stok` sebelumnya tidak punya aksi Detail per baris sama sekali — ditambahkan kolom "Aksi".
- Retest: login owner, buka Detail salah satu unit — section Finansial tampil dengan margin Rp 550.000 (20.8%) dari harga modal Rp 2.100.000/harga jual Rp 2.650.000 (dikonfirmasi lewat screenshot, karena `.innerText` menormalkan CSS `text-transform:uppercase` sehingga string match case-sensitive di skrip awal sempat false-negative). Login kasir — spek lengkap tampil tapi section Finansial **tidak** dirender (role gate berfungsi).
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-002 — Filter Cabang di Dashboard + sambungan di Stok

- Route: `/dashboard`, `/stok`
- Perbaikan: `<CabangFilter>` dipasang di Dashboard (owner-only, disambungkan ke `filterQueryParams`) dan di Stok (menyambungkan state `selectedCabangFilter`/`setSelectedCabangFilter` yang sebelumnya sudah ada di kode tapi tidak reachable dari UI).
- Retest: filter cabang di kedua halaman mengubah data yang tampil sesuai cabang terpilih, diverifikasi lewat network request parameter `cabang` yang berubah.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-003 — Cart sparepart-untuk-repair di Tambah Unit

- Route: `/tambah-unit`
- Perbaikan: `SparepartRepairCart` component baru + field Keluhan, muncul kondisional saat `kondisi_hp === "Repair"`. Payload submit mengirim `keluhan` dan `sparepart_items` ke `Api.units.create()`, `harga_jual` dipaksa 0 (tidak diminta) untuk kondisi Repair.
- Retest end-to-end: submit unit dengan `kondisi_hp: "Repair"`, `keluhan: "LCD retak parah, perlu ganti total"`, 1 item sparepart — diverifikasi lewat API bahwa unit tercipta dengan `status: "Service"` dan tiket service (`SVC-101`, `status: "Antrian"`) otomatis terbuat dengan `keluhan`/`sparepart_items` yang sama.
- Catatan proses: skrip uji pertama sempat mengisi field Catatan (bukan Keluhan) karena locator `textarea` tanpa index memilih elemen pertama di DOM — validasi client `if (isRepair && !form.keluhan.trim())` justru menangkapnya (0 `POST /units` terkirim), bukan bug aplikasi. Diperbaiki dengan `textarea >> nth(1)`.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-004 — Indikator umur stok (kadaluarsa badge) di Stok

- Route: `/stok`
- Perbaikan: `getStockAgeInfo()` baru di `formatters.ts` (port `getKadaluarsaBadge` legacy — hijau <30 hari, kuning 30-60 hari, merah >60 hari), kolom "Umur stok" baru di tabel.
- Retest: kolom tampil dengan label "N hari" berwarna sesuai tone, diverifikasi lewat screenshot.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-005 — Kontak customer + foto serah-terima di Detail Transaksi

- Route: `/transaksi`
- Perbaikan: tile "Kontak" ditambahkan ke grid info modal detail, section foto serah-terima kondisional ditambahkan setelah catatan — keduanya sudah tersedia di tipe `Transaksi` tapi tidak pernah dirender.
- Retest: JYP-TRX-001 menampilkan kontak "081234500011" dengan benar (dikonfirmasi lewat query backend + screenshot). Path render `foto_serah_terima` tidak diuji langsung dengan data live (seed tidak ada yang mengisi field ini) tapi review kode mengikuti pola yang identik dan sudah terbukti di `UnitDetailModal`.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-006 — Kebijakan redeem poin customer belum Verified — CLOSED as-designed

- Route: `/input-transaksi`
- Keputusan: dikonfirmasi langsung ke pemilik produk (2026-08-07) — pengetatan block redeem poin untuk customer belum Verified memang kebijakan yang diinginkan (mencegah redeem sebelum verifikasi identitas), bukan efek samping migrasi. **Tidak ada perubahan kode.**
- Dokumentasi: entri di `LEGACY_GAP_ANALYSIS.md` diperbarui menjadi "CLOSED as-designed" dengan tanggal keputusan.

### GAP-007 — Chart tren harian + filter tanggal independen di modal Statistik Karyawan

- Route: `/karyawan`
- Perbaikan: preset tab (7 Hari/30 Hari/3 Bulan/1 Tahun) + custom date range di dalam modal (state lokal, independen dari filter halaman), `KaryawanStatsChart.tsx` baru (Bar chart react-chartjs-2) merender `trend_harian` yang sebelumnya sudah dikembalikan backend tapi tidak dipakai UI.
- Retest: buat transaksi baru sebagai kasir "bayu" (Rp 300.000, profit Rp 120.000) lewat API, verifikasi chart bar tampil dengan tanggal "08-07" dan nilai Rp 300rb pada modal statistik owner; klik preset "7 Hari" dan custom date range keduanya memuat ulang data dengan benar.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-008 — Preview live "Poin didapat" di Input Transaksi

- Route: `/input-transaksi`
- Perbaikan: baris "Estimasi Poin Didapat" di Ringkasan, dihitung live dari `total` (setelah diskon poin), disembunyikan total untuk tipe Guest (mengikuti perilaku legacy `hitungPoin`).
- Retest: pilih unit Rp 5.300.000 sebagai kasir "bayu" dengan tipe Member — baris menampilkan "53 poin" (5.300.000/100.000) secara live sebelum submit. Beralih ke Guest — baris hilang total.
- Temuan tambahan (didokumentasikan terpisah, bukan diperbaiki — backend read-only): `app/services/transaksi_service.py:150` membuang `poin_dipakai` ke 0 sebelum logika diskon berjalan, sehingga redeem poin yang sudah benar di frontend tidak pernah benar-benar diterapkan ke transaksi tersimpan. Dicatat di `LEGACY_GAP_ANALYSIS.md` untuk tim pemilik `phonejaya`.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-009 — Komponen galeri foto thumbnail-swap

- Route: `/service` (detail modal)
- Perbaikan: `PhotoGallery.tsx` baru (foto utama besar + strip thumbnail, klik thumbnail ganti foto utama via state lokal, bukan buka tab baru), dipasang terpisah untuk section "Foto Before" dan "Foto After".
- Cakupan disesuaikan dengan kontrak backend aktual: Unit (`foto_url`) dan Transaksi (`foto_serah_terima`) hanya punya satu foto (string tunggal) di backend saat ini, jadi tidak ada array untuk di-gallery-kan di kedua halaman itu — hanya Service yang benar-benar punya array (`foto_before_urls`/`foto_after_urls`).
- Retest: isi SVC-001 dengan 2 foto before + 3 foto after via API, verifikasi struktur galeri (2 label, jumlah thumbnail 2+3=5) dan klik thumbnail ke-3 pada "Foto After" berhasil menukar `src` foto utama (dikonfirmasi lewat perbandingan atribut sebelum/sesudah klik). Gambar itu sendiri broken di screenshot karena sandbox QA memblokir domain eksternal (picsum.photos) — bukan bug aplikasi, di produksi foto berasal dari Cloudinary yang sudah terbukti bisa diakses.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-010 — Mekanisme cetak struk ke Blob-URL

- Route: `/input-transaksi`, `/transaksi`
- Perbaikan: `printTransactionReceipt` di `receipt.ts` diganti dari `window.open()+document.write` menjadi Blob-URL + klik `<a target="_blank">` sintetis — port persis dari `printStruk` legacy (index.html:3541-3616), yang menurut komentar aslinya sengaja dipilih untuk menghindari popup blocker Android/Chrome mobile.
- Retest: klik "Cetak Struk" di Detail Transaksi (TRX-001) sebagai owner — tab baru terbuka dengan URL `blob:...`, konten struk benar (No. Struk, TOTAL BAYAR), tombol cetak berfungsi.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-011 — Chart tren Influencer Dashboard ke Chart.js asli

- Route: `/influencer-dashboard`
- Perbaikan: `InfluencerTrendChart.tsx` baru (Bar chart react-chartjs-2, pola sama dengan `DashboardTrendChart`/`KaryawanStatsChart`) menggantikan chart custom div/flexbox dengan `title` attribute sebagai tooltip.
- Catatan proses: seed video influencer "firman" awalnya tidak muncul di dashboard karena `influencer_id` di seed pakai username string ("firman"), padahal JWT `sub` claim (yang dipakai query backend) adalah ObjectId karyawan — bug di skrip seed QA scratchpad (`run_local_backend.py`), bukan di aplikasi. Diperbaiki dengan memakai `user_ids["firman"]` yang sudah ada di skrip.
- Retest: setelah seed diperbaiki, chart bar Chart.js tampil dengan benar (grid, label sumbu format kompak "25rb/20rb/...", label sumbu-x "2026-W30") menggantikan bar div flat.
- Hasil: 0 console error, regresi 6-role bersih.

### GAP-012 — Setup automated testing (Vitest) untuk lib/utils

- Lingkup: seluruh project (infrastruktur testing baru)
- Perbaikan: `vitest` + `vitest.config.ts` (environment node, alias `@/`), script `npm test`/`npm run test:watch`. 34 unit test ditulis untuk 3 modul pure di `lib/utils`: `formatters.test.ts` (termasuk `getStockAgeInfo` dari GAP-004), `dateFilter.test.ts`, `profilePhotoUrl.test.ts` (guard SSRF — localhost, private IP range, host lookalike).
- Retest: `npm run test` → 34/34 lulus. `npm run typecheck` dan `npm run build` tetap sukses setelah penambahan file test (tidak ikut ter-bundle ke output Next.js).
- Hasil: seluruh test hijau, tidak ada regresi pada build/typecheck.

### Regresi akhir — seluruh 12 gap

- Alur: `npm run typecheck` dan `npm run build` dijalankan ulang di commit terakhir (setelah GAP-012); regresi navigasi 6-role penuh (`final_regression.js`: login UI nyata, kunjungi beberapa halaman per role, cek route guard lintas role, logout, cek proteksi pasca-logout) dijalankan setelah setiap gap dan sekali lagi di akhir.
- Hasil aktual: 0 console error di keenam role pada setiap titik pengecekan. Route guard dan proteksi pasca-logout tetap berfungsi seperti QA-102/QA-103 (tidak diubah sepanjang sesi ini).
- Commit: `ea3ee73`..`13d653b` (GAP-001 s.d. GAP-012 + 2 commit dokumentasi), seluruhnya sudah di-push ke `claude/jayaphone-frontend-qa-3lyr4h`.
