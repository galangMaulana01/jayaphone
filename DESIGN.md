# Jayaphone Design System

Panduan UI wajib untuk seluruh perubahan frontend Jayaphone. Tujuannya adalah membuat dashboard operasional toko HP yang terasa tenang, rapi, dan premium—bukan dashboard generik hasil template AI.

> **Revisi v2 (2026-08-06):** arah visual bergeser ke tema gelap monokrom sebagai tampilan utama, dengan gradient tipis hitam↔putih sebagai identitas baru (bukan gradient warna-warni). Lihat §1.1 dan §3.1 untuk detail dan resep persisnya. Keputusan ini sudah disetujui pemilik produk; belum diimplementasikan ke halaman manapun — dokumen ini adalah hasil "meeting" sebelum eksekusi ke kode.

## 1. Arah visual

Jayaphone memakai gaya **soft operational workspace**: antarmuka bersih, latar netral hangat, ruang kosong cukup, aksen warna terukur, dan hierarki informasi yang kuat. Referensi visualnya adalah dashboard SaaS editorial: panel ringan, judul besar, sidebar ringkas, serta elemen dekoratif yang sangat minim.

UI harus membantu kasir, kepala cabang, teknisi, kurir, dan owner bekerja cepat saat operasional ramai. Keindahan tidak boleh mengalahkan keterbacaan data atau kejelasan aksi.

### 1.1 Arah baru: dark-first monokrom (v2)

Dark mode bukan lagi mode alternatif — dark mode adalah tampilan utama Jayaphone (`ThemeContext` sudah default ke `dark` saat belum ada preferensi tersimpan; ini dipertahankan, bukan diubah). Light mode tetap ada untuk kondisi kerja siang/outdoor (kasir, kurir), tapi seluruh eksplorasi visual baru dirancang dari dark mode dulu, baru diturunkan ke light mode.

Empat referensi yang disetujui dan perannya masing-masing — dipakai sebagai rujukan bahasa desain, **bukan** untuk ditiru literal (logo, copy, ikon pihak lain tidak relevan):

| Referensi | Yang diambil |
|---|---|
| Payflow | Shell gelap nyaris hitam, gradient tipis monokrom (hitam↔putih), minimalis, tanpa blur/glass. Ini dasar seluruh tema dark v2. |
| Citadel Bank | Treatment gradient tipis pada **satu card metrik utama** per halaman (contoh: Total Balance) — bukan pada semua card. |
| Konten.com | Sistem dua tipe button: satu gradient-glow tipis untuk aksi utama, satu flat/solid untuk aksi sekunder — tetap serasi (radius & tinggi sama). |
| Fincluex / Finance Management | Ritme grid card & chart: card besar dan lega, judul section jelas, chart card dengan legend kecil. |

Aturan tegas: **gradient yang dipakai adalah gradient monokrom (hitam/abu-abu/putih), tipis, dan tunduk pada resep di §3.1** — bukan gradient warna (oranye, neon, pelangi). Ini yang membedakan arah v2 dari "AI slop" gradient generik.

## 2. Prinsip anti "AI slop"

Wajib:

- Gunakan hierarki jelas: halaman → section → panel → data → aksi.
- Beri whitespace; jangan penuhi layar dengan card, border, atau badge.
- Gunakan teks dan label spesifik Jayaphone, bukan copy generik.
- Setiap warna status mempunyai arti tetap dan selalu disertai teks.
- Empty state harus menjelaskan kondisi serta langkah berikutnya.
- Alignment tabel, form, modal, dan toolbar harus konsisten.

Dilarang:

- Gradient warna-warni, neon, glassmorphism/blur, atau dekorasi yang mengganggu data. **Gradient monokrom tipis sesuai resep §3.1 dikecualikan** — itu bagian dari identitas v2, bukan dekorasi berlebihan. Di luar resep itu, tidak ada gradient ad-hoc lain yang dibuat.
- Shadow tebal, border pada setiap elemen, serta card bersarang tanpa fungsi.
- Ikon dari berbagai gaya/library dalam satu aplikasi.
- Dashboard berisi banyak kartu statistik kecil tanpa prioritas.
- Animasi dekoratif, bounce, atau teks seperti "Unlock insights" dan lorem ipsum.
- Membulatkan semua elemen secara berlebihan.

