import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BANKR_LAUNCHES_URL = 'https://api.bankr.bot/token-launches';
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/tokens/v1/base';
const CACHE_MS = 120_000;

type AnyRecord = Record<string, any>;

interface CachedResponse {
  expiresAt: number;
  payload: AnyRecord;
}

let cache: CachedResponse | null = null;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeAddress(address?: string) {
  return (address || '').trim().toLowerCase();
}

function normalizeUrl(url?: string) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return `https://x.com/${trimmed.slice(1)}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(x|twitter)\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

function pickBestPair(pairs: AnyRecord[]) {
  return pairs
    .filter(Boolean)
    .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
}

function extractSocials(pair?: AnyRecord) {
  const socials: Record<string, string> = {};

  const websites = Array.isArray(pair?.info?.websites) ? pair.info.websites : [];
  const primaryWebsite = websites.find((site: AnyRecord) => site?.url)?.url;
  if (primaryWebsite) socials.website = normalizeUrl(primaryWebsite);

  const rawSocials = Array.isArray(pair?.info?.socials) ? pair.info.socials : [];
  for (const social of rawSocials) {
    const type = String(social?.type || '').toLowerCase();
    const url = normalizeUrl(social?.url);
    if (!url) continue;

    if (type === 'twitter' || type === 'x') {
      socials.twitter = url;
      socials.x = url;
    } else if (type === 'telegram') {
      socials.telegram = url;
    } else if (type === 'discord') {
      socials.discord = url;
    } else if (type === 'farcaster' || type === 'warpcast') {
      socials.farcaster = url;
    } else if (type === 'github') {
      socials.github = url;
    }
  }

  if (pair?.url) socials.dexScreener = pair.url;
  return socials;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.payload);
  }

  try {
    const bankr = await fetchJson(BANKR_LAUNCHES_URL);
    const launches = Array.isArray(bankr?.launches) ? bankr.launches : [];
    const addresses = launches
      .map((launch: AnyRecord) => normalizeAddress(launch.tokenAddress))
      .filter(Boolean);

    const pairGroups = await Promise.all(
      chunk(addresses, 30).map(async addressChunk => {
        if (addressChunk.length === 0) return [];
        return fetchJson(`${DEXSCREENER_BASE_URL}/${addressChunk.join(',')}`);
      })
    );

    const pairsByToken = new Map<string, AnyRecord[]>();
    pairGroups.flat().forEach((pair: AnyRecord) => {
      const baseAddress = normalizeAddress(pair?.baseToken?.address);
      if (!baseAddress) return;
      const existing = pairsByToken.get(baseAddress) || [];
      existing.push(pair);
      pairsByToken.set(baseAddress, existing);
    });

    const enrichedLaunches = launches.map((launch: AnyRecord) => {
      const tokenAddress = normalizeAddress(launch.tokenAddress);
      const pair = pickBestPair(pairsByToken.get(tokenAddress) || []);
      const socials = extractSocials(pair);

      return {
        activityId: launch.activityId,
        status: launch.status,
        tokenName: launch.tokenName,
        tokenSymbol: launch.tokenSymbol,
        tokenAddress: launch.tokenAddress,
        chain: launch.chain || 'base',
        timestamp: launch.timestamp,
        dexUrl: pair?.url,
        bankrUrl: `https://bankr.bot/launches`,
        pairAddress: pair?.pairAddress,
        marketCap: pair?.marketCap ?? null,
        fdv: pair?.fdv ?? null,
        liquidityUsd: pair?.liquidity?.usd ?? null,
        volume24h: pair?.volume?.h24 ?? null,
        priceChange1h: pair?.priceChange?.h1 ?? null,
        priceChange6h: pair?.priceChange?.h6 ?? null,
        priceChange24h: pair?.priceChange?.h24 ?? null,
        socials: {
          ...socials,
          dexScreener: pair?.url || socials.dexScreener,
          bankr: `https://bankr.bot/launches`,
        },
      };
    });

    const payload = {
      updatedAt: new Date().toISOString(),
      count: enrichedLaunches.length,
      launches: enrichedLaunches,
    };

    cache = { expiresAt: Date.now() + CACHE_MS, payload };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to enrich launches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
