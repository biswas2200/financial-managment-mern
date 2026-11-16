import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { Logo } from '../../components/brand/Logo.jsx';
import { CityScene } from '../../components/brand/sketch/CityScene.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';

const DOMAINS = [
  {
    name: 'Money',
    icon: Wallet,
    text: 'Log income and expenses in seconds, give every category a monthly limit, and see your month at a glance. Kosha understands how India pays: UPI, cards, rent and EMIs. If your balance drops below zero, it explains why and helps you fix it.',
  },
  {
    name: 'Invest',
    icon: TrendingUp,
    text: 'End-of-day Nifty, sector and stock numbers, and mutual fund NAVs with 1, 3 and 5 year returns, all from official NSE and AMFI data. Keep a watchlist, and have every term explained in plain words.',
  },
  {
    name: 'Learn & talk',
    icon: BookOpen,
    text: 'Original guides on saving, investing, tax, insurance and scams. Open one over a blurred page, then comment, like or dislike. Likes and dislikes are counted separately, and neither can go below zero.',
  },
  {
    name: 'Assistant',
    icon: Sparkles,
    text: 'Copilot answers questions about your own numbers, drafts entries for you to confirm, and explains market data without telling you what to buy.',
  },
];

const HONEST = [
  'Market figures are end-of-day and carry their date. If a data source cannot be reached, Kosha says so instead of showing made-up numbers.',
  'Copilot uses Google Gemini when the server is set up for it, and a plainly labelled offline engine when it is not.',
  'Your records are yours. If you delete your account, every record goes with it.',
  'Guides and market pages are general education, not advice. Kosha will not tell you what to buy.',
];

const primary = 'btn-3d inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-brand-ink hover:bg-brand-hover';
const secondary = 'btn-3d-soft inline-flex h-12 items-center justify-center rounded-xl bg-surface px-6 text-base font-semibold text-ink hover:bg-surface-2';

/** What visitors see at the front door: the idea, a living sketch of Indian cities, what is inside, and a way in. */
export default function LandingPage() {
  return (
    <div className="landing min-h-dvh text-ink">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-3 py-2 text-[0.9375rem] font-semibold text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <Link to="/register" className="btn-3d hidden h-10 items-center rounded-[10px] bg-brand px-4 text-[0.9375rem] font-semibold text-brand-ink hover:bg-brand-hover sm:inline-flex">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section aria-label="Kosha" className="relative isolate overflow-hidden" style={{ '--sk-h': 'clamp(200px, 31vh, 280px)' }}>
          <CityScene />
          <div className="relative z-10 mx-auto max-w-6xl px-5 pt-28 pb-[calc(var(--sk-h)+2.5rem)] sm:px-8 lg:pt-36 lg:pb-[calc(var(--sk-h)+4.5rem)]">
            <h1 className="font-extrawide max-w-[14ch] text-[2.5rem] leading-[1.04] font-bold tracking-[-0.02em] text-balance sm:text-[3.5rem] lg:text-[4.5rem]">
              Know where every rupee goes.
            </h1>
            <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-ink-2 sm:text-lg">
              Kosha keeps your income, spending and budgets in one place, next to official market numbers and plain-language money guides. Ask Copilot about your own figures before your next decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={primary}>
                Create your account
              </Link>
              <Link to="/login" className={secondary}>
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-3">Free to use. Your records stay in your account.</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="divide-y divide-line border-y border-line">
            {DOMAINS.map(({ name, icon: Icon, text }) => (
              <section key={name} className="grid gap-4 py-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14 lg:py-12">
                <div className="flex items-center gap-3">
                  <Icon size={26} aria-hidden strokeWidth={1.5} />
                  <h2 className="font-wide text-[1.75rem] leading-tight font-semibold">{name}</h2>
                </div>
                <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{text}</p>
              </section>
            ))}
          </div>

          <section aria-labelledby="honest" className="grid gap-6 py-14 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14 lg:py-16">
            <h2 id="honest" className="font-wide text-[1.75rem] leading-tight font-semibold">
              What Kosha is honest about
            </h2>
            <ul className="flex max-w-2xl flex-col gap-4 text-[1.0625rem] leading-relaxed text-ink-2">
              {HONEST.map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-label="Get started" className="relative isolate overflow-hidden border-t border-line" style={{ '--sk-h': '150px' }}>
          <CityScene labels={false} decorative />
          <div className="relative z-10 mx-auto max-w-6xl px-5 pt-16 pb-[calc(var(--sk-h)+2rem)] sm:px-8 sm:pt-20">
            <h2 className="font-extrawide max-w-[16ch] text-[2rem] leading-tight font-bold text-balance sm:text-[2.75rem]">Start with one expense.</h2>
            <p className="mt-3 max-w-md text-ink-2">It takes less than a minute, and your default categories are set up for you.</p>
            <Link to="/register" className={`${primary} mt-6`}>
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-3 sm:px-8">
          <p>Kosha is a project for learning. Nothing here is investment advice.</p>
          <nav aria-label="Legal" className="flex gap-5">
            <Link to="/privacy" className="hover:text-ink hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-ink hover:underline">
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
