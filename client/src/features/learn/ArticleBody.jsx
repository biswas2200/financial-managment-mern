import clsx from 'clsx';
import { Lightbulb, TriangleAlert, Info } from 'lucide-react';

const TONES = {
  tip: { icon: Lightbulb, box: 'bg-income/10 ring-income/30', ink: 'text-income-text' },
  warn: { icon: TriangleAlert, box: 'bg-warn/15 ring-warn/40', ink: 'text-warn-text' },
  note: { icon: Info, box: 'bg-brand-soft ring-brand/20', ink: 'text-brand' },
};

/**
 * Renders an article's blocks. Everything is drawn as plain text by React, so nothing in an article can run
 * as markup. A block type it does not know is skipped.
 */
export function ArticleBody({ blocks }) {
  return (
    <div className="flex flex-col gap-4 text-[1.0625rem] leading-[1.7] text-ink">
      {blocks.map((b, i) => {
        if (b.type === 'p') return <p key={i}>{b.text}</p>;
        if (b.type === 'h2')
          return (
            <h3 key={i} className="mt-3 font-wide text-[1.25rem] leading-snug font-semibold">
              {b.text}
            </h3>
          );
        if (b.type === 'ul' || b.type === 'ol') {
          const List = b.type;
          return (
            <List key={i} className={clsx('flex flex-col gap-1.5 pl-6', b.type === 'ul' ? 'list-disc' : 'list-decimal')}>
              {b.items.map((item, j) => (
                <li key={j} className="pl-1">
                  {item}
                </li>
              ))}
            </List>
          );
        }
        if (b.type === 'callout') {
          const tone = TONES[b.tone] ?? TONES.note;
          const Icon = tone.icon;
          return (
            <aside key={i} data-tone={b.tone} className={clsx('flex gap-3 rounded-xl p-4 text-[1rem] leading-relaxed ring-1', tone.box)}>
              <Icon size={20} aria-hidden className={clsx('mt-0.5 shrink-0', tone.ink)} />
              <div>
                <p className={clsx('font-semibold', tone.ink)}>{b.title}</p>
                <p className="mt-0.5">{b.text}</p>
              </div>
            </aside>
          );
        }
        return null;
      })}
    </div>
  );
}
