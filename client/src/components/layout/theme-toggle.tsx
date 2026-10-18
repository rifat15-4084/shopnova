import { useUIStore } from '@/stores/ui.store';
import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

/** Applies the persisted theme to <html> and exposes a toggle button. */
export function useThemeEffect() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-[background-color,color] duration-nova ease-nova hover:bg-accent/10 ${className ?? ''}`}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
