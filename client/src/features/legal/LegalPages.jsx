import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { POLICY_VERSION } from '@kosha/shared';
import { Logo } from '../../components/brand/Logo.jsx';
import { BackToTop } from '../../components/ui/BackToTop.jsx';
import { PRIVACY, TERMS } from './legal.js';

function Block({ block }) {
  if (typeof block === 'string') return <p className="text-[0.9375rem] leading-relaxed text-ink-2">{block}</p>;
  if (block.list) {
    return (
      <ul className="ml-5 flex list-disc flex-col gap-1.5 text-[0.9375rem] leading-relaxed text-ink-2 marker:text-ink-3">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  const { head, rows } = block.table;
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-ink-2">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([what, details, required]) => (
            <tr key={what} className="align-top">
              <th scope="row" className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {what}
              </th>
              <td className="px-3 py-2.5 text-ink-2">{details}</td>
              <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{required}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegalDocument({ doc, otherLink }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo size={28} />
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand hover:underline">
          <ArrowLeft size={16} aria-hidden />
          Back to Kosha
        </Link>
      </header>
      <main id="main" tabIndex={-1} className="page-in mx-auto max-w-3xl px-4 pb-20 outline-none sm:px-6">
        <h1 className="font-wide text-[2rem] leading-tight font-semibold sm:text-[2.5rem]">{doc.title}</h1>
        <p className="mt-2 text-sm text-ink-3">Version {POLICY_VERSION}</p>
        <div className="mt-6 flex flex-col gap-3">
          {doc.intro.map((p) => (
            <p key={p} className="text-[1.0625rem] leading-relaxed text-ink">
              {p}
            </p>
          ))}
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">{doc.note}</p>
        </div>

        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {doc.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full bg-surface px-3 py-1 text-[0.8125rem] font-medium text-ink-2 ring-1 ring-line-strong transition-colors hover:bg-surface-2 hover:text-ink">
              {s.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="mb-3 font-wide text-xl font-semibold">{s.title}</h2>
              <div className="flex flex-col gap-3">
                {s.body.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 text-sm text-ink-2">
          Also read the{' '}
          <Link to={otherLink.to} className="font-semibold text-brand hover:underline">
            {otherLink.label}
          </Link>
          .
        </p>
      </main>
      <BackToTop className="right-4 bottom-5 sm:right-8 sm:bottom-8" />
    </div>
  );
}

export const PrivacyPage = () => <LegalDocument doc={PRIVACY} otherLink={{ to: '/terms', label: 'Terms of Use' }} />;
export const TermsPage = () => <LegalDocument doc={TERMS} otherLink={{ to: '/privacy', label: 'Privacy Policy' }} />;
