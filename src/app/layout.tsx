import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// The GeistSans and GeistMono imports from 'geist/font/*' are already configured
// font objects. They directly provide .variable and .className.
// No need to call them as functions like with next/font/google.

export const metadata: Metadata = {
  title: 'HomeView',
  description: 'Monitor your Home Assistant entities with dynamic charts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
