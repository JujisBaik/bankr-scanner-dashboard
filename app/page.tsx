'use client';
import { useEffect, useState } from 'react';

interface Token {
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
  github: { stars: number; forks: number; description: string };
  website: string;
  twitter: string;
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
  model: string;
  summary: { bullish: number; neutral: number; bearish: number };
  tokens: Token[];
}

const verdictColor = (v: string) => {
  if (v === 'BULLISH') return '#00ff88';
  if (v === 'BEARISH') return '#ff4444';
  return '#ffaa00';
};

const verdictEmoji = (v: string) => {
  if (v === 'BULLISH') return '🟢';
  if (v === 'BEARISH') return '🔴';
  return '🟡';
};

const scoreBar = (score: number) => {
  const pct = score * 10;
  const color = score >= 7 ? '#00ff88' : score >= 5 ? '#ffaa00' : '#ff4444';
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 4, height: 6, width: '100%', marginTop: 4 }}>
      <div style={{ background: color, borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s' }} />
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/results')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(typeof e === 'number' ? `No data yet (HTTP ${e})` : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
          🔬 Bankr Scanner
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
          AI-powered token analysis · MiMo v2 Pro · bankr.bot/discover
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading latest scan...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          {error}
          <p style={{ fontSize: 12, marginTop: 12, color: '#555' }}>
            Results appear after the first VPS scan (every 10 min)
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Bar */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            background: '#111122', borderRadius: 12, padding: '16px 24px',
            marginBottom: 24, border: '1px solid #222'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00ff88' }}>{data.summary.bullish}</div>
              <div style={{ fontSize: 11, color: '#666' }}>BULLISH</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ffaa00' }}>{data.summary.neutral}</div>
              <div style={{ fontSize: 11, color: '#666' }}>NEUTRAL</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4444' }}>{data.summary.bearish}</div>
              <div style={{ fontSize: 11, color: '#666' }}>BEARISH</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #333', paddingLeft: 24 }}>
              <div style={{ fontSize: 12, color: '#888' }}>Last scan</div>
              <div style={{ fontSize: 14, color: '#ccc' }}>{timeAgo(data.timestamp)}</div>
            </div>
          </div>

          {/* Token Cards */}
          {data.tokens.map((t, i) => (
            <div
              key={i}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                background: '#111122',
                border: `1px solid ${expanded === i ? verdictColor(t.verdict) + '44' : '#222'}`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {/* Token Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{verdictEmoji(t.verdict)}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
                      {t.name} <span style={{ color: '#666', fontWeight: 400, fontSize: 14 }}>({t.symbol})</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      #{t.rank} · MCap {t.mcap} · Liq {t.liquidity}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: verdictColor(t.verdict) }}>
                    {t.score}/10
                  </div>
                  <div style={{ fontSize: 11, color: verdictColor(t.verdict), fontWeight: 600 }}>
                    {t.verdict}
                  </div>
                </div>
              </div>

              {/* Price Changes */}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[
                  { label: '1h', val: t.priceChange1h },
                  { label: '6h', val: t.priceChange6h },
                  { label: '24h', val: t.priceChange24h },
                ].map(p => {
                  const num = parseFloat(p.val);
                  const color = num > 0 ? '#00ff88' : num < 0 ? '#ff4444' : '#888';
                  return (
                    <div key={p.label} style={{ fontSize: 13 }}>
                      <span style={{ color: '#666' }}>{p.label}: </span>
                      <span style={{ color, fontWeight: 600 }}>{p.val}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 13, marginLeft: 'auto' }}>
                  <span style={{ color: '#666' }}>Vol: </span>
                  <span style={{ color: '#ccc' }}>{t.volume24h}</span>
                </div>
              </div>

              {scoreBar(t.score)}

              {/* Expanded Details */}
              {expanded === i && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #222' }}>
                  {/* Scores */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    {[
                      { label: 'Team', val: t.teamScore },
                      { label: 'Product', val: t.productScore },
                      { label: 'Community', val: t.communityScore },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#666' }}>{s.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{s.val}/10</div>
                        {scoreBar(s.val)}
                      </div>
                    ))}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#666' }}>Risk</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.risk === 'HIGH' ? '#ff4444' : t.risk === 'MEDIUM' ? '#ffaa00' : '#00ff88' }}>
                        {t.risk}
                      </div>
                    </div>
                  </div>

                  {/* GitHub */}
                  {t.github.stars > 0 && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: '#0d0d1a', borderRadius: 8 }}>
                      <span style={{ fontSize: 13 }}>⭐ {t.github.stars.toLocaleString()} · 🍴 {t.github.forks.toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>{t.github.description}</span>
                    </div>
                  )}

                  {/* Pros & Cons */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#00ff88', fontWeight: 600, marginBottom: 4 }}>✅ Strengths</div>
                      {t.pros.map((p, j) => (
                        <div key={j} style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>• {p}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#ff4444', fontWeight: 600, marginBottom: 4 }}>❌ Risks</div>
                      {t.cons.map((c, j) => (
                        <div key={j} style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>• {c}</div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis */}
                  <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, padding: '8px 12px', background: '#0d0d1a', borderRadius: 8 }}>
                    💡 {t.analysis}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#444', fontSize: 11 }}>
            ⚠️ DYOR — AI analysis, bukan financial advice<br />
            Model: {data.model} · Auto-refresh every 10 min
          </div>
        </>
      )}
    </div>
  );
}
