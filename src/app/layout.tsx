import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className={geistSans.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
