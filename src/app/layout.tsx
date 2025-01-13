import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const notoSansThai = localFont({
  src: [
    {
      path: './fonts/NotoSansThaiLooped-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansThaiLooped-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansThaiLooped-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-noto-sans-thai',
});

export const metadata: Metadata = {
  title: "KMITL | Invigilator",
  description: "King Mongkut's Institute of Technology Ladkrabang Invigilation System for Engineering Faculty",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${notoSansThai.variable} font-thai antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
