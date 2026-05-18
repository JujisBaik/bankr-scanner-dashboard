// app/api/results/route.ts — GET latest results, POST new results from VPS
import { NextRequest, NextResponse } from 'next/server';
import { saveResults, getLatestResults, getHistory, ScanResult } from '@/lib/storage';

// GET /api/results — return latest scan results
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'history') {
    const history = await getHistory();
    return NextResponse.json({ results: history });
  }

  const latest = await getLatestResults();
  if (!latest) {
    return NextResponse.json({ error: 'No scan results yet' }, { status: 404 });
  }
  return NextResponse.json(latest);
}

// POST /api/results — VPS pushes new scan results
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.SCAN_API_KEY;

  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    const result: ScanResult = {
      id: `scan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: body.model || 'mimo-v2-pro',
      summary: body.summary,
      tokens: body.tokens,
    };

    await saveResults(result);
    
    return NextResponse.json({ 
      success: true, 
      id: result.id,
      timestamp: result.timestamp 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
