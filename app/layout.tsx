import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dipen Gupta — iPod',
  description: "Dipen Gupta's personal site, inside an iPod Classic.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get('ipod-theme')?.value;
  const theme = cookieTheme === 'black' ? 'black' : 'silver';
  return (
    <html lang="en" data-theme={theme}>
      <head>
        {/* localStorage wins over the cookie pre-hydration so a stale cookie can't flash the wrong skin */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ipod-theme');if(t==='black'||t==='silver'){document.documentElement.dataset.theme=t;}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
