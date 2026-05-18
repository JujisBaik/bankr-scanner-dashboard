// lib/storage.ts — In-memory storage with file fallback
// For production, switch to @upstash/redis

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

// In-memory store (persists across requests in same function instance)
let latestResults: ScanResult | null = null;
let scanHistory: ScanResult[] = [];

const MAX_HISTORY = 72; // 12 hours at 10-min intervals

export async function saveResults(result: ScanResult): Promise<void> {
  latestResults = result;
  scanHistory.unshift(result);
  if (scanHistory.length > MAX_HISTORY) {
    scanHistory = scanHistory.slice(0, MAX_HISTORY);
  }
}

export async function getLatestResults(): Promise<ScanResult | null> {
  return latestResults;
}

export async function getHistory(): Promise<ScanResult[]> {
  return scanHistory;
}
