import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../app/theme.jsx';
import { Button } from './primitives.jsx';

/** Switches between the light and dark theme. */
export function ThemeToggle({ className }) {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
