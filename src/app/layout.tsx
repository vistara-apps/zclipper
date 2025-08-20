import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZClipper AI — Never miss a viral moment',
  description: 'Automatically detect and capture viral moments from your live streams in real-time. Turn engagement spikes into shareable clips.',
  keywords: 'streaming, clips, viral, twitch, youtube, content creation, live streaming',
  authors: [{ name: 'ZClipper AI' }],
  openGraph: {
    title: 'ZClipper AI — Never miss a viral moment',
    description: 'Automatically detect and capture viral moments from your live streams in real-time.',
    type: 'website',
    url: 'https://zclipper-a07p7z9nl-vistara.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZClipper AI — Never miss a viral moment',
    description: 'Automatically detect and capture viral moments from your live streams in real-time.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}