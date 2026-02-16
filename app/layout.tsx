import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quran Saya CMS',
  description: 'CMS notifikasi adzan untuk aplikasi Quran Saya'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
