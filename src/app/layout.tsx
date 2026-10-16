import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { ActiveOrderTrackerProvider } from '@/hooks/useActiveOrderTracker';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'GULAS — Pizza, Burger & Coffee (Vila das Aves)',
  description:
    'Menu digital do Gulas em Vila das Aves: Caracóizzz, Burgers artesanais, Pizzas de longa fermentação, Panuozzos e Pregos no Caco.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FAF8F5] text-[#141619] font-sans flex flex-col">
        <CartProvider>
          <ActiveOrderTrackerProvider>{children}</ActiveOrderTrackerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