## 3. Fondasi visual

### Typography

- Font utama: `Geist`.
- Data teknis—ID, nominal, kode unit, nomor transaksi—boleh memakai `Geist Mono`.
- Judul halaman: 28–32px, weight 600–700.
- Judul section: 16–18px, weight 600.
- Isi: 13–14px, weight 400–450.
- Label dan metadata: 11–12px, weight 500.
- Jangan memakai lebih dari dua keluarga font.
- **Catatan Teknis Next.js:** Implementasikan font `Geist` dan `Geist Mono` menggunakan modul `next/font/google` atau `@vercel/font/geist` di dalam file `src/app/layout.tsx`.

### Spacing dan bentuk

Gunakan skala 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48`.

- Padding halaman desktop: 28–32px.
- Jarak antar section: 28–40px.
- Padding panel: 20–24px.
- Radius input/button/badge: 10–12px.
- Radius panel: 16px; modal: 18–20px.
- Pakai border halus sebagai pemisah utama. Shadow hanya untuk modal, dropdown, popover, dan toast.

### 3.1 Gradient tipis (v2)

Satu-satunya gradient yang boleh dipakai di seluruh aplikasi. Dua varian, dipetakan ke token Tailwind baru (lihat §4):

- **Gradient card** (`bg-gradient-hero`): dipakai pada **maksimal satu card metrik utama per halaman** (dark mode). Diagonal 135°, dari `jp.surface-dark` (`#141416`) ke hitam pekat (`#050506`), dengan overlay putih transparan sangat halus di sudut kiri-atas (`rgba(255,255,255,0.06)` memudar ke `0%` di tengah) untuk kesan cahaya tipis — persis nuansa Payflow/Citadel, bukan gradient dua warna terang yang kontras.
- **Gradient button** (`bg-gradient-primary`): dipakai hanya pada button primary (§6). Dark mode: dari abu-abu terang (`#F4F4F5`) ke putih (`#FFFFFF`) — teks tetap gelap (`#161618`) sesuai aturan kontras §4. Light mode: dari `#1D1D1F` ke hitam pekat (`#050506`) — teks putih.
- Tidak ada gradient ketiga. Kalau sebuah halaman "butuh" gradient baru yang beda arah/warna, itu tanda desainnya keluar dari sistem — kembali ke dua varian ini.
- Radius dan shadow gradient card/button tetap ikut aturan §3 (radius 10–20px sesuai jenis elemen, shadow hanya untuk elemen yang memang butuh, bukan glow tebal).

## 4. Palet warna

Dark adalah mode referensi utama (kolom Dark dibaca lebih dulu saat mendesain); Light diturunkan darinya, bukan sebaliknya.

| Peran | Light | Dark | Penggunaan |
|---|---|---|---|
| App background | `#F7F7F3` | `#0B0B0D` | Latar utama |
| Surface | `#FFFFFF` | `#141416` | Panel, tabel, modal |
| Surface subtle | `#F1F1EC` | `#1B1B1E` | Toolbar dan field disabled |
| Surface pekat (gradient end) | `#0B0B0D` | `#050506` | Titik akhir `bg-gradient-hero` |
| Text utama | `#161618` | `#F4F4F5` | Judul dan data penting |
| Text sekunder | `#6F706F` | `#A1A1AA` | Metadata dan deskripsi |
| Border | `#E8E8E2` | `#2A2A2E` | Garis pemisah |
| Teal Jayaphone | `#4FD1C5` | `#4FD1C5` | Identitas, focus, selected — **bukan** sumber gradient |
| Teal soft | `#DDF7F3` | `#123B38` | Selected state dan aksen lembut |
| Yellow action | `#F6D74B` | `#F6D74B` | Perhatian terbatas |
| Success | `#2FAE74` | `#34D399` | Selesai dan tersedia |
| Warning | `#D99A22` | `#FBBF24` | Pending dan perlu perhatian |
| Info | `#4886DA` | `#60A5FA` | Proses dan informasi |
| Danger | `#E85C5C` | `#FB7185` | Error, tolak, hapus |
| Gradient button, stop 1 | `#1D1D1F` | `#F4F4F5` | `bg-gradient-primary`, awal gradasi |
| Gradient button, stop 2 | `#050506` | `#FFFFFF` | `bg-gradient-primary`, akhir gradasi |

