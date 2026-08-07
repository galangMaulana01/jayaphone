// Kategori/kondisi codes shared by every flow that creates a new inventory
// unit (Tambah Unit, Approval COD-Beli). Mirrors the backend's id-generator
// maps exactly (app/utils/id_generator.py _KATEGORI_MAP / _KONDISI_MAP) —
// kat_kode/kondisi_kode drive the generated unit_id on both paths, and on
// the COD-beli approval path they also determine the stored `kategori`/
// `kondisi` label fields directly (that endpoint does not resolve a code to
// a label server-side the way unit_service.create_unit does — see NF-001
// in notfixedlogic.md before this fix).
export interface UnitCodeOption {
  code: string;
  label: string;
}

export const KATEGORI_OPTIONS: UnitCodeOption[] = [
  { code: "IP", label: "iPhone" },
  { code: "AI", label: "Android" },
  { code: "TB", label: "Tablet" },
  { code: "AC", label: "Accessories" },
];

export const KONDISI_OPTIONS: UnitCodeOption[] = [
  { code: "BN", label: "Normal" },
  { code: "MN", label: "Minus" },
  { code: "EX", label: "Ex Inter" },
  { code: "RJ", label: "Reject" },
];

/** Same rule the backend enforces for `imei`/`imei2` (app/schemas/unit.py): 14-16 digits, or the "-" sentinel for "no IMEI". */
export const IMEI_PATTERN = /^\d{14,16}$/;

// Physical-inspection fields are free text on the backend (no validation), but
// app/schemas/unit.py documents the intended value sets in comments — dropdowns
// here keep the data consistent across every flow that captures unit specs
// (Tambah Unit, and the kurir's COD-beli on-site inspection form).
export const TIPE_SIM_OPTIONS = ["Single SIM", "Dual SIM", "eSIM", "WiFi Only"];
export const KEAMANAN_OPTIONS = ["Face ID", "Fingerprint", "Touch ID", "Tidak Ada"];
export const SPEAKER_OPTIONS = ["Normal", "Tidak Normal"];
export const LCD_OPTIONS = ["Original", "Tidak Original"];

export function labelForKatKode(code: string): string {
  return KATEGORI_OPTIONS.find((option) => option.code === code)?.label ?? "";
}

export function labelForKondisiKode(code: string): string {
  return KONDISI_OPTIONS.find((option) => option.code === code)?.label ?? "";
}
