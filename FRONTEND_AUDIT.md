# FRONTEND_AUDIT.md — Jayaphone SPA

Generated: 2026-07-21 (Phase 1 — Visual Audit, No Fixes)

---

## 1. EMOJI AUDIT (49 instances found, 16 unique)

| # | Line | Emoji | Context | SVG Replacement |
|---|------|-------|---------|----------------|
| 1 | 699 | 📭 | `emptyState(msg, icon = '📭')` default | inbox |
| 2 | 1387 | ⚠ | `Spk ⚠` (speaker warning) | warning-triangle |
| 3 | 1906 | 🔧 | `emptyState('Belum ada data service','🔧')` | wrench |
| 4 | 2048 | 📊 | `📊 Detail` button | chart-bar |
| 5 | 2050 | 🔑 | `🔑 Reset PW` button | key |
| 6 | 2053 | 👤 | `emptyState('Belum ada karyawan','👤')` | user |
| 7 | 2196 | 📊 | `modalHeader('📊 Statistik ')` | chart-bar |
| 8 | 2244 | 📅 | `📅 ${date range}` | calendar |
| 9 | 2371 | 📊 | `modalHeader('📊 Statistik ')` | chart-bar |
| 10 | 2486 | 📦 | `emptyState('...unit tersedia','📦')` | package |
| 11 | 2629 | ⭐ | `⭐ ${points} poin` | star |
| 12 | 2751 | 📱 | `📱 Unit HP (opsional)` | smartphone |
| 13 | 2774 | 🔧 | `🔧 Sparepart (opsional)` | wrench |
| 14 | 2822 | ⭐ | `<span>⭐</span>` star icon | star |
| 15 | 3031 | 📦 | `emptyState('...unit ditemukan', '📦')` | package |
| 16 | 3217 | 🖨️ | `🖨️ Cetak Struk` button | printer |
| 17 | 3231 | ✅ | `modalHeader('✅ Transaksi Berhasil')` | check-circle |
| 18 | 3240 | ⭐ | `⭐ Poin didapat` | star |
| 19 | 3246 | 🖨️ | `🖨️ Cetak Struk` receipt | printer |
| 20 | 3312 | 🖨️ | `🖨️ Cetak Sekarang` print template | printer |
| 21 | 3374 | 👥 | `emptyState('Belum ada customer', '👥')` | users |
| 22 | 3390 | ⭐ | `⭐ ${points}` customer table | star |
| 23 | 3786 | ⚠ | `⚠ Menipis` low stock | warning-triangle |
| 24 | 3908 | 🔧 | `emptyState('...request sparepart', '🔧')` | wrench |
| 25 | 4060 | ✅ | `showToast('...berhasil dikirim ✅')` | check |
| 26 | 4226 | 📦 | `emptyState('...transfer stok', '📦')` | package |
| 27 | 4427 | ✅ | `showToast('...berhasil diajukan ✅')` | check |
| 28 | 4512 | ✅ | `showToast('...${status} ✅')` | check |
| 29 | 4655 | ⚠ | `⚠ Belum ada kepala cabang` | warning-triangle |
| 30 | 4668 | 🏢 | `emptyState('Belum ada cabang', '🏢')` | building |
| 31 | 4916 | ⚠️ | `⚠️ Needs Content` option | warning-triangle |
| 32 | 4917 | ✅ | `✅ Has Content` option | check-circle |
| 33 | 4950 | ⚠️ | `⚠️ API returned empty catalog` | warning-triangle |
| 34 | 4951 | 📦 | `emptyState('...produk tersedia', '📦')` | package |
| 35 | 4964 | ⚠️/✅ | `⚠️ Needs Content` / `✅ Has Content` badge | warning/check |
| 36 | 4969 | 💰 | `'💰 ' + price` fallback | money |
| 37 | 4971 | 📹 | `📹 Upload Video` button | camera |
| 38 | 4995 | ⚠️ | `⚠️ ${labelOf(p)}` naked option | warning-triangle |
| 39 | 4996 | ✅ | `✅ ${labelOf(p)} (N videos)` option | check-circle |
| 40 | 4998 | ⚠️ | `⚠️ Products without content` helper | warning-triangle |
| 41 | 5014 | 📹 | `📹 Upload Video` button | camera |
| 42 | 5038 | 📹 | `btn.innerHTML = '📹 Upload Video'` | camera |
| 43 | 5095 | 🎬 | `emptyState('Belum ada video', '🎬')` | film |
| 44 | 5318 | 🎬 | `emptyState('Tidak ada video', '🎬')` | film |
| 45 | 6012 | 🔔 | `🔔 ${newCount} tiket service selesai` | bell |
| 46 | 6038 | 📦 | `📦 ${newTrf} transfer stok baru` | package |

