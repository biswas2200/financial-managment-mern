import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'kosha-theme';

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'system';
  } catch {
    return 'system';
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemIsDark, setSystemIsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemIsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setTheme = useCallback((value) => {
    setPreference(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private mode: preference lasts for this session only */
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setTheme }), [preference, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext) ?? { preference: 'light', resolved: 'light', setTheme: () => {} };
}

/** Resolved CSS colour tokens for SVG charts (Recharts takes colours as attributes). */
export function useChartColors() {
  const { resolved } = useTheme();
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    return {
      income: v('--income'),
      expense: v('--expense'),
      grid: v('--grid'),
      axis: v('--axis'),
      ink: v('--ink'),
      ink2: v('--ink-2'),
      ink3: v('--ink-3'),
      surface: v('--surface'),
      surface2: v('--surface-2'),
      brand: v('--brand'),
      line: v('--line'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);
}