**Aturan Penting Warna:** 
- Dasar netral (hitam/abu/putih) harus dominan; satu halaman maksimal memiliki satu aksen aksi utama DAN maksimal satu card gradient (§3.1). 
- Teal dan Yellow tetap dipakai untuk identitas/status (badge, focus ring, selected) — **tidak** dipakai sebagai warna gradient. Gradient v2 murni monokrom.
- Merah hanya untuk tindakan atau status berisiko.
- **Aksesibilitas Kontras:** Jika menggunakan background Teal `#4FD1C5` (misal untuk tombol *primary* lama) atau `bg-gradient-primary` di dark mode (dasar terang), teks di atasnya **wajib** menggunakan warna gelap (`#161618`) agar kontras dan mudah dibaca, bukan warna putih. Untuk `bg-gradient-primary` di light mode (dasar gelap), teks **wajib putih**.

## 5. Layout aplikasi

### Sidebar

- Lebar desktop: 260px.
- Berisi logo, navigasi utama, dan area akun di bawah.
- Gunakan satu set ikon outline dengan ketebalan yang seragam.
- Item aktif memakai surface kontras/teal-soft; ikon aktif boleh memakai kotak teal.
- Item navigasi aktif berbentuk pill rounded-full (bukan sekadar highlight kotak) di dark mode, senada dengan shell gelap minimalis §1.1 — perubahan bentuk pill, bukan penambahan warna baru.
- Hindari grup menu yang berlebihan. Tambahkan label grup kecil hanya bila menu sudah banyak.
- Di mobile, sidebar menjadi drawer; jangan dipaksa tampil permanen.

### Konten

Struktur halaman standar:

1. Breadcrumb opsional.
2. Judul halaman dan deskripsi singkat.
3. Aksi utama halaman.
4. Toolbar: pencarian, filter yang relevan, tanggal, aksi sekunder.
5. Konten utama: ringkasan seperlunya, tabel/card/detail.

Header halaman tidak dimasukkan ke dalam card. Tabel boleh memakai lebar penuh. Grid ringkasan maksimal 3–4 kolom pada desktop.

## 6. Komponen

### Button (v2 — dua tipe, ala Konten.com §1.1)

- Tinggi standar 38–40px, radius sama untuk kedua tipe (10–12px) supaya tetap serasi berdampingan.
- **Primary (gradient)**: memakai `bg-gradient-primary` (§3.1/§4) — dipakai HANYA untuk satu aksi paling penting per konteks (submit, approve, simpan). Bukan default untuk semua tombol utama; tetap tunduk pada "maksimal satu primary per toolbar/form".
- **Secondary (flat)**: solid `jp.surface-subtle`/border tipis, tanpa gradient — dipakai untuk aksi sekunder (batal, detail, filter). Ini pengganti "Secondary" versi lama, bentuknya tetap sama.
- Teal: khusus selected state atau aksi khas merek yang bukan alur submit utama (misal toggle favorit) — tetap bukan pengganti primary maupun secondary.
- Danger (reject/hapus) tetap flat memakai warna danger §4, tidak diberi gradient — gradient hanya untuk aksi positif/maju, bukan aksi berisiko.
- Icon button wajib memiliki tooltip atau `aria-label`.
- Dalam satu toolbar/form, gunakan maksimal satu primary (gradient) button; secondary boleh lebih dari satu.

