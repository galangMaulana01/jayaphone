# Legacy Logic Gap Analysis — Vanilla-JS SPA → Next.js

Tanggal audit: 2026-08-07
Metodologi: baca penuh `main.js` (463 baris, API layer) dan `svg.js` (icon library), ekstrak seluruh 189 fungsi top-level dari `index.html` (7299 baris) via grep, lalu bandingkan implementasi tiap fungsi/fitur terhadap halaman Next.js yang jadi penggantinya (`src/app/(app)/**/page.tsx`, `src/components/**`, `src/lib/**`). Dikerjakan dengan 3 sub-agent riset paralel (media/chart, transaksi/customer, management features) plus pengecekan manual langsung.

**Audit ini murni pembacaan kode — tidak ada satupun baris kode yang diubah selama proses audit awal.** Setiap temuan di bawah sudah diverifikasi dengan file:line di kedua sisi (legacy vs Next.js), bukan dugaan.

> **Update 2026-08-07 — SEMUA 12 GAP SELESAI.** GAP-001 s.d. GAP-012 sudah diimplementasikan, diverifikasi (typecheck, build, browser QA, regresi 6-role), dan di-push ke `claude/jayaphone-frontend-qa-3lyr4h`. Bukti retest lengkap per gap ada di `fixedlogic.md` (bagian "Sesi lanjutan — Legacy Gap Analysis"). Analisis di bawah ini dipertahankan sebagai catatan historis (apa yang hilang dan kenapa); untuk status implementasi terkini rujuk ke `fixedlogic.md`.

Legenda status:
- ✅ **Fully ported** — tidak ada gap, tidak perlu tindakan.
- ⚠️ **Partially ported** — sebagian fitur ada, sebagian hilang/berubah.
- ❌ **Missing** — tidak ada jejak sama sekali di kode baru.
- 🔄 **Behavior changed** — bukan cuma hilang, tapi logikanya berubah (butuh keputusan produk, bukan cuma "kembalikan seperti semula").

---

## Ringkasan yang SUDAH lengkap (tidak masuk TODO)

| Area | Status | Bukti |
|---|---|---|
| Icon library (`svg.js` → `lib/icons`) | ✅ | 36/36 icon konstanta ter-port, nama identik |
| API client (`main.js` → `lib/api/index.ts`) | ✅ | Semua namespace/method ter-port, malah lebih baik (typed + beberapa bug fix terdokumentasi sesi sebelumnya) |
| Live camera capture (ImageUploader) | ✅ | `iuOpenCamera` (main.js:58-112) vs `ImageUploader.tsx:113-149,207-217` — nyaris baris-per-baris identik (getUserMedia, canvas capture, kualitas jpeg 0.9) |
| Notification panel (klik-navigasi, mark-all-read, time-ago) | ✅ | `NotificationBell.tsx` mereplikasi `_timeAgo`/`handleNotifClick`/`toggleNotifPanel` legacy persis |
| Konfirmasi Pecat Karyawan | ✅ | Sama-sama `window.confirm()` dengan nama karyawan diinterpolasi |
| Guest/Member toggle di Input Transaksi | ✅ | `toggleCustomerType` (index.html:2719) vs `input-transaksi/page.tsx:20-37` |
| Toggle COD di Input Transaksi | ✅ | `toggleCODDelivery` (index.html:3409) ter-port inline, terpisah dari halaman `/cod-beli` yang memang beda alur |
| Cetak struk (mekanisme beda, fungsi sama) | ✅* | Lihat GAP-010 untuk catatan risiko teknis mekanismenya |
| Type strictness endpoint yang dulu `unknown` | ✅ | `karyawan.stats`, `requestSparepart.list`, `cod.kurirMonitoring`, `influencer.sync` — semua sudah punya tipe eksplisit sekarang |
| Dashboard trend chart | ✅ | `DashboardTrendChart.tsx` pakai `react-chartjs-2` sungguhan, bukan tabel |

---

## TODO — urutan implementasi (prioritas tinggi → rendah)

