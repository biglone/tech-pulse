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
  const existing = await prisma.source.count();
  if (existing > 0) {
    return { created: 0, total: existing };
  }

  await prisma.source.createMany({
    data: DEFAULT_SOURCES,
  });

  return { created: DEFAULT_SOURCES.length, total: DEFAULT_SOURCES.length };
}
