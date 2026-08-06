# Jayaphone Design System

Panduan UI wajib untuk seluruh perubahan frontend Jayaphone. Tujuannya adalah membuat dashboard operasional toko HP yang terasa tenang, rapi, dan premium—bukan dashboard generik hasil template AI.

## 1. Arah visual

Jayaphone memakai gaya **soft operational workspace**: antarmuka bersih, latar netral hangat, ruang kosong cukup, aksen warna terukur, dan hierarki informasi yang kuat. Referensi visualnya adalah dashboard SaaS editorial: panel ringan, judul besar, sidebar ringkas, serta elemen dekoratif yang sangat minim.

UI harus membantu kasir, kepala cabang, teknisi, kurir, dan owner bekerja cepat saat operasional ramai. Keindahan tidak boleh mengalahkan keterbacaan data atau kejelasan aksi.

## 2. Prinsip anti "AI slop"

Wajib:

- Gunakan hierarki jelas: halaman → section → panel → data → aksi.
- Beri whitespace; jangan penuhi layar dengan card, border, atau badge.
- Gunakan teks dan label spesifik Jayaphone, bukan copy generik.
- Setiap warna status mempunyai arti tetap dan selalu disertai teks.
- Empty state harus menjelaskan kondisi serta langkah berikutnya.
- Alignment tabel, form, modal, dan toolbar harus konsisten.

Dilarang:

- Gradient mencolok, neon, glassmorphism, atau dekorasi yang mengganggu data.
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

## 4. Palet warna

| Peran | Light | Dark | Penggunaan |
|---|---|---|---|
| App background | `#F7F7F3` | `#0B0B0D` | Latar utama |
| Surface | `#FFFFFF` | `#141416` | Panel, tabel, modal |
| Surface subtle | `#F1F1EC` | `#1B1B1E` | Toolbar dan field disabled |
| Text utama | `#161618` | `#F4F4F5` | Judul dan data penting |
| Text sekunder | `#6F706F` | `#A1A1AA` | Metadata dan deskripsi |
| Border | `#E8E8E2` | `#2A2A2E` | Garis pemisah |
| Teal Jayaphone | `#4FD1C5` | `#4FD1C5` | Identitas, focus, selected |
| Teal soft | `#DDF7F3` | `#123B38` | Selected state dan aksen lembut |
| Yellow action | `#F6D74B` | `#F6D74B` | Perhatian terbatas |
| Success | `#2FAE74` | `#34D399` | Selesai dan tersedia |
| Warning | `#D99A22` | `#FBBF24` | Pending dan perlu perhatian |
| Info | `#4886DA` | `#60A5FA` | Proses dan informasi |
| Danger | `#E85C5C` | `#FB7185` | Error, tolak, hapus |

**Aturan Penting Warna:** 
- Dasar netral harus dominan; satu halaman maksimal memiliki satu aksen aksi utama. 
- Teal adalah warna identitas, bukan warna semua tombol. 
- Merah hanya untuk tindakan atau status berisiko.
- **Aksesibilitas Kontras:** Jika menggunakan background Teal `#4FD1C5` (misal untuk tombol *primary*), teks di atasnya **wajib** menggunakan warna gelap (`#161618`) agar kontras dan mudah dibaca, bukan warna putih.

## 5. Layout aplikasi

### Sidebar

- Lebar desktop: 260px.
- Berisi logo, navigasi utama, dan area akun di bawah.
- Gunakan satu set ikon outline dengan ketebalan yang seragam.
- Item aktif memakai surface kontras/teal-soft; ikon aktif boleh memakai kotak teal.
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

### Button

- Tinggi standar 38–40px.
- Primary: near-black di light mode atau putih di dark mode; hanya untuk aksi paling penting.
- Secondary: transparan/putih dengan border tipis.
- Teal: untuk selected state atau aksi khas merek, bukan pengganti primary.
- Icon button wajib memiliki tooltip atau `aria-label`.
- Dalam satu toolbar, gunakan maksimal satu primary button.

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