### Unique Emojis to Replace (16 unique)
1. 📭 → `inboxSvg` 2. ⚠/⚠️ → `warningSvg` 3. 🔧 → `wrenchSvg` 4. 📊 → `chartSvg`
5. 🔑 → `keySvg` 6. 👤 → `userSvg` 7. 📅 → `calendarSvg` 8. 📦 → `packageSvg`
9. ⭐ → `starSvg` 10. 📱 → `smartphoneSvg` 11. 🖨️ → `printerSvg` 12. ✅ → `checkSvg`
13. 👥 → `usersSvg` 14. 🏢 → `buildingSvg` 15. 💰 → `moneySvg` 16. 📹 → `cameraSvg`
17. 🎬 → `filmSvg` 18. 🔔 → `bellSvg`

### Note: ⚠ vs ⚠️ inconsistency
Lines 1387, 3786, 4655 use bare ⚠ (U+26A0, no variation selector). Lines 4916, 4950, 4964, 4995, 4998 use ⚠️ (U+26A0 + U+FE0F). Renders differently across platforms.

---

## 2. CUSTOM CSS AUDIT

### Style Block 1: Main App Styles (lines 52-419, ~370 lines)

| Section | Lines | What it Styles | Can Tailwind Replace? | Recommendation |
|---------|-------|---------------|----------------------|----------------|
| Box-sizing reset | 53 | `*, *::before, *::after` | ✅ Yes — Tailwind preflight handles this | REMOVE — Tailwind preflight already does `box-sizing: border-box` |
| Body font | 55-58 | `font-family: 'Geist'` | ⚠️ Partial — need `font-['Geist']` or custom Tailwind config | Keep as custom class or add to Tailwind config |
| Scrollbar | 60-62 | WebKit scrollbar styling | ❌ No — Tailwind can't style scrollbars | KEEP (must be native CSS) |
| Sidebar width | 65 | `.sidebar-width { width: 260px }` | ✅ Yes — `w-[260px] min-w-[260px]` | Replace with Tailwind |
| Nav link | 67-103 | `.nav-link` + states | ⚠️ Complex — hover/active states with dark mode | Could use Tailwind with `@apply` but complex. Keep as custom class. |
| Buttons | 106-151 | `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-success` | ⚠️ Complex — dark/light mode variants with gradients | Keep as custom class — too many state variants for inline Tailwind |
| Table rows | 155-160 | `.tbl-row` + hover states | ⚠️ Partial — dark/light border colors | Could use Tailwind `dark:border-zinc-800 border-zinc-100` |
| Badges | 163-185 | `.badge-*` variants | ⚠️ Partial — each has unique bg/color/border | Could use Tailwind with arbitrary values but verbose |
| Skeleton | 188-199 | Loading skeleton animation | ❌ No — needs `@keyframes` | KEEP (must be native CSS for animation) |
| Spinner | 201-208 | Loading spinner animation | ❌ No — needs `@keyframes` | KEEP |
| Toast | 210 | Toast animation | ❌ No — needs `@keyframes` | KEEP |
| Modal bg | 212-216 | Backdrop blur | ✅ Yes — `backdrop-blur-xl bg-black/50` | Replace with Tailwind |
| Filter tabs | 221-237 | `.filter-tab` + states | ⚠️ Complex — dark/light hover/active | Keep as custom class |
| Progress bars | 240-249 | Progress track/fill | ⚠️ Partial | Could use Tailwind but animation needs CSS |
| Battery track | 247-249 | Battery indicator | ✅ Yes — `w-8 h-[3px] rounded-full overflow-hidden` | Replace with Tailwind |
| Service card | 252-260 | `.svc-card` + hover | ⚠️ Partial — dark/light border/bg | Could use Tailwind |
| Label | 262-270 | `.label` form label | ✅ Yes — `block text-sm font-medium mb-1.5` | Replace with Tailwind |
| Divider | 272-274 | `.divider` horizontal rule | ✅ Yes — `border-t border-zinc-200 dark:border-zinc-800` | Replace with Tailwind |
| Select arrow | 276-282 | Custom select dropdown arrow | ❌ No — needs `background-image` SVG data URI | KEEP (must be native CSS) |
| Hamburger | 284-285 | Mobile hamburger menu toggle | ✅ Yes — `hidden md:flex` | Replace with Tailwind |
| Card surface | 288-303 | `.card` dark/light bg | ⚠️ Partial — complex dark/light variants | Could use Tailwind with `dark:bg-zinc-900 bg-white` |
| Stat card | 306-318 | `.stat-card` | ⚠️ Partial | Could use Tailwind |
| Body themes | 321-322 | Body background dark/light | ✅ Yes — `dark:bg-zinc-950 bg-[#F4F7FE]` | Replace with Tailwind on body element |
| Header | 325-326 | `.app-header` | ✅ Yes — `dark:bg-zinc-950/85 bg-white/90` | Replace with Tailwind |
| Sidebar skin | 329-332 | `#app-sidebar` bg | ✅ Yes — `bg-[#F8F9FA]` | Replace with Tailwind |
| Mobile topbar | 335-336 | Mobile top bar | ✅ Yes — `dark:bg-zinc-950 bg-white` | Replace with Tailwind |
| Main bg | 339-340 | `#page-app` bg | ✅ Yes — `dark:bg-zinc-950 bg-[#fafafb]` | Replace with Tailwind |
| Login bg | 343-344 | `#page-login` bg | ✅ Yes — same as main bg | Replace with Tailwind |
| Modal inner | 347-352 | Modal dialog box | ✅ Yes — `dark:bg-zinc-900 bg-white border dark:border-zinc-800` | Replace with Tailwind |
| Table header | 355-356 | `.tbl-head` | ✅ Yes — `dark:text-zinc-500 text-zinc-400 dark:border-zinc-800 border-zinc-100` | Replace with Tailwind |
| Table wrap | 359-363 | `.table-wrap` | ✅ Yes — `dark:bg-zinc-900 bg-white dark:border-zinc-800 shadow-sm` | Replace with Tailwind |
| Panel | 366-370 | `.panel` | ✅ Yes — `dark:bg-zinc-900 bg-white dark:border-zinc-800 shadow-sm` | Replace with Tailwind |
| Toast skins | 373-378 | Toast variants | ⚠️ Partial — complex bg/border/color per type | Keep as custom class |
| Theme toggle | 381-391 | Dark/light toggle button | ✅ Yes — `w-[34px] h-[34px] rounded-[10px]` | Replace with Tailwind |
| Stat icon | 394-399 | Dashboard stat icon container | ✅ Yes — `w-10 h-10 rounded-xl flex items-center justify-center shrink-0` | Replace with Tailwind |
| Border divider | 402-403 | `.border-divider` | ✅ Yes — `dark:border-zinc-800 border-zinc-100` | Replace with Tailwind |
| Log row | 406-407 | `.log-row` hover | ✅ Yes — `dark:hover:bg-zinc-900 hover:bg-zinc-50` | Replace with Tailwind |
| Search wrapper | 410-415 | Search input positioning | ⚠️ Needs `position: relative/absolute` — Tailwind can do with `relative` + `absolute` | Replace with Tailwind |
| Page transition | 418 | View container fade | ❌ No — needs `transition` | KEEP |

