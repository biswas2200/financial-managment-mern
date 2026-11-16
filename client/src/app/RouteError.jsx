import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo.jsx';
import { Button } from '../components/ui/primitives.jsx';
import { reloadPage } from '../lib/reload.js';

const STALE = /dynamically imported module|importing a module script failed|ChunkLoadError|Loading chunk/i;
const KEY = 'kosha-update-reload';

/**
 * What shows when a page cannot load. The common cause is an update: this tab is running the old version, and the
 * files it asks for have been replaced. The tab reloads once by itself to pick up the new version; if that does not
 * help, or for any other error, it says so plainly instead of showing the framework's raw error screen.
 */
export function RouteError() {
  const error = useRouteError();
  const stale = STALE.test(String(error?.message ?? ''));

  useEffect(() => {
    if (!stale) return;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) ?? 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        reloadPage();
      }
    } catch {
      /* no session storage: the button below still works */
    }
  }, [stale]);

  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <LogoMark size={44} />
      {stale ? (
        <>
          <h1 className="font-wide text-2xl font-semibold">Kosha was updated</h1>
          <p className="max-w-sm text-ink-2">A newer version is available. Reload to keep going. Anything you saved is safe.</p>
          <Button onClick={() => reloadPage()}>Reload Kosha</Button>
        </>
      ) : (
        <>
          <h1 className="font-wide text-2xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-ink-2">This page could not be shown. Your data is safe. Try again, or go back to your overview.</p>
          <Link to="/" className="font-semibold text-brand hover:underline">
            Go to your overview
          </Link>
        </>
      )}
    </div>
  );
}
