import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'ICAP AI Prep',
  description: 'AI-powered MCQ practice platform for ICAP Chartered Accountant students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-black text-gray-100" suppressHydrationWarning>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
