import { Outlet } from 'react-router-dom';
import { Logo } from '../../components/brand/Logo.jsx';
import { CityScene } from '../../components/brand/sketch/CityScene.jsx';

function BrandPanel() {
  return (
    <div className="relative isolate hidden overflow-hidden lg:block" style={{ '--sk-h': 'clamp(220px, 36vh, 320px)' }}>
      <CityScene variant="tall" />
      <div className="relative z-10 flex h-full flex-col p-12">
        <Logo size={32} />
        <div className="mt-14 max-w-md">
          <p className="font-extrawide text-[2.5rem] leading-[1.08] font-bold tracking-[-0.015em] text-ink">Know where every rupee goes.</p>
          <p className="mt-4 text-[1.0625rem] text-ink-2">
            Log income and expenses in seconds, see your month at a glance, and ask Copilot anything about your spending.
          </p>
        </div>
      </div>
    </div>
  );
}

/** A short strip of the skyline above the form on phones, where the side panel is hidden. */
function MobileBanner() {
  return (
    <div className="relative isolate h-[170px] overflow-hidden lg:hidden" style={{ '--sk-h': '128px' }}>
      <CityScene labels={false} decorative />
      <div className="relative z-10 p-4">
        <Logo size={26} />
      </div>
    </div>
  );
}

/**
 * The frame around sign in and sign up. It is one route that both pages sit inside, so going from one to the
 * other changes only the form: the skyline keeps running instead of being drawn again from the start.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />
      <MobileBanner />
      <main className="flex items-center justify-center px-4 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
