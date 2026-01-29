import crypto from 'crypto';
import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';
import { summarizeAndTranslate } from '@/lib/ai';
import { fetchJsonWithProxy, fetchTextWithProxy } from '@/lib/proxy';
import { Source } from '@prisma/client';

type IngestItem = {
  title: string;
  url: string;
  canonicalUrl?: string;
  summary?: string;
  content?: string;
  publishedAt?: Date;
  tags?: string[];
  language?: string;
  engagement?: number;
  comments?: number;
};

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: ['content:encoded', 'media:content'],
  },
});

const TAG_RULES: Array<{ tag: string; keywords: RegExp }> = [
  { tag: 'AI', keywords: /\b(ai|ml|machine learning|llm|transformer|prompt|openai|anthropic)\b/i },
  { tag: 'Web', keywords: /\b(react|vue|svelte|next\.js|frontend|css|web)\b/i },
  { tag: 'DevOps', keywords: /\b(kubernetes|docker|ci\/cd|devops|terraform|cloud)\b/i },
  { tag: 'Security', keywords: /\b(security|vulnerability|cve|zero[- ]day|malware)\b/i },
  { tag: 'Data', keywords: /\b(data|analytics|warehouse|spark|dbt)\b/i },
  { tag: 'Mobile', keywords: /\b(android|ios|swift|kotlin|flutter|react native)\b/i },
  { tag: 'Backend', keywords: /\b(node\.js|golang|rust|python|java|api|backend)\b/i },
];

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
]);

export async function ingestAllSources(): Promise<{ sources: number; items: number }>{
  const sources = await prisma.source.findMany({ where: { active: true } });
  let itemCount = 0;

  for (const source of sources) {
    try {
      itemCount += await ingestSource(source);
    } catch (error) {
      console.error(`Ingest failed for ${source.name}`, error);
    }
  }

  return { sources: sources.length, items: itemCount };
}

export async function ingestSource(source: Source): Promise<number> {
  if (!source.active) return 0;
  if (source.requiresAuth && !hasRequiredKeys(source.type)) {
    return 0;
  }

  const items = await fetchSourceItems(source);
  let created = 0;

  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.canonicalUrl ?? item.url);
    if (!normalizedUrl) continue;

    const urlHash = hashString(normalizedUrl);
    const summary = pickSummary(item.summary, item.content);
    const content = item.content ? cleanText(item.content) : undefined;
    const tags = mergeTags(source.tags, item.tags, item.title, summary);
    const language = item.language ?? detectLanguage(`${item.title} ${summary ?? ''}`);
    const score = computeScore({
      sourceWeight: source.weight,
      publishedAt: item.publishedAt,
      engagement: item.engagement,
    });
    const aiSummary = await summarizeAndTranslate({
      title: item.title,
      content,
      fallbackSummary: summary,
    });
    const finalSummary = aiSummary.summary ?? summary;
    const summaryZh = aiSummary.summaryZh ?? (language === 'zh' ? finalSummary : undefined);

    await prisma.item.upsert({
      where: { urlHash },
      update: {
        title: item.title,
        url: item.url,
        canonicalUrl: normalizedUrl,
        summary: finalSummary,
        summaryZh,
        content,
        publishedAt: item.publishedAt,
        tags,
        language,
        score,
        engagement: item.engagement,
        comments: item.comments,
      },
      create: {
        sourceId: source.id,
        title: item.title,
        url: item.url,
        canonicalUrl: normalizedUrl,
        urlHash,
        summary: finalSummary,
        summaryZh,
        content,
        publishedAt: item.publishedAt,
        tags,
        language,
        score,
        engagement: item.engagement,
        comments: item.comments,
      },
    });

    created += 1;
  }

  await prisma.source.update({
    where: { id: source.id },
    data: { lastFetchedAt: new Date() },
  });

  return created;
}

async function fetchSourceItems(source: Source): Promise<IngestItem[]> {
  switch (source.type) {
    case 'RSS':
    case 'MEDIUM':
    case 'SUBSTACK':
      return fetchRssItems(source.url);
    case 'HN':
      return fetchHackerNewsItems();
    case 'REDDIT':
      return fetchRedditItems(source.handle ?? 'programming');
    case 'X':
      return fetchXItems(source.handle ?? 'technology');
    case 'YOUTUBE':
      return fetchYouTubeItems(source.handle ?? 'technology');
    default:
      return [];
  }
}

async function fetchRssItems(url?: string | null): Promise<IngestItem[]> {
  if (!url) return [];
  const xml = await fetchTextWithProxy(
    url,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (TechPulse RSS)',
        Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    },
    15000
  );
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => {
    const encoded = (item as unknown as Record<string, unknown>)['content:encoded'];
    const rawContent = typeof encoded === 'string' ? encoded : item.content ?? item.summary;
    return {
      title: item.title ?? 'Untitled',
      url: item.link ?? item.guid ?? url,
      canonicalUrl: item.link,
      summary: item.contentSnippet ?? item.summary,
      content: rawContent,
      publishedAt: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : undefined,
      tags: item.categories ?? undefined,
    };
  });
}

