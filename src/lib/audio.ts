import crypto from 'crypto';
import path from 'path';
import { Item } from '@prisma/client';

const DEFAULT_AUDIO_ROOT = process.env.AUDIO_STORAGE_PATH ?? '/data';
const DEFAULT_AUDIO_DIR = 'audio';
const DEFAULT_MAX_CHARS = 2000;

export type AudioFileInfo = {
  root: string;
  relativePath: string;
  absolutePath: string;
};

export function getAudioDirectory(): string {
  return path.join(DEFAULT_AUDIO_ROOT, DEFAULT_AUDIO_DIR);
}

export function getAudioFileInfo(itemId: string, extension = 'mp3'): AudioFileInfo {
  const ext = normalizeExtension(extension);
  const relativePath = path.posix.join(DEFAULT_AUDIO_DIR, `${itemId}.${ext}`);
  const absolutePath = path.join(DEFAULT_AUDIO_ROOT, relativePath);
  return { root: DEFAULT_AUDIO_ROOT, relativePath, absolutePath };
}

export function buildAudioText(item: Item): string {
  const title = cleanText(item.title);
  const summary = pickSummary(item);
  const combined = summary && summary !== title ? `${title}. ${summary}` : title;
  return truncateText(combined, getMaxChars());
}

export function hashAudioText(text: string, salt?: string): string {
  const value = salt ? `${salt}::${text}` : text;
  return crypto.createHash('sha256').update(value).digest('hex');
}

function pickSummary(item: Item): string | undefined {
  if (item.language === 'zh' && item.summaryZh) {
    return cleanText(item.summaryZh);
  }
  if (item.summary) return cleanText(item.summary);
  if (item.summaryZh) return cleanText(item.summaryZh);
  if (item.content) return cleanText(item.content);
  return undefined;
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}

function getMaxChars(): number {
  const raw = Number.parseInt(process.env.AUDIO_MAX_CHARS ?? '', 10);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_MAX_CHARS;
}

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().replace(/^\.+/, '');
  return trimmed.length > 0 ? trimmed : 'mp3';
}