### GAP-001 ✅ — Selesai (2026-08-07) — Detail Unit kehilangan breakdown margin/profit khusus owner
- **Prioritas**: High
- **Halaman**: `/stok`, `/stok-kasir`
- **Legacy**: `modalDetailUnit` (index.html:2562-2662) — grid ID/Status/Kategori/Kondisi, spek lengkap (merk, tipe, storage, ram, warna, IMEI 1&2, tipe SIM, keamanan, speaker, LCD, battery, **battery health**), section **"Finansial (Owner Only)"** dengan harga modal/harga jual/margin Rp+%, section Keluhan/Catatan, galeri foto multi-gambar.
- **Sekarang**: modal detail di `stok-kasir/page.tsx` dan `stok/page.tsx` hanya render ~9 field dasar (status, merk, tipe, storage, ram, warna, imei, battery, harga jual) + 1 foto tunggal. **Tidak ada margin, tidak ada IMEI2/tipe SIM/keamanan/speaker/LCD/battery health, tidak ada keluhan.**
- **Dampak**: owner kehilangan cara cepat melihat profitabilitas per unit; kasir/teknisi kehilangan detail fisik unit yang lengkap.
- **Rencana**: tambahkan section finansial (role-gated `owner`) dan sisa field spek yang hilang ke modal detail di kedua halaman; pakai data yang sudah dikembalikan `Api.units.detail()` (field-nya sudah ada di response, cuma belum dirender).

### GAP-002 ✅ — Selesai (2026-08-07) — Filter Cabang hilang di Dashboard, mati (dead state) di Stok
- **Prioritas**: High
- **Halaman**: `/dashboard`, `/stok`
- **Legacy**: `renderCabangFilter`/`populateCabangFilter` (index.html:1086-1113) dipasang di 6 halaman termasuk dashboard (1155, 1243) dan stok (1364, 1386).
- **Sekarang**: `dashboard/page.tsx` — nol referensi filter cabang untuk owner. `stok/page.tsx` — state `selectedCabangFilter`/`setSelectedCabangFilter` (baris 24) dan dipakai di query API (baris 39), **tapi tidak ada elemen `<select>`/`<CabangFilter>` apapun di JSX yang pernah memanggil `setSelectedCabangFilter`** — state itu backend-nya jalan tapi tidak reachable dari UI.
- **Dampak**: owner tidak bisa mempersempit data dashboard/stok per cabang — dua halaman paling sering dipakai.
- **Rencana**: pasang komponen `<CabangFilter>` (sudah ada di `src/components/ui/CabangFilter.tsx`, dipakai di Laporan & Monitor Kurir) ke Dashboard (role owner) dan ke Stok (sambungkan ke state yang sudah ada).

### GAP-003 ✅ — Selesai (2026-08-07) — Tambah Unit kehilangan cart sparepart-untuk-repair
- **Prioritas**: High
- **Halaman**: `/tambah-unit`
- **Legacy**: `toggleKeluhanField`, `loadSpRepairList`, `toggleSpRepair`, `renderSpRepairKeranjang`, `ubahJmlSpRepair` (index.html:1594-1688) — saat Kondisi HP = "Repair" dipilih, muncul field "Keluhan" + daftar sparepart yang bisa dicentang (dengan qty +/-) sebagai bahan perbaikan; saat disimpan, stok sparepart ikut berkurang.
- **Sekarang**: `tambah-unit/page.tsx` punya select "Kondisi HP" (Mulus/Repair) tapi **tidak ada cabang UI apapun yang muncul saat "Repair" dipilih** — tidak ada field Keluhan terpisah (cuma "Catatan" generik), dan field `sparepart_items` yang sudah ada di tipe `Api.units.create()` **tidak pernah diisi/dikirim** oleh form ini.
- **Dampak**: alur "unit masuk rusak → langsung catat sparepart yang dipakai" hilang total; tim harus mencatat pemakaian sparepart secara manual/terpisah, plus stok sparepart jadi tidak akurat.
- **Rencana**: tambahkan conditional section (mirip pola `toggleKeluhanField`) yang muncul saat `kondisi_hp === "Repair"`, isi field Keluhan + cart sparepart (list dari `Api.sparepart.list()`, checkbox+qty), kirim sebagai `sparepart_items` di payload `Api.units.create()`.