async function fetchHackerNewsItems(): Promise<IngestItem[]> {
  const data = await fetchJsonWithProxy<{
    hits: Array<{
      title: string;
      url: string;
      created_at: string;
      objectID: string;
      points: number;
      num_comments: number;
    }>;
  }>('https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=50');

  return data.hits.map((hit) => ({
    title: hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    canonicalUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    summary: 'Hacker News discussion',
    publishedAt: hit.created_at ? new Date(hit.created_at) : undefined,
    engagement: hit.points,
    comments: hit.num_comments,
    tags: ['HN'],
  }));
}

async function fetchRedditItems(subreddit: string): Promise<IngestItem[]> {
  const data = await fetchJsonWithProxy<{
    data: {
      children: Array<{ data: Record<string, unknown> }>;
    };
  }>(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=50`, {
    headers: {
      'User-Agent': 'TechPulse/0.1 (+https://tech-pulse.biglone.tech)',
    },
  });

  return data.data.children
    .map((child) => child.data)
    .filter((item) => typeof item.title === 'string' && typeof item.url === 'string')
    .map((item) => ({
      title: item.title as string,
      url: item.url as string,
      canonicalUrl: item.url as string,
      summary: typeof item.selftext === 'string' && item.selftext.length > 0 ? item.selftext : 'Reddit post',
      publishedAt:
        typeof item.created_utc === 'number' ? new Date(item.created_utc * 1000) : undefined,
      engagement: typeof item.score === 'number' ? item.score : undefined,
      comments: typeof item.num_comments === 'number' ? item.num_comments : undefined,
      tags: ['Reddit', subreddit],
    }));
}

async function fetchXItems(query: string): Promise<IngestItem[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return [];

  const data = await fetchJsonWithProxy<{
    data?: Array<{
      id: string;
      text: string;
      created_at?: string;
      public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
    }>;
  }>(
    `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&tweet.fields=created_at,public_metrics`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).catch(() => ({ data: [] }));

  return (data.data ?? []).map((tweet) => ({
    title: tweet.text.split('\n')[0].slice(0, 120),
    url: `https://x.com/i/web/status/${tweet.id}`,
    canonicalUrl: `https://x.com/i/web/status/${tweet.id}`,
    summary: tweet.text,
    publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
    engagement:
      (tweet.public_metrics?.like_count ?? 0) +
      (tweet.public_metrics?.retweet_count ?? 0) +
      (tweet.public_metrics?.reply_count ?? 0),
    tags: ['X'],
  }));
}

async function fetchYouTubeItems(query: string): Promise<IngestItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const data = await fetchJsonWithProxy<{
    items: Array<{
      id: { videoId: string };
      snippet: { title: string; description: string; publishedAt: string };
    }>;
  }>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
  ).catch(() => ({ items: [] }));

  return data.items.map((item) => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    canonicalUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    summary: item.snippet.description,
    publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
    tags: ['YouTube'],
  }));
}

function hasRequiredKeys(type: string): boolean {
  if (type === 'X') {
    return Boolean(process.env.X_BEARER_TOKEN);
  }
  if (type === 'YOUTUBE') {
    return Boolean(process.env.YOUTUBE_API_KEY);
  }
  return true;
}

function normalizeUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function pickSummary(summary?: string, content?: string): string | undefined {
  const base = summary ?? content;
  if (!base) return undefined;
  const text = cleanText(base);
  if (text.length <= 260) return text;
  return `${text.slice(0, 257)}...`;
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(text: string): string | undefined {
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[A-Za-z]/.test(text)) return 'en';
  return undefined;
}

function mergeTags(sourceTags?: string | null, itemTags?: string[], title?: string, summary?: string): string | undefined {
  const tagSet = new Set<string>();
  for (const tag of parseTags(sourceTags)) tagSet.add(tag);
  if (itemTags) {
    itemTags.filter(Boolean).forEach((tag) => tagSet.add(tag));
  }
  const text = `${title ?? ''} ${summary ?? ''}`.trim();
  if (text.length > 0) {
    for (const rule of TAG_RULES) {
      if (rule.keywords.test(text)) tagSet.add(rule.tag);
    }
  }
  if (tagSet.size === 0) return undefined;
  return Array.from(tagSet).join(',');
}

function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function computeScore({
  sourceWeight,
  publishedAt,
  engagement,
}: {
  sourceWeight: number;
  publishedAt?: Date;
  engagement?: number;
}): number {
  const now = Date.now();
  const ageHours = publishedAt ? Math.max(0, (now - publishedAt.getTime()) / 3600000) : 24;
  const freshness = Math.max(0, 72 - ageHours);
  const engagementBoost = engagement ? Math.log10(engagement + 1) * 8 : 0;
  return sourceWeight * 10 + freshness + engagementBoost;
}