### Style Block 2: Receipt Print (lines 3263-3285, ~23 lines)
- **VERDICT:** KEEP — this is thermal printer output (80mm width, Courier New, print-specific). Cannot and should not be Tailwind.

### Inline style= Attributes (33 instances)
Most common patterns:
- `style="height:36px;padding:0 14px;font-size:0.75rem;"` → Could be `btn` variant class
- `style="height:44px;border-radius:14px;"` → Could be `btn` variant class
- `style="height:32px;"` → Could be `h-8` class
- `style="height:28px;padding:0 12px;font-size:0.6875rem;"` → Could be `btn` variant class
- `style="height:auto;"` on textarea → `h-auto` class
- `style="display:none"` → `hidden` class
- `style="text-transform:uppercase"` → `uppercase` class
- `style="width:${pct}%"` → Dynamic, keep as inline
- `style="height:220px"` → `h-[220px]` class

---

## 3. TABLE STYLING INCONSISTENCY

### Current State: 2 Container Patterns + 2 Text Sizes

**Pattern A — `table-wrap` class (15 instances):**
```html
<div class="table-wrap rounded-2xl overflow-hidden">
  <table class="w-full text-xs">
    <thead>
      <tr class="tbl-head text-left text-[10px] uppercase tracking-widest border-b">
```
Used at lines: 1138, 1344, 1716, 1872, 2397, 2459, 3365, 3588, 3760, 3897, 4198, 5159, 5596

**Pattern B — inline border classes (11 instances):**
```html
<div class="overflow-x-auto rounded-2xl border dark:border-zinc-700 border-zinc-200">
  <table class="w-full text-sm">  <!-- NOTE: text-sm, not text-xs -->
    <thead>
      <tr class="tbl-head text-left text-[10px] uppercase tracking-widest border-b">
```
Used at lines: 5404, 5644, 5791 (and others)

### Inconsistencies Found

