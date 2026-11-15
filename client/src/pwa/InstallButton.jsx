import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Smartphone } from 'lucide-react';

/** Shown only when the browser offers to install Kosha as an app. */
export function InstallButton({ className, ...props }) {
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault?.();
      setDeferred(e);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred) return null;

  return (
    <button
      type="button"
      {...props}
      onClick={async () => {
        const event = deferred;
        setDeferred(null);
        await event.prompt();
      }}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        className,
      )}
    >
      <Smartphone size={16} aria-hidden />
      Install Kosha app
    </button>
  );
}
