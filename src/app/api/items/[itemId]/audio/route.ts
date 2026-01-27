import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { Item } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { buildAudioText, getAudioDirectory, getAudioFileInfo, hashAudioText } from '@/lib/audio';

export const runtime = 'nodejs';

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_AUDIO_MIME = 'audio/mpeg';
const DEFAULT_COQUI_MIME = 'audio/wav';
const DEFAULT_TTS_BASE_URL = 'http://tts:5002';
const DEFAULT_TTS_TIMEOUT_MS = 120000;

export async function GET(
  _request: Request,
  { params }: { params: { itemId: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = params.itemId;
  if (!itemId) {
    return NextResponse.json({ error: 'Missing item id.' }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  const audioText = buildAudioText(item);
  if (!audioText) {
    return NextResponse.json({ error: 'No audio content available.' }, { status: 400 });
  }

  const provider = resolveProvider(process.env.AUDIO_PROVIDER);
  const providerExtension = getProviderExtension(provider);
  const { cacheSalt, coquiLanguage, coquiSpeakerId, coquiSpeakerWav, openaiModel, openaiVoice } =
    resolveProviderCacheSalt(provider, item);
  const audioHash = hashAudioText(audioText, cacheSalt);
  const audioInfo = getAudioFileInfo(item.id, providerExtension);
  const storedPath = item.audioPath ?? audioInfo.relativePath;
  const storedFilePath = resolveAudioPath(audioInfo.root, storedPath);

  if (item.audioTextHash === audioHash && (await fileExists(storedFilePath))) {
    const file = await fs.readFile(storedFilePath);
    return new Response(file, {
      headers: {
        'Content-Type': item.audioMime ?? DEFAULT_AUDIO_MIME,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  }

  const enabled = process.env.ENABLE_AI_AUDIO === 'true';
  if (!enabled) {
    return NextResponse.json({ error: 'Audio generation is disabled.' }, { status: 403 });
  }

  let generated: AudioGenerationResult;
  try {
    generated = await generateAudio({
      provider,
      text: audioText,
      coquiLanguage,
      coquiSpeakerId,
      coquiSpeakerWav,
      openaiModel,
      openaiVoice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audio generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const contentType = generated.contentType ?? DEFAULT_AUDIO_MIME;
  const audioBuffer = generated.buffer;
  const resolvedExtension = resolveExtensionFromContentType(contentType, providerExtension);
  const targetInfo =
    resolvedExtension === providerExtension ? audioInfo : getAudioFileInfo(item.id, resolvedExtension);

  await fs.mkdir(getAudioDirectory(), { recursive: true });
  await fs.writeFile(targetInfo.absolutePath, audioBuffer);

  await prisma.item.update({
    where: { id: item.id },
    data: {
      audioPath: targetInfo.relativePath,
      audioMime: contentType,
      audioTextHash: audioHash,
      audioUpdatedAt: new Date(),
    },
  });

  return new Response(audioBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}

type ProviderType = 'openai' | 'coqui';

type AudioGenerationInput = {
  provider: ProviderType;
  text: string;
  coquiLanguage?: string;
  coquiSpeakerId?: string;
  coquiSpeakerWav?: string;
  openaiModel?: string;
  openaiVoice?: string;
};

type AudioGenerationResult = {
  buffer: Buffer;
  contentType: string;
};

async function generateAudio(input: AudioGenerationInput): Promise<AudioGenerationResult> {
  if (input.provider === 'coqui') {
    return generateWithCoqui(input);
  }
  return generateWithOpenAI(input);
}

async function generateWithOpenAI({
  text,
  openaiModel,
  openaiVoice,
}: AudioGenerationInput): Promise<AudioGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const model = openaiModel ?? 'gpt-4o-mini-tts';
  const voice = openaiVoice ?? 'alloy';

  const response = await fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI audio generation failed. ${detail.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') ?? DEFAULT_AUDIO_MIME;
  return {
    contentType,
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

async function generateWithCoqui({
  text,
  coquiLanguage,
  coquiSpeakerId,
  coquiSpeakerWav,
}: AudioGenerationInput): Promise<AudioGenerationResult> {
  const baseUrl = process.env.TTS_BASE_URL ?? DEFAULT_TTS_BASE_URL;
  const url = new URL('/api/tts', baseUrl);
  const timeoutMs = resolveTimeoutMs(process.env.TTS_REQUEST_TIMEOUT_MS);

  const payload: Record<string, string> = { text };
  if (coquiLanguage) payload.language = coquiLanguage;
  if (coquiSpeakerWav) payload.speaker_wav = coquiSpeakerWav;
  if (coquiSpeakerId) payload.speaker_id = coquiSpeakerId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Coqui TTS failed. ${detail.slice(0, 200)}`);
    }

    const contentType = response.headers.get('content-type') ?? DEFAULT_COQUI_MIME;
    return {
      contentType,
      buffer: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProvider(rawProvider?: string): ProviderType {
  const normalized = (rawProvider ?? '').toLowerCase();
  if (normalized === 'openai') return 'openai';
  if (normalized === 'coqui' || normalized === 'xtts' || normalized === 'local') return 'coqui';
  if (process.env.TTS_BASE_URL) return 'coqui';
  return 'openai';
}

function getProviderExtension(provider: ProviderType): string {
  if (provider === 'coqui') return 'wav';
  return 'mp3';
}

function resolveProviderCacheSalt(provider: ProviderType, item: Item) {
  if (provider === 'openai') {
    const model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
    const voice = process.env.OPENAI_TTS_VOICE ?? 'alloy';
    return {
      cacheSalt: `openai:${model}:${voice}`,
      openaiModel: model,
      openaiVoice: voice,
    };
  }

  const language = resolveLanguage(item.language);
  const isChinese = language.toLowerCase().startsWith('zh');
  const speakerWav = isChinese
    ? process.env.TTS_SPEAKER_WAV_ZH
    : process.env.TTS_SPEAKER_WAV_EN;
  const speakerId = isChinese ? process.env.TTS_SPEAKER_ID_ZH : process.env.TTS_SPEAKER_ID_EN;
  const modelName = process.env.TTS_MODEL_NAME ?? 'xtts_v2';
  const voiceKey = speakerWav ?? speakerId ?? 'default';

  return {
    cacheSalt: `coqui:${modelName}:${language}:${voiceKey}`,
    coquiLanguage: language,
    coquiSpeakerId: speakerId,
    coquiSpeakerWav: speakerWav,
  };
}

function resolveLanguage(rawLanguage?: string | null): string {
  if (!rawLanguage) {
    return process.env.TTS_LANGUAGE_DEFAULT ?? 'en';
  }
  const normalized = rawLanguage.toLowerCase();
  if (normalized.startsWith('zh')) {
    return process.env.TTS_LANGUAGE_ZH ?? 'zh';
  }
  if (normalized.startsWith('en')) {
    return process.env.TTS_LANGUAGE_EN ?? 'en';
  }
  return normalized;
}

function resolveExtensionFromContentType(contentType: string, fallback: string): string {
  const lower = contentType.toLowerCase();
  if (lower.includes('mpeg')) return 'mp3';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('ogg')) return 'ogg';
  return fallback;
}

function resolveTimeoutMs(value?: string): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TTS_TIMEOUT_MS;
}

function resolveAudioPath(root: string, audioPath: string): string {
  if (path.isAbsolute(audioPath)) {
    return audioPath;
  }
  return path.join(root, audioPath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
