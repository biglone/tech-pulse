type SummaryResult = {
  summary?: string;
  summaryZh?: string;
};

type SummaryInput = {
  title: string;
  content?: string;
  fallbackSummary?: string;
};

export async function summarizeAndTranslate({
  title,
  content,
  fallbackSummary,
}: SummaryInput): Promise<SummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const enabled = process.env.ENABLE_AI_SUMMARY === 'true';

  if (!apiKey || !enabled) {
    return { summary: fallbackSummary };
  }

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Summarize the input in 2 sentences. Provide a Chinese translation. Return JSON with keys summary and summaryZh.',
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent: ${content ?? ''}`,
      },
    ],
    temperature: 0.3,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { summary: fallbackSummary };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const contentText = data.choices?.[0]?.message?.content ?? '';
  const parsed = safeJson(contentText);

  return {
    summary: parsed?.summary ?? fallbackSummary,
    summaryZh: parsed?.summaryZh,
  };
}

function safeJson(value: string): { summary?: string; summaryZh?: string } | null {
  try {
    return JSON.parse(value) as { summary?: string; summaryZh?: string };
  } catch {
    return null;
  }
}