### GAP-004 ✅ — Selesai (2026-08-07) — Indikator umur stok (kadaluarsa badge) hilang
- **Prioritas**: High
- **Halaman**: `/stok`
- **Legacy**: `getKadaluarsaBadge` (index.html:1474-1503) — badge hijau (<30 hari), kuning (30-60 hari), merah (>60 hari) berdasarkan `created_at` unit, buat deteksi cepat stok yang lama nganggur (dead stock).
- **Sekarang**: tidak ada jejak logika ini di `stok/page.tsx` sama sekali.
- **Dampak**: owner/kepala cabang kehilangan sinyal visual cepat untuk stok yang perlu didiskon/diprioritaskan jual.
- **Rencana**: port fungsi `getKadaluarsaBadge` sebagai util (`lib/utils/formatters.ts` atau file baru), tambahkan sebagai kolom/badge di tabel/card Stok.

### GAP-005 ✅ — Selesai (2026-08-07) — Detail Transaksi kehilangan kontak customer & foto serah-terima
- **Prioritas**: High
- **Halaman**: `/transaksi`
- **Legacy**: `modalDetailTransaksi` (index.html:3422-3514) — grid Tipe/Nama/**Kontak**/Poin Dipakai + galeri **foto_serah_terima**.
- **Sekarang**: `transaksi/page.tsx` modal detail render Unit/Kasir/Customer-nama/Status/Poin dipakai, tapi **`customer_kontak` dan `foto_serah_terima` tidak pernah dirender** — padahal keduanya sudah ada di tipe `Transaksi` (`lib/types/index.ts:143,145`), cuma datanya tidak dipakai di JSX.
- **Dampak**: owner/kepala cabang yang meninjau transaksi (mis. untuk dispute) kehilangan nomor kontak customer dan bukti foto serah-terima barang.
- **Rencana**: tambahkan 2 field yang hilang ke modal detail — data sudah tersedia di response API, tinggal dirender.

### GAP-006 ✅ — Redeem poin diblokir total untuk customer belum "Verified" — CLOSED as-designed (2026-08-07)
- **Prioritas**: ~~High~~ Selesai — dikonfirmasi ke product owner.
- **Halaman**: `/input-transaksi`
- **Legacy**: kasir tetap bisa pakai poin customer meski status masih Pending, cuma dapat warning (index.html:2820-2831,2856).
- **Sekarang**: `input-transaksi/page.tsx:28` — `customerPointBalance` dipaksa 0 kecuali `selectedCustomer.status === "Verified"`.
- **Keputusan produk (2026-08-07)**: dikonfirmasi ke pemilik produk — pengetatan ini memang **kebijakan yang diinginkan** (mencegah redeem poin sebelum identitas customer terverifikasi), bukan efek samping migrasi. **Tidak ada perubahan kode** — behavior saat ini dipertahankan apa adanya.
- **Rencana**: tidak ada tindakan lanjutan. Item ditutup sebagai as-designed.

### GAP-007 ✅ — Selesai (2026-08-07) — Modal Statistik Karyawan kehilangan chart tren harian + filter tanggal independen
- **Prioritas**: Medium-High
- **Halaman**: `/karyawan`
- **Legacy**: `modalKaryawanStats`/`_loadKarStats` (index.html:2254-2405) + `_setKarFilter`/`_showKarCustomDate`/`_applyKarCustomDate` (2407-2435) — tab preset 7 Hari/30 Hari/3 Bulan/1 Tahun/Custom **khusus di dalam modal**, independen dari filter halaman, plus bar chart tren harian (Chart.js, index.html:2363,2372).
- **Sekarang**: `karyawan/page.tsx` `loadStats()` hardcode `{hari:30}`, modal cuma nampilin angka statis (jumlah_transaksi, total_omzet, dst) tanpa chart dan tanpa cara ganti periode.
- **Dampak**: owner/kepala cabang kehilangan kemampuan lihat performa karyawan per hari (tren) dan tidak bisa ganti rentang waktu tanpa reload halaman.
- **Rencana**: tambahkan preset tab + custom-date di dalam modal (state lokal, terpisah dari filter halaman), tambahkan chart tren harian pakai `react-chartjs-2` (sudah ada dependency-nya, dipakai di Dashboard).

