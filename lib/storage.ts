// lib/storage.ts — Store/retrieve scan results via Vercel KV
import { kv } from '@vercel/kv';

export interface ScanResult {
  id: string;
  timestamp: string;
  model: string;
  summary: {
    bullish: number;
    neutral: number;
    bearish: number;
  };
  tokens: TokenAnalysis[];
}

export interface TokenAnalysis {
  rank: number;
  name: string;
  symbol: string;
  verdict: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  score: number;
  mcap: string;
  liquidity: string;
  volume24h: string;
  priceChange1h: string;
  priceChange6h: string;
  priceChange24h: string;
  risk: string;
  github: {
    stars: number;
    forks: number;
    description: string;
  };
  website: string;
  twitter: string;
  pros: string[];
  cons: string[];
  analysis: string;
  teamScore: number;
  productScore: number;
  communityScore: number;
}

const RESULTS_KEY = 'bankr:latest_results';
const HISTORY_KEY = 'bankr:scan_history';
const MAX_HISTORY = 72; // 12 hours at 10-min intervals

export async function saveResults(result: ScanResult): Promise<void> {
  await kv.set(RESULTS_KEY, JSON.stringify(result));
  
  // Add to history list
  const history = await kv.lrange(HISTORY_KEY, 0, -1);
  await kv.lpush(HISTORY_KEY, JSON.stringify(result));
  
  // Trim history to max entries
  if (history.length >= MAX_HISTORY) {
    await kv.ltrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
  }
}

export async function getLatestResults(): Promise<ScanResult | null> {
  const data = await kv.get<string>(RESULTS_KEY);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function getHistory(): Promise<ScanResult[]> {
  const data = await kv.lrange(HISTORY_KEY, 0, -1);
  return data.map(item => typeof item === 'string' ? JSON.parse(item) : item);
}
