import type { Transaksi } from "@/lib/types";

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rupiah(value: number | null | undefined): string {
  return `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;
}

/**
 * GAP-010 (LEGACY_GAP_ANALYSIS.md) — ports legacy's printStruk mechanism
 * (index.html:3541-3616): a Blob-URL opened via a synthetic `<a target="_blank">`
 * click, instead of `window.open()+document.write`. Legacy's own comment
 * explains why: this technique works on Android/Chrome mobile without
 * tripping the popup blocker, since it isn't a script-initiated
 * `window.open()` call.
 */
export function printTransactionReceipt(transaction: Transaksi): boolean {
  if (typeof window === "undefined") return false;
  const pointDiscount = (transaction.poin_dipakai || 0) * 1_000;
  const total = (transaction.harga_jual || 0) + (transaction.biaya_garansi || 0) - pointDiscount;
  const item = transaction.unit_label || transaction.sp_items?.map((part) => part.nama).join(", ") || "Item transaksi";
  const timestamp = transaction.waktu || new Date().toLocaleString("id-ID");

  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"/><title>Struk ${escapeHtml(transaction.trx_id)}</title><style>
    *{box-sizing:border-box} body{width:80mm;margin:0 auto;padding:4mm;background:#fff;color:#000;font:12px 'Courier New',monospace}.center{text-align:center}.bold{font-weight:700}.lg{font-size:15px}.sm{font-size:10px;color:#555}.dash{border-top:1px dashed #000;margin:6px 0}.row,.total{display:flex;justify-content:space-between;gap:10px;margin:2px 0}.row span:last-child{text-align:right;max-width:55%;word-break:break-word}.total{font-size:14px;font-weight:700;margin:3px 0}.footer{text-align:center;margin-top:8px;font-size:10px}.print-btn{display:block;width:100%;margin-top:16px;padding:12px;border:0;border-radius:8px;background:#000;color:#fff;font:700 14px sans-serif;cursor:pointer}@media print{body{width:80mm}.print-btn{display:none}@page{size:80mm auto;margin:0}}
  </style></head><body><div class="center bold lg">JayaPhone</div><div class="center sm">Cabang ${escapeHtml(transaction.cabang)}</div><div class="dash"></div><div class="row"><span>No. Struk</span><span class="bold">${escapeHtml(transaction.trx_id)}</span></div><div class="row"><span>Tanggal</span><span>${escapeHtml(timestamp)}</span></div><div class="row"><span>Kasir</span><span>${escapeHtml(transaction.kasir)}</span></div>${transaction.customer_nama ? `<div class="row"><span>Customer</span><span>${escapeHtml(transaction.customer_nama)}</span></div>` : ""}<div class="dash"></div><div class="bold">Item Pembelian</div><div class="row"><span>${escapeHtml(item)}</span><span class="bold">${escapeHtml(rupiah(transaction.harga_jual))}</span></div>${transaction.unit_id ? `<div class="sm">ID: ${escapeHtml(transaction.unit_id)}</div>` : ""}${transaction.biaya_garansi ? `<div class="row"><span>Garansi ${escapeHtml(transaction.garansi_hari)} hari</span><span>${escapeHtml(rupiah(transaction.biaya_garansi))}</span></div>` : ""}${transaction.poin_dipakai ? `<div class="row"><span>Diskon poin (${escapeHtml(transaction.poin_dipakai)})</span><span>-${escapeHtml(rupiah(pointDiscount))}</span></div>` : ""}<div class="dash"></div><div class="total"><span>TOTAL BAYAR</span><span>${escapeHtml(rupiah(total))}</span></div><div class="dash"></div>${transaction.poin_dapat ? `<div class="row sm"><span>Poin didapat</span><span>${escapeHtml(transaction.poin_dapat)} poin</span></div>` : ""}${transaction.garansi_hari ? `<div class="row sm"><span>Garansi toko</span><span>${escapeHtml(transaction.garansi_hari)} hari</span></div>` : ""}<div class="footer">Terima kasih telah berbelanja di JayaPhone</div><button class="print-btn" onclick="window.print()">Cetak Struk</button></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