### GAP-008 ✅ — Selesai (2026-08-07) — Preview "Poin didapat" hilang dari Input Transaksi
- **Prioritas**: Medium
- **Halaman**: `/input-transaksi`
- **Legacy**: `hitungPoin` (index.html:2836-2905) tampilkan estimasi poin yang akan didapat **sebelum** submit.
- **Sekarang**: poin cuma muncul di `completed.poin_dapat` **setelah** transaksi berhasil (page.tsx:37) — tidak ada preview live saat mengisi form.
- **Dampak**: kasir tidak bisa kasih tahu customer "kamu bakal dapat berapa poin" sebelum transaksi difinalisasi.
- **Rencana**: tambahkan kalkulasi live (`Math.floor(hargaFinal/100000)` sesuai formula legacy) yang update setiap kali harga/diskon berubah, tampilkan di ringkasan sebelum tombol submit.

### GAP-009 ✅ — Selesai (2026-08-07) — Galeri foto thumbnail-swap hilang total
- **Prioritas**: Medium
- **Halaman**: semua halaman yang menampilkan >1 foto (Data Service before/after, Detail Unit, Detail Transaksi)
- **Legacy**: `imageGalleryHTML`/`iuSetMain` (main.js:173-191) — foto utama besar + strip thumbnail di bawah, klik thumbnail ganti foto utama tanpa pindah halaman/tab. Dipakai di index.html:1988-2044 (service), 2570 (unit), 3433-3434 (transaksi).
- **Sekarang**: `ImageUploader.tsx:192-205` cuma render grid thumbnail flat, tiap foto buka tab baru (`<a target="_blank">`) — tidak ada komponen galeri/lightbox inline sama sekali di `src/`.
- **Dampak**: user harus buka banyak tab buat bandingkan foto before/after, bukan lihat langsung di halaman yang sama.
- **Rencana**: buat komponen `<PhotoGallery>` baru (foto utama + thumbnail strip, klik = ganti foto utama via state lokal, bukan navigasi), pasang di 3 titik yang disebut di atas.

### GAP-010 ✅ — Selesai (2026-08-07) — Mekanisme cetak struk berisiko kena popup-blocker mobile
- **Prioritas**: Medium
- **Halaman**: `/input-transaksi`, `/transaksi`
- **Legacy**: `printStruk` (index.html:3541-3616) sengaja pakai teknik Blob-URL + klik `<a>` sintetis — komentar di kode legacy eksplisit bilang ini dipilih untuk **menghindari popup blocker Android/Chrome mobile**.
- **Sekarang**: `lib/utils/receipt.ts:17-34` pakai `window.open()+document.write` — persis teknik yang legacy sengaja hindari. Sudah ada fallback toast "Popup cetak diblokir browser", tapi itu tandanya masalahnya memang bisa kejadian.
- **Dampak**: kasir yang pakai HP Android/Chrome mobile berpotensi lihat toast blokir alih-alih struk, padahal di app lama ini jalan mulus.
- **Rencana**: ganti mekanisme `printTransactionReceipt` ke pendekatan Blob-URL + `<a>` klik sintetis, samakan dengan legacy.

### GAP-011 ✅ — Selesai (2026-08-07) — Chart tren Influencer Dashboard bukan Chart.js sungguhan
- **Prioritas**: Low-Medium
- **Halaman**: `/influencer-dashboard`
- **Legacy**: bar chart Chart.js asli dengan tooltip/axis label (index.html:5622,5655).
- **Sekarang**: `influencer-dashboard/page.tsx:17` — bar chart custom pakai div flexbox (`height:${views/max*100}%`) dengan `title` attribute sebagai pengganti tooltip. Secara visual mirip tapi tanpa interaktivitas asli Chart.js.
- **Dampak**: kosmetik/UX kecil — data tetap benar, cuma kurang polish (tanpa animasi/tooltip hover Chart.js).
- **Rencana**: ganti ke `react-chartjs-2` `<Bar>`, samakan pola dengan `DashboardTrendChart.tsx`.

