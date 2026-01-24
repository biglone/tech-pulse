export const SOURCE_TYPES = [
  'RSS',
  'HN',
  'REDDIT',
  'X',
  'YOUTUBE',
  'MEDIUM',
  'SUBSTACK',
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
