import './globals.css';

export const metadata = {
  title: 'Kin Delivery Admin',
  description: 'Backoffice for Kin Delivery',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
