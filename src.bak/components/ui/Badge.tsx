// Small badge component — the legacy helpers `badge(status)` and
// `badgeService(status)` used a class-name lookup off a status string.
// This TS port centralizes that mapping and exposes two typed variants.

import type { ServiceStatus, UnitStatus } from "@/lib/types";

const unitStatusClass: Record<UnitStatus, string> = {
  "Tersedia": "badge-tersedia",
  "Sold": "badge-sold",
  "Booking": "badge-booking",
  "Service": "badge-service",
  "Dalam Transfer": "badge-booking",
  "Ditolak": "badge-sold",
};

const serviceStatusClass: Record<ServiceStatus, string> = {
  "Antrian": "badge-masuk",
  "Proses": "badge-proses",
  "Selesai": "badge-selesai",
  "Approved": "badge-diambil",
  "Ditolak": "badge-sold",
};

export function UnitStatusBadge({ status }: { status: UnitStatus }): JSX.Element {
  return <span className={`badge ${unitStatusClass[status] ?? "badge-service"}`}>{status}</span>;
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }): JSX.Element {
  return <span className={`badge ${serviceStatusClass[status] ?? "badge-masuk"}`}>{status}</span>;
}
