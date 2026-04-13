import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kin Delivery — Restaurant Web",
  description: "Restaurant management portal for Kin Delivery",
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
