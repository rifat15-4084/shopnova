import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useThemeEffect } from '@/components/layout/theme-toggle';
import { Toaster } from '@/components/ui/toaster';
import { Outlet, ScrollRestoration } from 'react-router-dom';

export function RootLayout() {
  useThemeEffect();

  return (
    <div className="flex min-h-[100svh] flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
