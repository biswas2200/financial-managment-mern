import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { parseConsent, rawConsent, readPreference, subscribeConsent, writePreference } from '../lib/consent.js';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'kosha-theme';

// The remembered theme is an optional item: it is read, and stored, only after the person said yes to preferences.
function readStoredTheme() {
  const stored = readPreference(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredTheme);
  const allowed = parseConsent(useSyncExternalStore(subscribeConsent, rawConsent, () => null))?.preferences === true;
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

  // Before a yes the theme lasts for this visit only. On a yes, whatever is chosen is remembered from then on.
  useEffect(() => {
    if (allowed && (preference !== 'system' || readPreference(STORAGE_KEY) !== null)) writePreference(STORAGE_KEY, preference);
  }, [allowed, preference]);

  const setTheme = useCallback((value) => setPreference(value), []);

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
