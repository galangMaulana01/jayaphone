# Jayaphone Visual Design System v2

Status: diimplementasikan pada frontend branch `claude/jayaphone-frontend-qa-3lyr4h`.

Sistem ini mengatur presentasi visual saja. API, state, role guard, struktur data, dan alur bisnis tidak boleh bergantung pada aturan di dokumen ini.

## 1. Arah visual

Jayaphone adalah ruang kerja operasional toko HP yang terang, tenang, dan presisi. Hierarki dibentuk terutama oleh tipografi, jarak, dan alignment. Panel dan warna hanya digunakan ketika memiliki fungsi grouping atau status yang jelas.

Aturan keras:

- Light adalah tampilan utama. Kelas `dark:*` dan `ThemeContext` tetap dipertahankan sebagai kompatibilitas legacy.
- Kanvas utama putih; off-white hanya untuk area kerja sekunder.
- Aksen visual hanya near-black dan teal Jayaphone.
- Amber dan merah hanya untuk status yang benar-benar memerlukannya.
- Tidak ada gradient, blur, glassmorphism, glow, neon, atau shadow dekoratif.
- Geist adalah satu-satunya keluarga font. `font-mono` lama dipetakan ke Geist dan memakai tabular numerals.
- Pill hanya untuk navigasi, filter terpilih, dan badge.
- Shadow hanya untuk modal, drawer, dropdown, popover, dan toast.
- Satu halaman memiliki satu fokus dominan; jangan membuat deretan kartu statistik identik tanpa prioritas.

## 2. Token warna

| Token | Nilai light | Fungsi |
|---|---:|---|
| `jp-app` / `jp-surface` | `#FFFFFF` | Kanvas dan surface utama |
| `jp-surface-subtle` | `#FAFAF8` | Field, toolbar, metric sekunder |
| `jp-text` | `#0A0A0A` | Judul, data utama, primary action |
| `jp-text-soft` | `#303330` | Isi reguler |
| `jp-muted` | `#6E736F` | Deskripsi dan metadata |
| `jp-faint` | `#A5AAA6` | Placeholder dan disabled |
| `jp-border` | `#E7EAE7` | Divider dan outline yang diperlukan |
| `jp-border-strong` | `#D4D8D5` | Batas field yang perlu kontras |
| `jp-teal` | `#0B6F68` | Identitas, focus, selected, progress |
| `jp-teal-hover` | `#095C57` | Hover teal |
| `jp-teal-soft` | `#E8F2F0` | Selected/positive soft |
| `jp-teal-muted` | `#C8E0DC` | Border positive |

Status:

- Positif: teal `#0B6F68` di atas `#E8F2F0`.
- Berjalan/info: near-black di atas neutral soft.
- Menunggu: desaturated amber `#7A5A18` di atas `#F7F1E4`.
- Gagal/berisiko: desaturated red `#9B3733` di atas `#F8E9E7`.
- Nonaktif: muted neutral.

Jangan menggunakan purple, blue, orange, pink, cyan, atau yellow sebagai aksen dekoratif.

## 3. Tipografi

- Font: Geist untuk seluruh UI, termasuk ID, IMEI, nominal, dan kode transaksi.
- Judul halaman: 28px mobile, 32px desktop, weight 600, tracking `-0.03em`.
- Judul section: 18–20px, weight 600.
- Judul card/modal: 16px, weight 600.
- Data utama: 24–28px, weight 600.
- Body: 14px, line-height sekitar 1.55.
- Tabel/body compact: 13px.
- Label: 12px, weight 500. Jangan uppercase.
- Metadata: 11px.
- Angka memakai `font-variant-numeric: tabular-nums`.

## 4. Spacing, radius, dan proporsi

Skala spacing: `4, 8, 12, 16, 20, 24, 32, 40, 52, 64, 84`.

- Padding halaman: 16px mobile; 32px desktop.
- Jarak antarsection: 32px mobile; 40px desktop.
- Padding panel: 20px mobile; 24px desktop.
- Sidebar desktop: 232px.
- Drawer mobile: `min(86vw, 320px)`.
- Radius kecil: 6px; kontrol: 10px; panel: 14px; modal/hero: 18px.

Proporsi besar mengikuti pendekatan golden ratio:

- Fokus utama dan rail pendamping: sekitar 61.8% / 38.2%.
- Jarak antarsection sekitar 1.6× padding internal panel.
- Form utama dan summary dapat memakai rasio 61.8% / 38.2%.
- Jangan memaksakan golden ratio pada sidebar karena merusak ruang tabel.

## 5. Shell aplikasi

- Sidebar putih dengan ikon outline monokrom.
- Navigasi aktif berbentuk capsule near-black dengan teks putih.
- Header adalah surface putih yang tenang; konteks halaman di header lebih kecil daripada judul body.
- Konten dibatasi `1440px` dan dipusatkan agar tabel tetap luas tetapi ritme whitespace terjaga.
- Mobile memakai drawer; target sentuh minimal 40px dan ideal 44px.

