import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jayaphone — Internal Management",
  description: "Sistem manajemen internal Jayaphone: stok HP, transaksi, service, sparepart, COD, dan monitoring influencer.",
};

/**
 * Root layout. Everything (public login page + protected app shell) sits
 * under here so that <AppProviders>' AuthContext/ThemeContext/ToastContext
 * only mount once for the entire application lifetime.
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
