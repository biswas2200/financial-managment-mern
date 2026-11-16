import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useMe, useSaveCookieChoice } from '../../api/hooks.js';
import { parseConsent, rawConsent, reconcileConsent, saveConsent, subscribeConsent } from '../../lib/consent.js';

const none = { choice: null, decided: false, preferencesAllowed: false, signedIn: false, savedToAccount: false, saving: false, decide: (preferences) => saveConsent({ preferences }) };
const Context = createContext(none);

/**
 * Holds the cookie choice for the whole app. The choice lives in this browser (so a visitor can make it before
 * signing in) and, once someone is signed in, with their account, so it follows them to every device:
 * the newer of the two answers wins.
 */
export function CookieConsentProvider({ children }) {
  const raw = useSyncExternalStore(subscribeConsent, rawConsent, () => null);
  const choice = useMemo(() => parseConsent(raw), [raw]);
  const { data: user } = useMe();
  const save = useSaveCookieChoice();
  const pushed = useRef(null);

  const server = user?.cookieConsent ?? null;
  const signedInId = user?.id ?? null;

  useEffect(() => {
    if (!signedInId) return;
    const action = reconcileConsent(choice, server);
    if (action === 'adopt') {
      saveConsent({ preferences: server.preferences, decidedAt: server.decidedAt });
    } else if (action === 'push') {
      const key = `${choice.preferences}|${choice.decidedAt}`;
      if (pushed.current === key) return;
      pushed.current = key;
      save.mutate(
        { preferences: choice.preferences, decidedAt: choice.decidedAt },
        { onError: () => (pushed.current = null) }, // try again the next time something changes
      );
    }
    // `save` is a new object on every render; what matters is the two answers and who is signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInId, choice?.preferences, choice?.decidedAt, server?.preferences, server?.decidedAt]);

  const decide = useCallback((preferences) => saveConsent({ preferences }), []);
  const savedToAccount = Boolean(choice && server && server.decidedAt === choice.decidedAt && server.preferences === choice.preferences);

  const value = useMemo(
    () => ({ choice, decided: Boolean(choice), preferencesAllowed: choice?.preferences === true, signedIn: Boolean(signedInId), savedToAccount, saving: save.isPending, decide }),
    [choice, signedInId, savedToAccount, save.isPending, decide],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useCookieConsent = () => useContext(Context);