### Hero/stat card (v2 — ala Citadel Bank §1.1)

- Maksimal **satu** per halaman, dipakai untuk metrik paling penting di halaman itu (contoh: Total Saldo di Dashboard, bukan setiap angka).
- Memakai `bg-gradient-hero` (§3.1/§4), radius panel 16–20px, teks utama besar (ikut skala judul section §3), teks sekunder tetap `text-secondary` di atas gradient gelap.
- Tidak boleh dua hero card di halaman yang sama — kalau ada dua metrik penting, satu jadi hero, sisanya jadi ringkasan flat biasa (aturan "satu card = satu informasi utama" di §Card tetap berlaku).

### Input dan form

- Label selalu di atas field; placeholder bukan pengganti label.
- Tinggi field 40–44px, surface subtle, border tipis, focus ring teal lembut.
- Field wajib memakai `*` pada label.
- Error/helper text berada tepat di bawah field.
- Form panjang dibagi menurut kelompok data, bukan dipisahkan banyak garis.
- Data unit: identitas unit, kondisi, harga, foto/dokumen, dan catatan.

### Table

- Tabel adalah elemen inti Jayaphone dan harus diprioritaskan.
- Header tenang, menggunakan text sekunder. Hindari uppercase berlebihan.
- Tinggi row 52–60px dengan hover subtle.
- Nominal rata kanan dan konsisten memakai format Rupiah.
- ID dan kode unit memakai mono, kecil, dan mudah disalin.
- Aksi di kolom paling kanan; gunakan menu bila aksi lebih dari dua.
- Mobile: ubah row menjadi card ringkas, dengan data utama di bagian atas.

### Status badge

Badge berbentuk pill kecil, memakai background transparan lembut, border tipis, dan teks eksplisit.

| Kondisi | Warna | Contoh |
|---|---|---|
| Berhasil/tersedia | Hijau | Tersedia, Selesai, Verified |
| Menunggu | Kuning | Pending, Menunggu Kasir |
| Sedang berjalan | Biru | Proses, Dalam Pengiriman |
| Gagal/ditolak | Merah | Ditolak, Gagal |
| Netral | Abu-abu | Nonaktif, Draft |

### Card, modal, dan empty state

- Card ringkasan hanya dibuat bila membantu pengambilan keputusan.
- Satu card = satu informasi utama, bukan banyak metrik kecil.
- Modal untuk input/keputusan yang perlu fokus; drawer untuk detail panjang tanpa kehilangan konteks tabel.
- Aksi berbahaya harus menyebut target spesifik sebelum dikonfirmasi.
- Empty state memakai SVG sederhana dan teks kontekstual, misalnya: “Belum ada unit tersedia” + tombol “Tambah unit”.

## 7. Pola halaman Jayaphone

### Dashboard

Tampilkan kondisi operasional hari ini: transaksi, unit yang perlu perhatian, COD pending, service aktif, dan verifikasi customer. Gunakan 3–4 ringkasan paling penting, lalu daftar tindakan yang membutuhkan respons. Chart hanya bila diperlukan untuk membaca tren.

Metrik paling penting halaman (biasanya omzet/transaksi hari ini, tergantung role) dipromosikan jadi hero card (§6) memakai `bg-gradient-hero`; 2–3 ringkasan lain di sebelahnya tetap flat neutral seperti biasa — jangan menggradient semuanya.

### Inventory dan unit

Toolbar berisi pencarian, status, cabang, dan filter yang benar-benar dipakai. Tabel fokus pada foto kecil, nama/ID, kondisi/status, harga, cabang, dan aksi. Detail unit dibuka melalui drawer.

### Transaksi kasir

Hierarki alur: pilih customer → pilih unit → harga & pembayaran → konfirmasi. Satu tahap memiliki satu aksi utama. Informasi poin hanya ditampilkan bila customer member sudah dipilih dan statusnya mengizinkan.

