import { useAssistantStatus } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/AppShell.jsx';
import { CopilotChat } from './CopilotChat.jsx';

const CAPABILITIES = [
  ['Summaries', '"How did I do in October?"'],
  ['Breakdowns', '"Where is my money going?"'],
  ['Comparisons', '"Compare this month with last month"'],
  ['Budgets', '"Am I over budget?" or "Set a budget of 5000 for dining"'],
  ['Search', '"Show my Swiggy orders"'],
  ['Logging', '"Spent 300 on Uber yesterday"'],
];

export default function AssistantPage() {
  const { data: status } = useAssistantStatus();
  return (
    <>
      <PageHeader title="Copilot" description="Ask questions about your money in plain language. Copilot only reads your own Kosha data." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex h-[calc(100dvh-15rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line lg:h-[calc(100dvh-13rem)]">
          <CopilotChat className="h-full" />
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 className="font-wide font-semibold">What you can ask</h2>
            <dl className="mt-3 flex flex-col gap-3 text-sm">
              {CAPABILITIES.map(([title, example]) => (
                <div key={title}>
                  <dt className="font-medium">{title}</dt>
                  <dd className="text-ink-2">{example}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl bg-surface p-5 text-sm ring-1 ring-line">
            <h2 className="font-wide font-semibold">How it works</h2>
            {status?.provider === 'gemini' ? (
              <p className="mt-2 text-ink-2">
                Your question goes to Google Gemini ({status.model}) together with a set of Kosha tools. Gemini decides which
                tool to call (for example a monthly summary), Kosha runs it against your data, and Gemini writes the answer.
              </p>
            ) : (
              <p className="mt-2 text-ink-2">
                Gemini isn&apos;t configured on this server, so Copilot is using its built-in offline engine with the same tools.
                Add <code className="rounded bg-surface-2 px-1">GEMINI_API_KEY</code> to <code className="rounded bg-surface-2 px-1">server/.env</code> to
                switch to Gemini.
              </p>
            )}
            <p className="mt-3 text-ink-2">Drafted transactions and budgets are never saved until you tap Confirm.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