| Issue | Pattern A | Pattern B | Impact |
|-------|-----------|-----------|--------|
| Container class | `table-wrap` (custom CSS) | Inline `overflow-x-auto rounded-2xl border dark:border-zinc-700 border-zinc-200` | Visual: different bg/border treatment |
| Text size | `text-xs` | `text-sm` | Content density: Pattern B rows are taller |
| Dark border color | `#1c1c1f` (via CSS) | `zinc-700` (#3f3f46) | Pattern B border is lighter in dark mode |
| Background | `#111113` (via CSS) | Transparent (no bg class) | Pattern B has no card background |

### Tables Using text-sm (INCONSISTENT — should be text-xs)
- Line 5404: COD monitoring table (owner)
- Line 5644: Kurir monitoring table (owner)
- Line 5791: COD approval table (kasir)

### Proposed Standard Table Classes

```html
<!-- STANDARD TABLE TEMPLATE -->
<div class="table-wrap rounded-2xl overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="tbl-head text-left text-[10px] uppercase tracking-widest border-b">
          <th class="px-5 py-3.5 font-medium">Kolom 1</th>
          <th class="px-5 py-3.5 font-medium">Kolom 2</th>
        </tr>
      </thead>
      <tbody>
        <tr class="tbl-row">
          <td class="px-5 py-3.5">Data 1</td>
          <td class="px-5 py-3.5">Data 2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Standard classes:**
- Container: `table-wrap rounded-2xl overflow-hidden` (uses CSS class for dark/light bg)
- Scroll wrapper: `overflow-x-auto` (inside container, enables horizontal scroll on mobile)
- Table: `w-full text-xs` (ALWAYS text-xs for consistency)
- Header row: `tbl-head text-left text-[10px] uppercase tracking-widest border-b`
- Header cell: `px-5 py-3.5 font-medium`
- Body row: `tbl-row` (uses CSS class for border + hover)
- Body cell: `px-5 py-3.5`

---

## 4. OVERFLOW BUG CANDIDATES

### Tables Without overflow-x-auto (Mobile Overflow Risk)
- Line 5404: COD monitoring — uses inline `overflow-x-auto` ✅
- Line 5644: Kurir monitoring — uses inline `overflow-x-auto` ✅
- Line 5791: COD approval — uses inline `overflow-x-auto` ✅
- Most `table-wrap` tables: MISSING `overflow-x-auto` inner wrapper ⚠️

### Containers Without overflow-hidden
- 234 border containers found without `overflow-hidden`
- Most are `table-wrap` containers that rely on the CSS class for bg/border but don't have `overflow-hidden`
- Risk: long text in table cells can overflow the rounded border

### Specific Overflow Risk Locations
- Tables with long product names (e.g., unit labels like "Samsung Galaxy S24 Ultra 256GB")
- Tables with monetary values (e.g., "Rp 12.345.678")
- Tables with long IDs (e.g., "UN-BN-AI-001234")
- Tables with status badges that might wrap

---

## 5. RESPONSIVENESS AUDIT

### Breakpoint Usage
- `sm:` — 20 occurrences
- `md:` — 23 occurrences
- `lg:` — 24 occurrences
- `xl:` — 7 occurrences

### Mobile-First Assessment
- Most layouts use `flex-col` for mobile, `md:flex-row` for desktop ✅
- Login page: `max-w-sm` centered — good for mobile ✅
- Sidebar: hidden on mobile, hamburger toggle — good ✅
- Tables: `overflow-x-auto` on some, missing on others ⚠️

### Responsiveness Issues
1. **Tables with text-sm (lines 5404, 5644, 5791)** — larger text = more overflow on mobile
2. **Some table-wrap containers missing overflow-x-auto** — horizontal scroll broken on mobile
3. **Inline style= height values** — fixed pixel heights don't adapt to content
4. **Modal positioning** — `items-end sm:items-center` is good ✅
5. **Dashboard stat cards** — check if grid-cols is responsive

---

## SUMMARY — Priority Fix Order

| Priority | Area | Effort | Impact | Instances |
|----------|------|--------|--------|-----------|
| 1 | Table standardization (text-xs, table-wrap, overflow, padding) | Medium | High — affects 13 tables | 13 tables |
| 2 | Emoji → SVG replacement | Medium | High — no emoji policy | 49 instances, 18 unique SVGs |
| 3 | Overflow bug fix (overflow-x-auto + overflow-hidden on all tables) | Low | High — mobile usability | 6 tables missing wrapper |
| 4 | Inline style= → Tailwind classes | Low | Medium | 27 replaceable, 4 keep |
| 5 | Custom CSS → Tailwind (where possible) | High | Medium | ~30 of ~37 rule groups |
| 6 | Responsiveness check (text-sm tables → text-xs) | Low | Medium — mobile density | 3 tables |

### What NOT to Convert to Tailwind
- Scrollbar styling (lines 60-62) — needs pseudo-elements
- Skeleton/spinner/toast animations — needs @keyframes
- Select dropdown arrow (lines 276-282) — needs background-image SVG
- Receipt print styles (lines 3263-3285) — thermal printer output
- Page transition (line 418) — needs transition property
- Nav link states (lines 67-103) — complex dark/light with active states
- Button variants (lines 106-151) — complex gradient + dark/light