### COD dan monitor kurir

Gunakan status timeline eksplisit, bukan hanya badge. Card tugas kurir wajib memuat jenis COD, lokasi/cabang, pihak terkait, status saat ini, dan CTA berikutnya. Hindari tabel yang terlalu lebar di mobile serta cegah submit status ganda.

### Service dan sparepart

Status service adalah informasi visual utama. Foto before/after memakai grid konsisten. Riwayat teknisi, sparepart, dan biaya ditampilkan sebagai timeline atau section detail, bukan tumpukan card. Progress approval sparepart harus linear dan mudah dibaca.

## 8. Responsif dan aksesibilitas

- Prioritaskan mobile untuk kasir dan kurir.
- Target sentuh minimal 44×44px di mobile.
- Jangan bergantung pada hover untuk aksi penting.
- Warna tidak boleh menjadi satu-satunya penanda status/error.
- Semua ikon aksi memiliki label aksesibel.
- Focus state keyboard harus terlihat.
- Hormati `prefers-reduced-motion`.

## 9. Motion

- Durasi transisi 120–220ms.
- Hanya gunakan fade/slide kecil untuk modal, dropdown, drawer, dan pergantian konten.
- Jangan memakai bounce, parallax, atau animasi loop dekoratif.

## 10. Checklist sebelum mengirim UI

- [ ] Satu prioritas aksi halaman terlihat jelas.
- [ ] Tidak ada card, border, shadow, atau warna yang tidak memberi fungsi.
- [ ] Spacing mengikuti skala 4px.
- [ ] Status memakai teks yang eksplisit.
- [ ] Nominal, tanggal, ID, dan tabel mudah dipindai.
- [ ] Desktop, mobile, loading, kosong, error, disabled, dan data panjang telah diperiksa.
- [ ] Ikon konsisten dan copy berbahasa Indonesia bersifat spesifik.
- [ ] Perubahan terasa sebagai bagian dari Jayaphone, bukan template acak.

## 11. Instruksi untuk AI agent

1. Baca file ini sebelum membuat atau mengubah UI.
2. Pertahankan perilaku aplikasi yang sudah ada kecuali perubahan diminta secara eksplisit.
3. Jangan mengganti satu halaman penuh hanya demi mengikuti tren desain.
4. Bangun dari pola/komponen yang sudah ada agar konsisten.
5. Jika menambah status warna atau komponen baru, pastikan tidak berbenturan dengan panduan ini.
6. **Integrasi Tailwind:** Sebelum membuat komponen UI, wajib petakan palet warna, font, dan konfigurasi dari dokumen ini ke dalam `tailwind.config.ts` (extend theme) agar penulisan class Tailwind tetap rapi (misalnya menggunakan class `bg-jayaphone-surface` atau `text-jayaphone-teal`). Dilarang keras menggunakan *arbitrary values* warna secara berlebihan di HTML (seperti `bg-[#F7F7F3]`).
7. Setelah implementasi, periksa hasil pada desktop dan mobile beserta semua state penting.
8. **Khusus v2 (§1.1/§3.1/§6):** hanya dua gradient yang boleh dipakai di seluruh aplikasi — `bg-gradient-hero` (maksimal satu card per halaman) dan `bg-gradient-primary` (maksimal satu button aktif per toolbar/form). Jangan membuat variasi gradient baru (arah, warna, jumlah stop lain) tanpa keputusan eksplisit dari pemilik produk — itu prinsip yang sama dengan "anti AI slop" di §2, hanya diperluas untuk mengakomodasi identitas monokrom baru. `ThemeContext` sudah default ke dark; jangan diubah untuk default ke light.
9. Dokumen ini mendahului implementasi — jangan mulai mengubah halaman/komponen nyata sebelum pemilik produk mengonfirmasi isi §1.1–§6 sudah sesuai maksud mereka.
