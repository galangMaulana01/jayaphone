# QA Not Fixed / Belum Terverifikasi

Tanggal pengujian: 2026-08-06  
Branch: `agent/security-ownership-fixes`

Dokumen ini membedakan defect terverifikasi dari area yang belum dapat ditutup karena keterbatasan observasi.

## QA-UNVERIFIED-001 — Menu dan identitas role belum dapat ditutup

- Prioritas: Medium
- Status: belum dapat diverifikasi; bukan bug terkonfirmasi
- Role terdampak: owner, kepala cabang, kasir, teknisi, kurir, influencer
- Halaman/route: landing page masing-masing role dan authenticated app shell
- Reproduksi: login API menggunakan akun QA berhasil, token dipasang hanya in-memory pada browser context, lalu landing page role dibuka.
- Hasil aktual: URL landing page terbuka, tetapi dalam jendela observasi browser body/menu sempat kosong sebelum hydration/compile selesai. Karena itu menu terlihat, identitas role, dan workflow tiap halaman tidak dapat dinilai secara andal.
- Hasil yang diharapkan: landing page menampilkan shell, identitas role, menu role yang benar, loading state yang singkat, lalu konten atau error state yang jelas.
- Dampak: coverage QA workflow multi-role belum lengkap; belum ada bukti bahwa fitur bisnis gagal di production.
- Bukti: tidak ada console error yang tercatat; log dev server menunjukkan compile route berhasil, dengan latency compile sekitar beberapa detik pada cold route.
- Rekomendasi tingkat tinggi: ulangi pada build production atau environment browser yang sudah warm, lalu ukur waktu sampai shell dan data tampil secara terpisah.

## QA-UNVERIFIED-002 — Direct foreign-route authorization per role belum dapat ditutup

- Prioritas: High
- Status: belum dapat diverifikasi; bukan bukti data bocor
- Role terdampak: seluruh role authenticated
- Halaman/route: contoh silang `/dashboard`, `/influencer-dashboard`, `/stok-kasir`, `/service-list`, `/kurir-dashboard`.
- Reproduksi: setelah login API berhasil, buka URL role lain secara manual dari browser context.
- Hasil aktual: navigasi frontend menerima response route, tetapi render authenticated shell tidak konsisten selesai dalam observasi sehingga pesan forbidden/guard dan tidak adanya data tidak dapat dibuktikan secara lengkap untuk setiap pasangan role-route.
- Hasil yang diharapkan: route yang bukan milik role menampilkan guard yang jelas atau redirect; tidak boleh ada request data bisnis yang berhasil tanpa permission backend.
- Dampak: status permission tidak boleh dinaikkan menjadi “aman”; coverage ini masih terbuka.
- Bukti HTTP/console: login API keenam role HTTP 200 dan role response sesuai; tidak ada console error tercatat pada sesi ringkas. Tidak ada response backend feature 401/403 yang dapat digunakan untuk menyimpulkan permission.
- Rekomendasi tingkat tinggi: jalankan matriks role × route pada production build dengan network capture; verifikasi status 401/403 dari endpoint backend, bukan hanya teks guard frontend.

## QA-UNVERIFIED-003 — Workflow bisnis tiap role belum selesai diuji

- Prioritas: Medium
- Status: tidak dapat diuji penuh karena rendering/data authenticated belum stabil dalam sesi ini
- Role terdampak: seluruh role
- Halaman/route: dashboard, stok, transaksi, service, COD, influencer, kurir, customer, settings.
- Reproduksi: setelah login, tunggu landing page lalu coba membuka workflow utama dan inspeksi loading, data, aksi, serta feedback.
- Hasil aktual: login backend berhasil, tetapi tidak tersedia tampilan stabil yang cukup untuk menilai langkah kerja, state data, tombol aksi, dan feedback sukses/error tanpa risiko membuat asumsi.
- Hasil yang diharapkan: setiap role dapat menyelesaikan alur kerja yang diberikan dengan data yang diperlukan tersedia dan feedback yang jelas.
- Dampak: tidak ada klaim pass untuk workflow bisnis; pengujian mutasi data sengaja tidak dilakukan.
- Bukti HTTP/console: typecheck lulus; health 200; login 200; console error tidak tercatat pada smoke test; feature workflow belum memiliki bukti response sukses.
- Rekomendasi tingkat tinggi: siapkan dataset QA terisolasi, jalankan build production, dan uji read-only dahulu sebelum aksi tulis yang dapat mengubah data bisnis.

## QA-OBS-004 — Cold compile development server menimbulkan jeda render

- ID tipe temuan: observasi UX/performance, bukan defect production terverifikasi
- Prioritas: Low
- Role terdampak: semua role saat membuka route pertama kali
- Halaman/route: beberapa route utama dan route role-specific.
- Reproduksi: jalankan `npm run dev`, buka route yang belum pernah dikompilasi, amati browser dan log Next.js.
- Hasil aktual: beberapa route membutuhkan beberapa detik untuk compile; pada sebagian observasi body browser kosong sebelum hydration selesai.
- Hasil yang diharapkan: loading state yang eksplisit dan konsisten selama compile/data fetch.
- Dampak: dapat terlihat sebagai halaman blank atau loading lama di environment development; belum membuktikan masalah pada production build.
- Bukti: log dev server menunjukkan compile route berhasil dengan durasi beberapa detik; tidak ada stack trace compile.
- Rekomendasi tingkat tinggi: ukur production build/start dan tambahkan regression check untuk first meaningful render bila masalah tetap muncul.

## Hal yang tidak dilakukan

- Tidak ada mutasi data bisnis.
- Tidak ada perubahan backend, source code, konfigurasi aplikasi, dependency version, atau environment.
- Tidak ada token, credential, isi `.env`, atau secret yang dicatat dalam dokumentasi.
