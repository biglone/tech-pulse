import type { PrismaClient } from '@prisma/client';

export type DefaultSource = {
  name: string;
  type: string;
  url?: string | null;
  handle?: string | null;
  tags?: string | null;
  requiresAuth?: boolean;
  weight?: number;
};

export const DEFAULT_SOURCES: DefaultSource[] = [
  {
    name: 'Hacker News',
    type: 'HN',
    tags: 'Startups,Engineering',
    weight: 1.4,
  },
  {
    name: 'Reddit /r/programming',
    type: 'REDDIT',
    handle: 'programming',
    tags: 'Community',
    weight: 1.1,
  },
  {
    name: 'TechCrunch',
    type: 'RSS',
    url: 'https://techcrunch.com/feed/',
    tags: 'Startups,VC',
    weight: 1.0,
  },
  {
    name: 'Linux Do (Develop)',
    type: 'RSS',
    url: 'https://linux.do/c/develop/4.rss',
    tags: 'Community,Engineering',
    weight: 0.9,
  },
  {
    name: 'V2EX Tech',
    type: 'RSS',
    url: 'https://www.v2ex.com/feed/tab/tech.xml',
    tags: 'Community,China',
    weight: 0.9,
  },
  {
    name: 'The Verge',
    type: 'RSS',
    url: 'https://www.theverge.com/rss/index.xml',
    tags: 'Gadgets,Product',
    weight: 0.9,
  },
  {
    name: 'Ars Technica',
    type: 'RSS',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    tags: 'Engineering,Science',
    weight: 1.0,
  },
  {
    name: 'Medium Tech',
    type: 'MEDIUM',
    url: 'https://medium.com/feed/tag/technology',
    tags: 'Opinion,Blogs',
    weight: 0.8,
  },
  {
    name: 'Substack: The Pragmatic Engineer',
    type: 'SUBSTACK',
    url: 'https://newsletter.pragmaticengineer.com/feed',
    tags: 'Engineering,Leadership',
    weight: 0.9,
  },
  {
    name: 'YouTube Tech',
    type: 'YOUTUBE',
    handle: 'software engineering',
    tags: 'Video',
    requiresAuth: true,
    weight: 0.8,
  },
  {
    name: 'X Tech',
    type: 'X',
    handle: 'tech news',
    tags: 'Social',
    requiresAuth: true,
    weight: 0.7,
  },
];

export async function ensureDefaultSources(prisma: PrismaClient) {
  const existingSources = await prisma.source.findMany({
    select: {
      type: true,
      url: true,
      handle: true,
      name: true,
    },
  });

  const normalize = (value: string) => value.trim().toLowerCase();
  const key = (kind: 'url' | 'handle' | 'name', type: string, value: string) =>
    `${kind}:${type}:${normalize(value)}`;

  const existingUrl = new Set(
    existingSources
      .filter((source) => source.url)
      .map((source) => key('url', source.type, source.url!)),
  );
  const existingHandle = new Set(
    existingSources
      .filter((source) => source.handle)
      .map((source) => key('handle', source.type, source.handle!)),
  );
  const existingName = new Set(
    existingSources.map((source) => key('name', source.type, source.name)),
  );

  const toCreate = DEFAULT_SOURCES.filter((source) => {
    if (source.url) {
      return !existingUrl.has(key('url', source.type, source.url));
    }
    if (source.handle) {
      return !existingHandle.has(key('handle', source.type, source.handle));
    }
    return !existingName.has(key('name', source.type, source.name));
  });

  if (toCreate.length > 0) {
    await prisma.source.createMany({
      data: toCreate,
    });
  }

  return { created: toCreate.length, total: existingSources.length + toCreate.length };
}
