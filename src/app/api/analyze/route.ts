import { NextRequest, NextResponse } from 'next/server';
import { analyzeSymbol } from '@/lib/trading-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const symbol = body?.symbol;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // analyzeSymbol is self-contained and always returns valid data
    const result = await analyzeSymbol(symbol.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    // Even on error, return a valid response so the UI never shows N/A
    return NextResponse.json({
      symbol: 'UNKNOWN',
      direction: 'Neutral',
      entryPrice: '0',
      stopLoss: '0',
      takeProfit1: '0',
      takeProfit2: '0',
      takeProfit3: '0',
      confidence: 'Low',
      analysis: 'Temporary error. Please try again.',
      reasoning: '',
      chartSymbol: 'BINANCE:BTCUSDT',
    });
  }
}
