import { ProxyAgent, type Dispatcher } from 'undici';

type FetchInit = RequestInit & { dispatcher?: Dispatcher };

let proxyDispatcher: Dispatcher | null | undefined;

function resolveProxyUrl(): string | undefined {
  const httpsProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY ?? process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY ?? process.env.all_proxy;
  return httpsProxy || httpProxy || allProxy || undefined;
}

function shouldBypassProxy(hostname: string): boolean {
  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy;
  if (!noProxy) return false;
  const rules = noProxy
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (rules.includes('*')) return true;

  return rules.some((rule) => {
    if (rule.startsWith('.')) {
      return hostname.endsWith(rule);
    }
    if (hostname === rule) return true;
    return hostname.endsWith(`.${rule}`);
  });
}

function resolveHostname(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') {
    if (!/^https?:/i.test(input)) return null;
    return new URL(input).hostname;
  }
  if (input instanceof URL) return input.hostname;
  if (typeof input.url === 'string') {
    if (!/^https?:/i.test(input.url)) return null;
    return new URL(input.url).hostname;
  }
  return null;
}

function getProxyDispatcher(): Dispatcher | undefined {
  if (proxyDispatcher !== undefined) {
    return proxyDispatcher ?? undefined;
  }

  const proxyUrl = resolveProxyUrl();
  if (!proxyUrl) {
    proxyDispatcher = null;
    return undefined;
  }

  proxyDispatcher = new ProxyAgent(proxyUrl);
  return proxyDispatcher;
}

export async function fetchWithProxy(
  input: RequestInfo | URL,
  init: FetchInit = {}
) {
  const hostname = resolveHostname(input);
  if (hostname && shouldBypassProxy(hostname)) {
    return fetch(input, init);
  }
  const dispatcher = getProxyDispatcher();
  if (!dispatcher) {
    return fetch(input, init);
  }
  return fetch(input, { ...init, dispatcher });
}

export async function fetchTextWithProxy(
  input: RequestInfo | URL,
  init: FetchInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithProxy(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithProxy<T>(
  input: RequestInfo | URL,
  init: FetchInit = {},
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithProxy(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
