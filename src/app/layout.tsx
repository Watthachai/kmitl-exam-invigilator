import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Loading from './loading';
import { Suspense } from 'react';
import { Providers } from "@/components/providers";

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
  title: 'KMITL Exam Invigilator',
  description: 'ระบบจัดการการคุมสอบ คณะวิศวกรรมศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
      </head>
      <body
        className={`${notoSansThai.variable} font-thai antialiased`}
        >
          <Providers>
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </Providers>
      </body>
    </html>
  );
}
