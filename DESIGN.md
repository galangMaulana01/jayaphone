Dokumen ini adalah aturan wajib untuk AI/agent (Hermes atau lainnya) saat mendesain
atau mengedit tampilan web. Baca ini SEBELUM menulis kode apapun. Semua keputusan
visual harus konsisten dengan aturan di bawah, bukan default template yang biasa
dipakai AI.

## Referensi visual

Acuan utamanya adalah dashboard Vercel (halaman Deployments & Overview): dark mode
solid, sidebar kiri fixed, konten kanan berbasis card/table dengan border tipis,
status ditandai dot berwarna kecil, badge pill untuk status/environment, dan
metadata (commit hash, waktu relatif, avatar) rapi dalam satu baris dengan font
monospace untuk data teknis.

## Prinsip inti

1. **Fungsional dulu, dekoratif belakangan.** Ini dashboard kerja, bukan landing
   page marketing. Tidak ada hero besar, tidak ada headline puitis, tidak ada
   ilustrasi dekoratif yang tidak fungsional.
2. **Density tinggi tapi rapi.** Banyak informasi per layar (baris tabel, badge,
   metadata) tapi tetap scannable lewat alignment dan spacing yang konsisten,
   bukan lewat warna-warni.
3. **Warna dipakai sebagai sinyal, bukan dekorasi.** Warna hanya muncul untuk
   status (ready/error/building), badge environment aktif, atau elemen
   interaktif. Selebihnya monokrom abu-abu/hitam/putih.

## Token warna (pakai Tailwind arbitrary value / config, jangan warna Tailwind default seperti `blue-500` polos)

- Background utama: `#0A0A0A`
- Background panel/card: `#111111` sampai `#161616`
- Border: `#232323` (border tipis 1px, jangan pakai shadow besar)
- Teks primer: `#EDEDED`
- Teks sekunder/muted: `#8A8A8A`
- Teks tersier (timestamp, hint): `#5C5C5C`
- Accent aktif (badge production/link aktif): `#0072F5` (biru, dipakai sangat sedikit)
- Status sukses: dot hijau `#3DD68C`, jangan dibuat background solid terang, cukup dot kecil + teks putih/muted
- Status warning/pending: `#F5A623`
- Status error: `#E5484D`
- JANGAN pakai gradient, JANGAN pakai warna cream/terracotta (#F4F1EA / #D97757), JANGAN pakai neon acid-green sebagai accent utama.

## Tipografi

- Font utama: sistem sans-serif rapat seperti `Inter` atau fallback
  `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Import via
  Google Fonts CDN kalau perlu, tapi tetap satu file.
- Font monospace untuk: commit hash, ID, angka teknis, kode. Pakai
  `ui-monospace, "SF Mono", Menlo, monospace`.
- Ukuran teks kecil (13–14px untuk isi tabel/list, 12px untuk metadata),
  jangan pakai ukuran besar kecuali untuk judul halaman (16–20px, bukan 32px+).
- Line-height rapat, letter-spacing normal (jangan tracking-wide berlebihan).

## Layout

- Sidebar kiri fixed, lebar sekitar 240–260px, isi: logo/nama project di atas,
  list navigasi dengan icon + label, area akun di bawah.
- Konten utama: topbar tipis (breadcrumb kiri, aksi kanan), lalu area konten
  dengan padding konsisten (24px).
- Card/table row: border tipis antar baris atau antar card, radius kecil
  (`rounded-md`, 6–8px), TIDAK rounded besar/pill untuk container (pill hanya
  untuk badge status).
- Hover state pada baris/card: background sedikit lebih terang
  (`hover:bg-white/5`), bukan shadow besar atau scale animation.

## Komponen kunci

- **Status dot + label**: dot bulat kecil (6–8px) warna status + teks di
  sebelahnya. Jangan pakai icon centang/silang besar.
- **Badge pill**: untuk environment (`Production`, `Preview`) — background solid
  gelap dengan border, atau biru solid kalau sedang aktif/dipilih.
- **Avatar**: bulat kecil (28–32px) di ujung kanan baris.
- **Metadata row**: commit hash pakai font mono + warna muted, waktu relatif
  (11h ago, 1d ago) di paling kanan, muted juga.

## Motion

- Minim. Transisi warna/opacity saat hover (150–200ms ease), tidak lebih.
  JANGAN pakai animasi fade-in scroll-reveal, JANGAN pakai efek parallax,
  JANGAN pakai animasi loading berlebihan kecuali skeleton sederhana.

## Yang WAJIB dihindari (ciri "AI slop")

- Emoji di mana pun (judul, badge, button, teks).
- Gradient background atau gradient text pada judul.
- Card dengan shadow besar/blur/glow.
- Icon dari emoji unicode; kalau perlu icon pakai SVG inline sederhana
  (garis tipis, stroke, bukan icon filled berwarna-warni).
- Copy generik seperti "Unlock the power of...", "Seamless experience",
  atau kalimat marketing lain. Semua teks harus deskriptif dan fungsional,
  sesuai isi datanya (nama fitur, status, nilai — bukan tagline).
- Border-radius besar (rounded-2xl/3xl/full) pada container/card utama.
- Warna accent lebih dari satu di halaman yang sama selain untuk status.

## Aturan teknis implementasi

- Satu file `index.html` saja. Semua HTML, style, dan script di file itu.
- Tailwind lewat CDN (`<script src="https://cdn.tailwindcss.com"></script>`),
  konfigurasi warna custom lewat `tailwind.config` inline di file yang sama
  kalau perlu token warna di atas didefinisikan sebagai nama (mis. `bg-panel`,
  `text-muted`).
- Tidak ada file CSS/JS terpisah, tidak ada framework tambahan (React dsb)
  kecuali diminta eksplisit di brief lain.
- Responsive: sidebar collapse jadi icon-only atau hidden di layar sempit
  (breakpoint `md`), table jadi scrollable horizontal di mobile — jangan
  di-stack jadi card acak yang mengubah hierarki data.
- Fokus keyboard tetap terlihat (`focus-visible:ring`), jangan dihilangkan
  dengan `outline-none` tanpa pengganti.

## Checklist sebelum selesai

- [ ] Tidak ada emoji di seluruh file.
- [ ] Semua warna berasal dari token di atas, bukan warna Tailwind default
      acak (`blue-500`, `green-400`, dst tanpa penyesuaian).
- [ ] Hanya satu accent color yang benar-benar "menonjol" di halaman.
- [ ] Border-radius konsisten kecil, bukan campur-campur.
- [ ] Copy/teks di UI deskriptif, bukan kalimat marketing.
- [ ] File tetap satu `index.html`, tidak ada dependency di luar Tailwind CDN.