## 6. Primitives

### Button

- Tinggi minimal 40px, radius 10px.
- Primary: near-black solid, teks putih.
- Success/brand action: teal solid, dipakai hemat.
- Secondary: neutral subtle dengan border ringan.
- Ghost: transparan; background hanya saat hover/focus.
- Danger: red soft, bukan merah solid neon.
- Maksimal satu aksi primary paling kuat dalam satu konteks form/toolbar.

### Field

- Tinggi minimal 44px, label selalu di atas.
- Default memakai off-white dan border transparan.
- Focus memakai border teal yang terlihat, tanpa glow.
- Helper/error berada tepat di bawah field.

### Card dan section

- `.metric-card` memakai off-white tanpa border atau shadow.
- `.section-panel` dipakai untuk satu kelompok informasi yang benar-benar terpisah.
- `.form-section` memakai off-white untuk mengelompokkan form panjang tanpa tumpukan card ber-border.
- `.hero-card` hanya satu per layar, near-black solid tanpa gradient.
- Hindari card di dalam card.

### Badge

- Badge kecil berbentuk pill dan selalu memuat teks eksplisit.
- Warna membantu scanning tetapi bukan satu-satunya penanda.
- Platform, tipe, dan status proses netral; jangan memperkenalkan warna merek pihak ketiga.

### Table

- Tabel adalah produk utama, bukan dekorasi di dalam card.
- Header tenang, row 52–60px, hover sangat halus.
- Nominal rata kanan; ID dan kode mudah dipindai.
- Kolom aksi paling kanan memakai `.tbl-action-col` dan tetap sticky di mobile.
- Sticky action memakai surface solid dan divider kiri; tidak memakai gradient fade.

### Modal dan overlay

- Modal radius 18px dengan shadow overlay saja.
- Backdrop hitam transparan tanpa blur.
- Action footer harus tetap mudah dijangkau pada mobile.

## 7. Chart

- Garis 1.5–2px, tanpa area fill.
- Titik default disembunyikan; tampil saat hover.
- Grid dashed tipis dan netral.
- Teal adalah satu-satunya warna data dekoratif.
- Tooltip solid dengan radius moderat; tidak ada shadow/glow tebal.
- Label dan legend ditempatkan dekat data yang dijelaskan.
- Hindari chart junk, animasi berlebihan, dan palette multiwarna.

## 8. Pola halaman

- Dashboard: satu hero omzet solid, satu metric sekunder, lalu chart dan transaksi terbaru.
- List/tabel: header halaman, toolbar off-white, tabel; jangan menambahkan summary card bila tidak membantu keputusan.
- Form panjang: header tanpa card, section berdasarkan kelompok data, satu tombol submit utama.
- Service: status dan foto before/after menjadi fokus; detail memakai section, bukan tumpukan panel dekoratif.
- COD/kurir: CTA berikutnya harus eksplisit dan mudah disentuh di mobile.
- Influencer: performa konten tetap memakai teal/neutral, bukan warna brand platform.
- Log: satu daftar linear dengan divider, bukan card per event.

## 9. Responsive dan aksesibilitas

- Toolbar bertumpuk di mobile dan kembali horizontal saat ruang cukup.
- Grid empat kolom turun menjadi dua lalu satu bila isi tidak muat.
- Tabel mempertahankan horizontal scroll dan sticky action column.
- Aksi penting tidak boleh bergantung pada hover.
- Focus keyboard harus terlihat.
- Warna status selalu disertai teks.
- Hormati `prefers-reduced-motion`.
- Jangan memakai bounce, parallax, looping decoration, atau gerakan card saat hover.

## 10. Quality gate anti-AI-slop

Sebelum mengirim perubahan, pastikan:

- [ ] Tidak ada gradient CSS/Tailwind.
- [ ] Tidak ada blur, glassmorphism, glow, atau neon.
- [ ] Tidak ada shadow pada card, tabel, toolbar, atau section biasa.
- [ ] Tidak ada aksen dekoratif selain near-black dan teal.
- [ ] Amber/merah hanya dipakai sebagai status.
- [ ] Tidak ada emoji sebagai ikon UI.
- [ ] Radius moderat; pill tidak dipaksakan ke semua elemen.
- [ ] Header halaman tidak berada di dalam card.
- [ ] Metrik memiliki prioritas visual, bukan empat kotak identik yang berteriak bersama.
- [ ] Copy tetap spesifik untuk operasi toko HP dan berbahasa Indonesia.
- [ ] Semua route memakai ritme `jp-page`, header, toolbar, table/form yang konsisten.
- [ ] `.tbl-action-col` tetap sticky.
- [ ] Kelas `dark:*` dan logic tema legacy tetap dipertahankan.
- [ ] Loading, empty, error, modal, dan target sentuh mobile tetap jelas.
