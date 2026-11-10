import { useMemo } from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { wavePaths, rosettePath } from '../../components/brand/guilloche.js';
import { money, moneyWhole } from '../../lib/format.js';

const W = 720;
const H = 260;

/** Splits "₹4,86,230.50" so the paise can be set smaller than the rupees. */
function splitAmount(minor) {
  const text = money(Math.abs(minor));
  const dot = text.lastIndexOf('.');
  return { rupees: text.slice(0, dot), paise: text.slice(dot) };
}

/**
 * The balance, presented as a banknote: celadon tint, guilloché linework that draws
 * itself once on load, and a windowed marigold security thread.
 */
export function BalanceNote({ balance = 0, net = 0, monthLabel, partial, className }) {
  const art = useMemo(
    () => ({
      waves: wavePaths({ width: W, height: H, count: 15 }),
      rosettes: [
        rosettePath({ cx: 590, cy: 128, R: 92, r: 33, d: 66, turns: 33 }),
        rosettePath({ cx: 590, cy: 128, R: 70, r: 25, d: 44, turns: 25 }),
      ],
    }),
    [],
  );
  const { rupees, paise } = splitAmount(balance);
  const saved = net >= 0;

  return (
    <section
      aria-label="Balance"
      className={clsx('relative isolate min-h-[15rem] overflow-hidden rounded-[22px] bg-note text-ink ring-1 ring-note-line/15', className)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="guilloche-draw absolute inset-0 -z-10 h-full w-full"
        aria-hidden
      >
        <g fill="none" stroke="var(--note-line)" strokeWidth="0.7" opacity="0.22">
          {art.waves.map((d, i) => (
            <path key={i} d={d} style={{ '--len': 900, animationDelay: `${i * 35}ms` }} />
          ))}
        </g>
        <g fill="none" stroke="var(--note-line)" strokeWidth="0.6" opacity="0.38">
          {art.rosettes.map((d, i) => (
            <path key={i} d={d} style={{ '--len': 26000, animationDuration: '2.4s' }} />
          ))}
        </g>
        {/* Watermark rupee */}
        <text x="586" y="150" textAnchor="middle" fontSize="74" fontWeight="700" fill="var(--note-line)" opacity="0.12">
          ₹
        </text>
      </svg>

      {/* Windowed security thread */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-[86%] -z-10 w-[7px] sm:left-[66%]"
        style={{
          background:
            'repeating-linear-gradient(to bottom, var(--thread) 0 18px, color-mix(in oklch, var(--thread) 35%, transparent) 18px 26px)',
        }}
      />

      <div className="flex h-full flex-col justify-between gap-8 p-6 pr-14 sm:p-7">
        <div>
          <p className="text-[0.9375rem] font-medium text-ink-2">Balance</p>
          <p className="mt-1 flex items-baseline font-condensed leading-none font-semibold tracking-[-0.01em]">
            <span className="text-[3.25rem] sm:text-[4rem]">
              {balance < 0 && '-'}
              {rupees}
            </span>
            <span className="text-[1.75rem] text-ink-2 sm:text-[2rem]">{paise}</span>
          </p>
          <p className="mt-2 max-w-[22rem] text-sm text-ink-2">Everything you&apos;ve earned minus everything you&apos;ve spent in Kosha.</p>
        </div>

        <p className="flex items-center gap-2 text-[0.9375rem]">
          <span
            className={clsx(
              'inline-flex h-7 w-7 items-center justify-center rounded-full',
              saved ? 'bg-income/15 text-income-text' : 'bg-bad/12 text-bad-text',
            )}
          >
            {saved ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
          </span>
          <span>
            <strong className="font-semibold">{moneyWhole(Math.abs(net))}</strong>{' '}
            {saved ? 'saved' : 'overspent'} in {monthLabel}
            {partial ? ' so far' : ''}
          </span>
        </p>
      </div>
    </section>
  );
}
