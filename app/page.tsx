'use client';

import { useEffect, useMemo, useState } from 'react';

type Verdict = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
type FilterKey = 'ALL' | 'HOT' | 'WATCH' | 'RADAR' | 'IGNORE';

interface SocialMap {
  website?: string;
  twitter?: string;
  x?: string;
  telegram?: string;
  discord?: string;
  farcaster?: string;
  github?: string;
  dexScreener?: string;
  bankr?: string;
}

interface Token {
  rank: number;
  name: string;
  symbol: string;
  verdict: Verdict;
  score: number;
  alphaScore?: number;
  decision?: FilterKey;
  mcap: string;
  liquidity: string;
  volume5m?: string;
  volume1h?: string;
  volume24h: string;
  priceChange5m?: string;
  priceChange1h: string;
  priceChange6h: string;
  priceChange24h: string;
  txns24h?: number;
  ageHours?: number | null;
  risk: string;
  github: { stars: number | null; forks: number | null; description: string; url?: string };
  website?: string;
  twitter?: string;
  socials?: SocialMap;
  tokenAddress?: string;
  contractAddress?: string;
  address?: string;
  chain?: string;
  dexUrl?: string;
  bankrUrl?: string;
  pros: string[];
  cons: string[];
  analysis: string;
  teamScore: number;
  productScore: number;
  communityScore: number;
}

interface ScanData {
  id: string;
  timestamp: string;
  generatedAt?: string;
  model: string;
  scanner?: {
    mode?: string;
    trackedTotal?: number;
    bankrFetched?: number;
    dexEnriched?: number;
  };
  summary: {
    bullish: number;
    neutral: number;
    bearish: number;
    hot?: number;
    watch?: number;
    radar?: number;
    ignore?: number;
    scanned?: number;
    displayed?: number;
  };
  tokens: Token[];
}

interface EnrichedLaunch {
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  dexUrl?: string;
  bankrUrl?: string;
  marketCap?: number | null;
  fdv?: number | null;
  liquidityUsd?: number | null;
  volume24h?: number | null;
  priceChange1h?: number | null;
  priceChange6h?: number | null;
  priceChange24h?: number | null;
  socials: SocialMap;
}

interface EnrichmentData {
  updatedAt: string;
  launches: EnrichedLaunch[];
}

const colors = {
  bg: '#020617',
  panel: '#0f172a',
  panel2: '#111827',
  border: '#1f2937',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  hot: '#22c55e',
  watch: '#38bdf8',
  radar: '#f59e0b',
  danger: '#ef4444',
};

const decisionColor = (decision?: string) => {
  if (decision === 'HOT') return colors.hot;
  if (decision === 'WATCH') return colors.watch;
  if (decision === 'RADAR') return colors.radar;
  if (decision === 'IGNORE') return colors.dim;
  return colors.muted;
};

const verdictToDecision = (token: Token): FilterKey => {
  if (token.decision) return token.decision;
  if (token.verdict === 'BULLISH') return 'HOT';
  if (token.verdict === 'NEUTRAL') return 'WATCH';
  return 'IGNORE';
};

