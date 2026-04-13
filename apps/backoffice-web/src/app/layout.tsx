import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kin Delivery — Backoffice",
  description: "Backoffice management portal for Kin Delivery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
