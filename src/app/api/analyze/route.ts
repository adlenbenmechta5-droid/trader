import { NextRequest, NextResponse } from 'next/server';
import { analyzeSymbol } from '@/lib/trading-agent';

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const result = await analyzeSymbol(symbol);

    // Log extraction results for debugging
    console.log(`=== Analysis for ${symbol} ===`);
    console.log(`Direction: ${result.direction}`);
    console.log(`Entry: ${result.entryPrice}`);
    console.log(`SL: ${result.stopLoss}`);
    console.log(`TP1: ${result.takeProfit1}`);
    console.log(`TP2: ${result.takeProfit2}`);
    console.log(`TP3: ${result.takeProfit3}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Analysis length: ${result.analysis.length}`);
    console.log(`=== End ===`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