### GAP-012 ✅ — Selesai (2026-08-07) — Belum ada automated test sama sekali
- **Prioritas**: Low (struktural, bukan bug user-facing)
- **Lingkup**: seluruh project
- **Legacy**: tidak ada test juga (bukan regresi), tapi ini adalah TODO lama dari `MIGRATION_NOTES.md` poin 6 yang belum pernah dikerjakan.
- **Sekarang**: nol file `.test.`/`.spec.`, tidak ada jest/vitest di `package.json`.
- **Dampak**: setiap perubahan bergantung sepenuhnya pada QA manual/browser — sudah terbukti berisiko (banyak bug baru ditemukan lewat QA manual sepanjang sesi-sesi sebelumnya yang harusnya bisa dicegat oleh unit test sederhana di `lib/utils/*`).
- **Rencana**: setup test runner (Vitest paling cocok untuk Next.js+Vite-like tooling), mulai dari fungsi pure di `lib/utils/*` (formatters, dateFilter) karena paling gampang dan paling bernilai per jam kerja.

### GAP-013 — (Referensi) Kurir "Input Stok" dead code — sudah terdokumentasi sesi sebelumnya
- **Prioritas**: Low — bukan temuan baru, cuma cross-reference
- **Halaman**: `/kurir-dashboard`
- **Catatan**: sudah dianalisis tuntas di `notfixedlogic.md` sebagai **NF-007** — konsisten dengan `doKurirInputStok`/`kurirGoInputStok` legacy yang state machine-nya (`COD_JUAL_FLOW`/`COD_DELIVERY_FLOW`) juga tidak pernah mencapai kondisi yang memicu fungsi ini. Tidak perlu dikerjakan ulang di sini — rujuk ke `notfixedlogic.md` untuk detail dan rekomendasi.

---

## ⚠️ Temuan tambahan (bukan gap frontend, ditemukan saat implementasi GAP-008)

**Backend `create_transaksi` membuang `poin_dipakai` — redeem poin tidak pernah benar-benar diterapkan.**
- **File**: `app/services/transaksi_service.py:150` (dan cabang guest di baris 206).
- **Bukti**: fungsi menerima parameter `poin_dipakai: int = 0` dari route (`app/routes/transaksi.py:37` benar mengoper `body.poin_dipakai`), tapi baris 150 langsung menimpanya dengan `poin_dipakai = 0` sebelum dipakai di logic diskon (baris 176 dst). Akibatnya `diskon_poin` tidak pernah dihitung, `harga_jual_final` selalu sama dengan `harga_jual_base`, dan poin customer tidak pernah didebit walau kasir mengisi field "Pakai Poin" dan submit berhasil.
- **Dampak**: fitur redeem poin yang sudah lengkap di frontend (validasi Verified, batas maksimum, breakdown diskon di Ringkasan) **tidak berpengaruh ke transaksi yang benar-benar tersimpan** — customer tidak kehilangan poin, tapi mereka juga tidak mendapat potongan harga sungguhan meski UI menampilkan seolah-olah dapat.
- **Bukan bagian dari GAP-001..012** karena ini murni bug backend (`/home/user/phonejaya` bersifat read-only reference untuk sesi ini, tidak boleh diubah) — dicatat di sini supaya tidak hilang, dan preview "Estimasi Poin Didapat" (GAP-008) sengaja dibuat mengikuti rumus yang SEHARUSNYA berjalan (total setelah diskon), bukan meniru bug ini, karena tetap harus konsisten dengan breakdown "Diskon Poin"/"Total" yang sudah ada di Ringkasan sebelum sesi ini.
- **Rencana**: perlu di-fix di repo backend (`phonejaya`) oleh tim yang berwenang — bukan tugas sesi QA frontend ini.

## Catatan implementasi

- Semua item di atas HARUS diverifikasi ulang terhadap kontrak backend sebelum dikerjakan (jangan asumsikan field API tersedia hanya karena ada di legacy — beberapa kemungkinan sudah berubah di backend selama migrasi).
- GAP-006 butuh konfirmasi produk dulu sebelum diubah — ini satu-satunya item yang statusnya bukan "kembalikan seperti semula" tapi "putuskan mana yang benar".
- Ikuti aturan `DESIGN.md` v2 (dark-first monokrom) untuk setiap UI baru yang dibangun dari gap-gap ini — jangan bawa balik style lama (zinc-500, gradient warna-warni, dll) dari `index.html`, port logikanya saja, bukan tampilannya.
- Setiap gap yang selesai dikerjakan wajib dipindah ke `fixedlogic.md` dengan bukti retest, mengikuti format yang sudah dipakai sepanjang project ini.
