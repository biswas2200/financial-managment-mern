import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="pop-in fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 bg-warn px-4 py-2 text-sm font-medium text-[#3d2a00]"
    >
      <WifiOff size={16} aria-hidden />
      You&apos;re offline. Pages you opened still show; new entries need a connection.
    </div>
  );
}
