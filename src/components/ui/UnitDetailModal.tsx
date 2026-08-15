// Unit detail modal — shared by /stok and /stok-kasir.
//
// GAP-001 (LEGACY_GAP_ANALYSIS.md): the legacy `modalDetailUnit`
// (index.html:2562-2662) showed a full spec grid (incl. IMEI2, tipe SIM,
// keamanan, speaker, LCD, battery health), an owner-only financial
// breakdown (harga modal / harga jual / margin), and keluhan/catatan.
// The Next.js port had trimmed this down to ~9 fields with no financial
// section at all — this restores the full legacy field set.

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { UnitStatusBadge } from "@/components/ui/Badge";
import { formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import type { Unit } from "@/lib/types";

interface UnitDetailModalProps {
  unit: Unit | null;
  onClose: () => void;
}

/** Backend leaves optional spec fields as a literal "-" sentinel when not filled in — show a real label instead of a bare dash. */
function displayOrEmpty(value?: string | null): string {
  return !value || value === "-" ? NOT_SET : value;
}

function InfoTile({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark/60">
      <p className="text-jp-muted dark:text-jp-muted-dark">{label}</p>
      <div className="mt-1 font-medium text-jp-text dark:text-jp-text-dark">{value}</div>
    </div>
  );
}

export function UnitDetailModal({ unit, onClose }: UnitDetailModalProps): JSX.Element {
  const { user } = useAuth();
  // Legacy modalDetailUnit gates the margin breakdown to `role === 'owner'`
  // specifically — kepala_cabang sees harga_modal in the table but not the
  // margin callout here. Preserved as-is rather than "improved".
  const isOwner = user?.role === "owner";
  const margin = unit && unit.harga_jual && unit.harga_modal ? unit.harga_jual - unit.harga_modal : 0;
  const marginPct = unit && unit.harga_jual && unit.harga_modal ? ((margin / unit.harga_jual) * 100).toFixed(1) : "0";

  return (
    <Modal isOpen={Boolean(unit)} onClose={onClose} title={unit ? `Detail ${unit.unit_id}` : "Detail Unit"} maxWidthClassName="max-w-2xl">
      {unit && (
        <div className="space-y-4 text-xs">
          {unit.foto_url && (
            <img
              src={unit.foto_url}
              alt={unit.unit_id}
              className="h-56 w-full rounded-jp-sm bg-jp-surface-subtle object-contain dark:bg-jp-surface-subtle-dark"
            />
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile label="ID Unit" value={<span className="font-mono">{unit.unit_id}</span>} />
            <InfoTile label="Status" value={<UnitStatusBadge status={unit.status} />} />
            <InfoTile label="Kategori" value={displayOrEmpty(unit.kategori)} />
            <InfoTile label="Kondisi" value={displayOrEmpty(unit.kondisi)} />
          </div>

          <div className="border-t border-jp-border pt-3 dark:border-jp-border-dark">
            <p className="mb-3 text-xs font-semibold text-jp-text-soft dark:text-jp-muted-dark">Spesifikasi</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoTile label="Merk" value={unit.merk} />
              <InfoTile label="Tipe" value={unit.tipe} />
              <InfoTile label="Storage" value={displayOrEmpty(unit.storage)} />
              <InfoTile label="RAM" value={displayOrEmpty(unit.ram)} />
              <InfoTile label="Warna" value={displayOrEmpty(unit.warna)} />
              <InfoTile label="Kondisi HP" value={unit.kondisi_hp} />
              <InfoTile label="IMEI 1" value={<span className="font-mono">{unit.imei}</span>} />
              <InfoTile label="IMEI 2" value={<span className="font-mono">{displayOrEmpty(unit.imei2)}</span>} />
              <InfoTile label="Tipe SIM" value={displayOrEmpty(unit.tipe_sim)} />
              <InfoTile label="Keamanan" value={displayOrEmpty(unit.keamanan)} />
              <InfoTile label="Speaker" value={displayOrEmpty(unit.speaker)} />
              <InfoTile label="LCD" value={displayOrEmpty(unit.lcd)} />
              <InfoTile label="Battery" value={`${unit.battery}%`} />
              <InfoTile label="Battery Health" value={unit.battery_health ? `${unit.battery_health}%` : NOT_SET} />
            </div>
          </div>

          {isOwner && unit.harga_modal ? (
            <div className="border-t border-jp-border pt-3 dark:border-jp-border-dark">
              <p className="mb-3 text-xs font-semibold text-jp-text-soft dark:text-jp-muted-dark">Finansial · Owner</p>
              <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
                <div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">
                  <p className="mb-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Harga Modal</p>
                  <p className="font-semibold tabular-nums text-jp-text dark:text-jp-text-dark">{formatRupiah(unit.harga_modal)}</p>
                </div>
                <div className="rounded-jp-sm bg-jp-teal-soft p-3 dark:bg-jp-teal-soft-dark">
                  <p className="mb-1 text-[11px] text-jp-teal dark:text-jp-teal-dark">Harga Jual</p>
                  <p className="font-semibold tabular-nums text-jp-teal dark:text-jp-teal-dark">{formatRupiah(unit.harga_jual)}</p>
                </div>
                <div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">
                  <p className="mb-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Margin</p>
                  <p className="font-semibold tabular-nums text-jp-text dark:text-jp-text-dark">{formatRupiah(margin)} ({marginPct}%)</p>
                </div>
              </div>
            </div>
          ) : null}

          {unit.keluhan ? (
            <div className="border-t border-jp-border pt-3 dark:border-jp-border-dark">
              <p className="mb-2 text-xs font-semibold text-jp-text-soft dark:text-jp-muted-dark">Keluhan / Catatan</p>
              <p className="rounded-jp-xs bg-jp-surface-subtle p-3 leading-relaxed text-jp-text dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark">{unit.keluhan}</p>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
