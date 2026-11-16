import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useArticle, useReact } from '../../api/hooks.js';
import { Reader } from '../../components/ui/Reader.jsx';
import { Reactions } from '../../components/ui/Reactions.jsx';
import { Button, Skeleton } from '../../components/ui/primitives.jsx';
import { dateLong } from '../../lib/format.js';
import { useCopilot } from '../assistant/CopilotDrawer.jsx';
import { CommentThread } from '../community/CommentThread.jsx';
import { domainLabel } from '../community/domains.js';
import { ArticleBody } from './ArticleBody.jsx';

const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate' };

/** One article, opened over the Learn page. Its address is /learn/:slug, so it can be shared and Back closes it. */
export default function ArticleReader() {
  const { slug } = useParams();
  const { data: article, isLoading, error } = useArticle(slug);
  const react = useReact();
  const { open: askCopilot } = useCopilot();
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => navigate({ pathname: '/learn', search: location.search });

  if (!article) {
    return (
      <Reader open onClose={close} title="Article">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="py-10 text-center">
            <p className="font-semibold">{error?.status === 404 ? "This article isn't available." : 'We could not load this article.'}</p>
            <p className="mt-1 text-sm text-ink-2">{error?.message}</p>
            <Link to={{ pathname: '/learn', search: location.search }} className="mt-4 inline-block font-semibold text-brand hover:underline">
              Back to all articles
            </Link>
          </div>
        )}
      </Reader>
    );
  }

  return (
    <Reader open onClose={close} title={article.title} meta={`${domainLabel(article.domain)} · ${article.readMinutes} min read · ${LEVELS[article.level] ?? article.level}`}>
      <p className="text-[1.125rem] leading-relaxed text-ink-2">{article.summary}</p>

      <section aria-labelledby="takeaways" className="my-6 rounded-xl bg-surface-2 p-5">
        <h3 id="takeaways" className="font-wide text-base font-semibold">
          Key takeaways
        </h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-relaxed">
          {article.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <ArticleBody blocks={article.body} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-2">Was this helpful?</span>
          <Reactions
            likes={article.likes}
            dislikes={article.dislikes}
            myReaction={article.myReaction}
            onChange={(value) => react.mutate({ kind: 'article', target: article.slug, value })}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => askCopilot(article.copilotPrompt)}>
          <Sparkles size={15} aria-hidden />
          Ask Copilot about this
        </Button>
      </div>

      <section aria-labelledby="sources" className="mt-6 text-sm">
        <h3 id="sources" className="font-semibold">
          Sources and further reading
        </h3>
        <ul className="mt-2 flex flex-col gap-1">
          {article.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                {s.label}
                <ExternalLink size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-ink-3">Reviewed {dateLong(article.updated)}. General education, not personal advice.</p>
      </section>

      <CommentThread kind="article" target={article.slug} />
    </Reader>
  );
}
