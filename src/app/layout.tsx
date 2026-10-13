import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Электронный Дневник',
  description: 'Адаптивный кастомный клиент для школьного дневника e-schools.by',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Дневник',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark bg-black" style={{ backgroundColor: '#000000', color: '#f4f4f5' }}>
      <body
        className="bg-black text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white"
        style={{ backgroundColor: '#000000', color: '#f4f4f5', margin: 0, padding: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
