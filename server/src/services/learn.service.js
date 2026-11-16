import { ARTICLES, findArticle, summarise, readMinutes } from '../content/articles.js';
import { engagementFor, commentCountsFor } from './community.service.js';
import { ApiError } from '../utils/ApiError.js';

const withCounts = (article, engagement, comments) => ({
  ...article,
  likes: engagement.likes,
  dislikes: engagement.dislikes,
  myReaction: engagement.myReaction,
  commentCount: comments ?? 0,
});

export async function listArticles(viewerId, { domain } = {}) {
  const items = ARTICLES.filter((a) => !domain || a.domain === domain);
  const slugs = items.map((a) => a.slug);
  const [engagement, comments] = await Promise.all([engagementFor('article', slugs, viewerId), commentCountsFor('article', slugs)]);
  return items.map((a) => withCounts(summarise(a), engagement.get(a.slug), comments.get(a.slug)));
}

export async function getArticle(viewerId, slug) {
  const article = findArticle(slug);
  if (!article) throw ApiError.notFound('Article not found');
  const [engagement, comments] = await Promise.all([engagementFor('article', [slug], viewerId), commentCountsFor('article', [slug])]);
  return withCounts({ ...article, readMinutes: readMinutes(article) }, engagement.get(slug), comments.get(slug));
}
