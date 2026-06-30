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
    // suppressHydrationWarning: the inline script below may legitimately
    // rewrite data-theme before hydration (localStorage wins over a stale
    // cookie), and browser extensions inject classes on <html>. Applies to
    // this element's attributes only — children are still verified.
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        {/* localStorage wins over the cookie pre-hydration so a stale cookie can't flash the wrong skin */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ipod-theme');if(t==='black'||t==='silver'){document.documentElement.dataset.theme=t;}}catch(e){}`,
          }}
        />
        {/* Device-aware view: send desktops to iTunes and small/portrait
            devices to the iPod before paint, so neither view flashes. A
            ?view= param (set by a cross-link) pins an explicit choice. Mirrors
            the rule in src/lib/device/viewRouting.ts — keep the two in sync. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=location.pathname;if(p!=='/'&&p!=='/itunes')throw 0;var q=new URLSearchParams(location.search).get('view');if(q==='ipod'||q==='itunes')localStorage.setItem('ipod-view-pref',q);var pin=localStorage.getItem('ipod-view-pref');var m=function(s){return matchMedia(s).matches};var want=(m('(pointer: coarse)')&&m('(orientation: landscape)'))?'itunes':(m('(pointer: coarse)')||m('(max-width: 767px)'))?'ipod':'itunes';var v=(pin==='ipod'||pin==='itunes')?pin:want;if(v==='itunes'&&p==='/')location.replace('/itunes');else if(v==='ipod'&&p==='/itunes')location.replace('/');}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