const cleanKey = (value?: string) => (value || '').trim().toLowerCase();

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return `https://x.com/${trimmed.slice(1)}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(x|twitter)\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
};

const compactMoney = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatChange = (value?: number | null, fallback?: string) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  return fallback || 'N/A';
};

const changeTone = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return colors.muted;
  return parsed >= 0 ? colors.hot : colors.danger;
};

const shortAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ageLabel = (hours?: number | null) => {
  if (typeof hours !== 'number') return '';
  if (hours < 1) return `${Math.round(hours * 60)}m old`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h old`;
  return `${Math.round(hours / 24)}d old`;
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const color = score >= 7 ? colors.hot : score >= 5 ? colors.radar : colors.danger;

  return (
    <div style={{ background: '#182033', borderRadius: 4, height: 6, marginTop: 6, width: '100%' }}>
      <div style={{ background: color, borderRadius: 4, height: 6, width: `${pct}%` }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ minWidth: 88 }}>
      <div style={{ color: colors.dim, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: tone || '#e2e8f0', fontSize: 14, fontWeight: 800, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function mergeSocials(token: Token, enriched?: EnrichedLaunch): SocialMap {
  const twitter = token.twitter || token.socials?.twitter || token.socials?.x || enriched?.socials?.twitter || enriched?.socials?.x;

  return {
    website: token.website || token.socials?.website || enriched?.socials?.website,
    twitter,
    x: twitter,
    telegram: token.socials?.telegram || enriched?.socials?.telegram,
    discord: token.socials?.discord || enriched?.socials?.discord,
    farcaster: token.socials?.farcaster || enriched?.socials?.farcaster,
    github: token.github?.url || token.socials?.github || enriched?.socials?.github,
    dexScreener: token.dexUrl || token.socials?.dexScreener || enriched?.dexUrl || enriched?.socials?.dexScreener,
    bankr: token.bankrUrl || token.socials?.bankr || enriched?.bankrUrl || enriched?.socials?.bankr,
  };
}

function SocialLinks({ socials }: { socials: SocialMap }) {
  const links = [
    { key: 'x', label: 'X', url: socials.x || socials.twitter },
    { key: 'website', label: 'Web', url: socials.website },
    { key: 'telegram', label: 'TG', url: socials.telegram },
    { key: 'discord', label: 'Discord', url: socials.discord },
    { key: 'farcaster', label: 'FC', url: socials.farcaster },
    { key: 'github', label: 'GitHub', url: socials.github },
    { key: 'dexScreener', label: 'DEX', url: socials.dexScreener },
    { key: 'bankr', label: 'Bankr', url: socials.bankr },
  ].filter(link => normalizeUrl(link.url));

  if (links.length === 0) {
    return <span style={{ color: colors.dim, fontSize: 12 }}>No social links yet</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {links.map(link => (
        <a
          key={link.key}
          href={normalizeUrl(link.url)}
          target="_blank"
          rel="noreferrer"
          onClick={event => event.stopPropagation()}
          style={{
            border: '1px solid #263244',
            borderRadius: 6,
            color: '#cbd5e1',
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1,
            padding: '7px 9px',
            textDecoration: 'none',
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ScanData | null>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [copiedAddress, setCopiedAddress] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const [resultsResponse, enrichmentResponse] = await Promise.allSettled([
        fetch('/api/results', { cache: 'no-store' }),
        fetch('/api/enrichment', { cache: 'no-store' }),
      ]);

      if (!mounted) return;

      if (resultsResponse.status === 'fulfilled' && resultsResponse.value.ok) {
        setData(await resultsResponse.value.json());
        setError('');
      } else {
        const status = resultsResponse.status === 'fulfilled' ? resultsResponse.value.status : 'network';
        setError(`No scan data yet (${status})`);
      }

      if (enrichmentResponse.status === 'fulfilled' && enrichmentResponse.value.ok) {
        setEnrichment(await enrichmentResponse.value.json());
      }

      setLoading(false);
    }

    loadDashboard();
    const timer = window.setInterval(loadDashboard, 60000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const enrichmentBySymbol = useMemo(() => {
    const map = new Map<string, EnrichedLaunch>();
    enrichment?.launches.forEach(launch => {
      map.set(cleanKey(launch.tokenSymbol), launch);
      map.set(cleanKey(launch.tokenName), launch);
      map.set(cleanKey(launch.tokenAddress), launch);
    });
    return map;
  }, [enrichment]);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const findEnrichment = (token: Token) => {
    return (
      enrichmentBySymbol.get(cleanKey(token.tokenAddress)) ||
      enrichmentBySymbol.get(cleanKey(token.contractAddress)) ||
      enrichmentBySymbol.get(cleanKey(token.address)) ||
      enrichmentBySymbol.get(cleanKey(token.symbol)) ||
      enrichmentBySymbol.get(cleanKey(token.name))
    );
  };

  const filteredTokens = useMemo(() => {
    if (!data) return [];
    if (activeFilter === 'ALL') return data.tokens;
    return data.tokens.filter(token => verdictToDecision(token) === activeFilter);
  }, [activeFilter, data]);

  const filterCounts: Record<FilterKey, number> = {
    ALL: data?.tokens.length || 0,
    HOT: data?.summary.hot ?? data?.tokens.filter(token => verdictToDecision(token) === 'HOT').length ?? 0,
    WATCH: data?.summary.watch ?? data?.tokens.filter(token => verdictToDecision(token) === 'WATCH').length ?? 0,
    RADAR: data?.summary.radar ?? data?.tokens.filter(token => verdictToDecision(token) === 'RADAR').length ?? 0,
    IGNORE: data?.summary.ignore ?? data?.tokens.filter(token => verdictToDecision(token) === 'IGNORE').length ?? 0,
  };

  const socialCoverage = data
    ? data.tokens.filter(token => Object.values(mergeSocials(token, findEnrichment(token))).some(Boolean)).length
    : 0;

  const copyAddress = async (address: string) => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    window.setTimeout(() => setCopiedAddress(''), 1200);
  };

  return (
    <main style={{ margin: '0 auto', maxWidth: 1180, padding: '24px 16px 36px' }}>
      <header style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: colors.watch, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Bankr alpha monitor</div>
          <h1 style={{ color: colors.text, fontSize: 30, fontWeight: 900, margin: '6px 0 0' }}>Scanner dashboard</h1>
          <p style={{ color: colors.muted, fontSize: 14, margin: '6px 0 0' }}>
            Broad Bankr crawl, alpha scoring, social context, and DexScreener signals.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, minWidth: 112, padding: '9px 11px' }}>
            <div style={{ color: colors.dim, fontSize: 11, fontWeight: 800 }}>MODEL</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 800 }}>{data?.model || 'mimo-v2-pro'}</div>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, minWidth: 112, padding: '9px 11px' }}>
            <div style={{ color: colors.dim, fontSize: 11, fontWeight: 800 }}>MODE</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 800 }}>{data?.scanner?.mode || 'live scan'}</div>
          </div>
        </div>
      </header>

      {loading && (
        <section style={{ border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted, padding: 40, textAlign: 'center' }}>
          Loading latest scan...
        </section>
      )}

      {!loading && error && !data && (
        <section style={{ border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted, padding: 40, textAlign: 'center' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 900, marginBottom: 6 }}>Waiting for scanner data</div>
          <div>{error}</div>
        </section>
      )}

      {data && (
        <>
          <section style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 18 }}>
            <Stat label="Hot" value={String(data.summary.hot ?? data.summary.bullish)} tone={colors.hot} />
            <Stat label="Watch" value={String(data.summary.watch ?? data.summary.neutral)} tone={colors.watch} />
            <Stat label="Radar" value={String(data.summary.radar ?? 0)} tone={colors.radar} />
            <Stat label="Scanned" value={String(data.summary.scanned ?? data.scanner?.bankrFetched ?? data.tokens.length)} />
            <Stat label="Tracked" value={String(data.scanner?.trackedTotal ?? data.summary.scanned ?? data.tokens.length)} />
            <Stat label="Socials" value={`${socialCoverage}/${data.tokens.length}`} tone={colors.watch} />
            <Stat label="Last scan" value={timeAgo(data.timestamp)} />
          </section>

          <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(['ALL', 'HOT', 'WATCH', 'RADAR', 'IGNORE'] as FilterKey[]).map(filter => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setExpanded(null);
                  }}
                  style={{
                    background: active ? decisionColor(filter) : colors.panel,
                    border: `1px solid ${active ? decisionColor(filter) : colors.border}`,
                    borderRadius: 6,
                    color: active ? colors.bg : '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 900,
                    padding: '8px 10px',
                  }}
                >
                  {filter} {filterCounts[filter]}
                </button>
              );
            })}
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            {filteredTokens.map(token => {
              const enriched = findEnrichment(token);
              const address = token.tokenAddress || token.contractAddress || token.address || enriched?.tokenAddress;
              const socials = mergeSocials(token, enriched);
              const liquidity = enriched?.liquidityUsd ? compactMoney(enriched.liquidityUsd) : token.liquidity;
              const mcap = enriched?.marketCap || enriched?.fdv ? compactMoney(enriched.marketCap || enriched.fdv) : token.mcap;
              const volume24h = enriched?.volume24h ? compactMoney(enriched.volume24h) : token.volume24h;
              const change1h = formatChange(enriched?.priceChange1h, token.priceChange1h);
              const change6h = formatChange(enriched?.priceChange6h, token.priceChange6h);
              const change24h = formatChange(enriched?.priceChange24h, token.priceChange24h);
              const decision = verdictToDecision(token);
              const alphaScore = token.alphaScore ?? token.score * 10;
              const cardId = address || `${token.symbol}-${token.rank}`;
              const isOpen = expanded === cardId;

              return (
                <article
                  key={cardId}
                  onClick={() => setExpanded(isOpen ? null : cardId)}
                  style={{
                    background: colors.panel,
                    border: `1px solid ${isOpen ? decisionColor(decision) : colors.border}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: 18,
                  }}
                >
                  <div style={{ alignItems: 'flex-start', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                        <span style={{ background: decisionColor(decision), borderRadius: 999, display: 'inline-block', height: 9, width: 9 }} />
                        <h2 style={{ color: colors.text, fontSize: 19, fontWeight: 900, margin: 0 }}>{token.name}</h2>
                        <span style={{ color: colors.muted, fontSize: 13, fontWeight: 900 }}>{token.symbol}</span>
                        {address && <span style={{ color: colors.dim, fontSize: 12 }}>{shortAddress(address)}</span>}
                        {address && (
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              copyAddress(address);
                            }}
                            style={{
                              background: copiedAddress === address ? colors.hot : '#111827',
                              border: `1px solid ${copiedAddress === address ? colors.hot : '#263244'}`,
                              borderRadius: 6,
                              color: copiedAddress === address ? colors.bg : '#cbd5e1',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 900,
                              padding: '5px 7px',
                            }}
                          >
                            {copiedAddress === address ? 'Copied' : 'Copy CA'}
                          </button>
                        )}
                        <span style={{ border: `1px solid ${decisionColor(decision)}`, borderRadius: 999, color: decisionColor(decision), fontSize: 11, fontWeight: 900, padding: '3px 7px' }}>
                          {decision}
                        </span>
                      </div>
                      <div style={{ color: colors.dim, fontSize: 12, marginTop: 5 }}>
                        Rank #{token.rank} {token.chain ? `- ${token.chain}` : ''} {ageLabel(token.ageHours) ? `- ${ageLabel(token.ageHours)}` : ''}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ color: decisionColor(decision), fontSize: 25, fontWeight: 900 }}>{alphaScore}/100</div>
                      <div style={{ color: decisionColor(decision), fontSize: 11, fontWeight: 900 }}>ALPHA</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
                    <Stat label="MCap/FDV" value={mcap} />
                    <Stat label="Liquidity" value={liquidity} />
                    <Stat label="Vol 5m" value={token.volume5m || 'N/A'} />
                    <Stat label="Vol 1h" value={token.volume1h || 'N/A'} />
                    <Stat label="Vol 24h" value={volume24h} />
                    <Stat label="5m" value={token.priceChange5m || 'N/A'} tone={changeTone(token.priceChange5m || 'N/A')} />
                    <Stat label="1h" value={change1h} tone={changeTone(change1h)} />
                    <Stat label="6h" value={change6h} tone={changeTone(change6h)} />
                    <Stat label="24h" value={change24h} tone={changeTone(change24h)} />
                    {typeof token.txns24h === 'number' && <Stat label="TX 24h" value={token.txns24h.toLocaleString()} />}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <SocialLinks socials={socials} />
                  </div>

                  <ScoreBar score={alphaScore / 10} />

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 16, paddingTop: 16 }}>
                      {address && (
                        <div style={{ alignItems: 'center', background: colors.panel2, border: `1px solid ${colors.border}`, borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, padding: 12 }}>
                          <div style={{ color: colors.dim, fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>CA</div>
                          <code style={{ color: '#cbd5e1', flex: 1, fontSize: 12, minWidth: 220, overflowWrap: 'anywhere' }}>{address}</code>
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              copyAddress(address);
                            }}
                            style={{
                              background: copiedAddress === address ? colors.hot : colors.panel,
                              border: `1px solid ${copiedAddress === address ? colors.hot : '#263244'}`,
                              borderRadius: 6,
                              color: copiedAddress === address ? colors.bg : '#cbd5e1',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 900,
                              padding: '8px 10px',
                            }}
                          >
                            {copiedAddress === address ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 16 }}>
                        <div>
                          <Stat label="Team" value={`${token.teamScore}/10`} />
                          <ScoreBar score={token.teamScore} />
                        </div>
                        <div>
                          <Stat label="Product" value={`${token.productScore}/10`} />
                          <ScoreBar score={token.productScore} />
                        </div>
                        <div>
                          <Stat label="Community" value={`${token.communityScore}/10`} />
                          <ScoreBar score={token.communityScore} />
                        </div>
                        <Stat label="Risk" value={token.risk || 'UNKNOWN'} tone={token.risk === 'LOW' ? colors.hot : token.risk === 'MEDIUM' ? colors.radar : colors.danger} />
                      </div>

                      {(token.github?.stars || token.github?.description) && (
                        <div style={{ background: colors.panel2, border: `1px solid ${colors.border}`, borderRadius: 8, color: '#cbd5e1', fontSize: 13, marginBottom: 14, padding: 12 }}>
                          GitHub: {(token.github?.stars || 0).toLocaleString()} stars / {(token.github?.forks || 0).toLocaleString()} forks
                          {token.github?.description ? <span style={{ color: colors.muted }}> - {token.github.description}</span> : null}
                        </div>
                      )}

                      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 14 }}>
                        <div>
                          <div style={{ color: colors.hot, fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Signals</div>
                          {(token.pros.length ? token.pros : ['limited positive signal']).map((item, itemIndex) => (
                            <div key={itemIndex} style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.45, marginBottom: 4 }}>
                              - {item}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ color: colors.danger, fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Risks</div>
                          {(token.cons.length ? token.cons : ['no major risk flagged by collector']).map((item, itemIndex) => (
                            <div key={itemIndex} style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.45, marginBottom: 4 }}>
                              - {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: colors.panel2, border: `1px solid ${colors.border}`, borderRadius: 8, color: '#cbd5e1', fontSize: 13, lineHeight: 1.55, padding: 12 }}>
                        {token.analysis || 'No analysis available yet.'}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <footer style={{ color: colors.dim, fontSize: 11, lineHeight: 1.6, padding: '24px 0 0', textAlign: 'center' }}>
            DYOR. AI analysis is not financial advice. Collector stores broad Bankr snapshots on the VPS and sends the strongest candidates here.
          </footer>
        </>
      )}
    </main>
  );
}
