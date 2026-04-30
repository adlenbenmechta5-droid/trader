import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeText } from '@/lib/store';

// ZAI API configuration (matching SDK headers exactly)
const ZAI_BASE_URL = 'http://172.25.136.193:8080/v1';
const ZAI_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer Z.ai',
  'X-Z-AI-From': 'Z',
  'X-Chat-Id': 'chat-c892de0c-9f7e-4b5d-8ea7-0a756ab73646',
  'X-User-Id': 'ed5bfcf5-d208-4418-b935-e29322b9d6ae',
  'X-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWQ1YmZjZjUtZDIwOC00NDE4LWI5MzUtZTI5MzIyYjlkNmFlIiwiY2hhdF9pZCI6ImNoYXQtYzg5MmRlMGMtOWY3ZS00YjVkLThlYTctMGE3NTZhYjczNjQ2IiwicGxhdGZvcm0iOiJ6YWkifQ.9iPQ17tAEFwZ8DOkoLJav-rj5TrpxtUStHOEwkTp6Qo',
};

async function callLLM(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
  const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: ZAI_HEADERS,
    body: JSON.stringify({
      model: 'default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      thinking: { type: 'disabled' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const knowledge = getKnowledgeText();
    const chartSymbol = normalizeSymbol(symbol);

    // STEP 1: Get structured trade data as JSON
    let structuredData: any = {};
    try {
      const dataPrompt = `You are a trading analyst. Analyze ${symbol} and return ONLY valid JSON.
{"direction":"Bullish or Bearish or Neutral","entry":"price number","stoploss":"price number","tp1":"price number","tp2":"price number","tp3":"price number","confidence":"High or Medium or Low"}
Price examples: "63500" or "1.0850" or "148.50" - plain numbers without $ or commas.`;

      const dataText = await callLLM(
        'You only respond with valid JSON. No explanation, no markdown, no code blocks.',
        dataPrompt,
        0.3
      );

      let cleaned = dataText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      structuredData = JSON.parse(cleaned);
      console.log('JSON parsed OK:', JSON.stringify(structuredData));
    } catch (e: any) {
      console.error('JSON parse failed:', e.message);
      structuredData = {};
    }

    // STEP 2: Get detailed analysis text
    let analysisText = '';
    try {
      const analysisSystem = `أنت وكيل تداول محترف متخصص في العملات الرقمية والفوركس.
درست 6 كتب: Black Book of Forex Trading, Harmonic Patterns, One Good Trade, Am Trades, Alexandre Elder, Asia Session Strategy.
اكتب بالعربية مع المصطلحات الإنجليزية بين قوسين.`;

      const analysisPrompt = `قم بتحليل: **${symbol}**
${structuredData.entry ? `Entry=${structuredData.entry}, SL=${structuredData.stoploss}, TP1=${structuredData.tp1}, TP2=${structuredData.tp2}, TP3=${structuredData.tp3}` : ''}
${knowledge ? `معرفتك من الكتب:\n${knowledge.substring(0, 2000)}` : ''}
اكتب تحليلاً فنياً شاملاً بالعربية (500+ كلمة).`;

      analysisText = await callLLM(analysisSystem, analysisPrompt, 0.7);
    } catch (e: any) {
      console.error('Analysis failed:', e.message);
      analysisText = 'Analysis generation failed. Please try again.';
    }

    const result = {
      symbol,
      direction: structuredData.direction || 'Neutral',
      entryPrice: structuredData.entry || 'N/A',
      stopLoss: structuredData.stoploss || 'N/A',
      takeProfit1: structuredData.tp1 || 'N/A',
      takeProfit2: structuredData.tp2 || 'N/A',
      takeProfit3: structuredData.tp3 || 'N/A',
      confidence: structuredData.confidence || 'Medium',
      analysis: analysisText,
      reasoning: analysisText,
      chartSymbol,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeSymbol(symbol: string): string {
  const s = symbol.toUpperCase().trim().replace(/\s+/g, '');
  if (s.includes('BTC') || s.includes('BITCOIN')) return 'BINANCE:BTCUSDT';
  if (s.includes('ETH') || s.includes('ETHEREUM')) return 'BINANCE:ETHUSDT';
  if (s.includes('BNB')) return 'BINANCE:BNBUSDT';
  if (s.includes('SOL') || s.includes('SOLANA')) return 'BINANCE:SOLUSDT';
  if (s.includes('XRP')) return 'BINANCE:XRPUSDT';
  if (s.includes('DOGE')) return 'BINANCE:DOGEUSDT';
  if (s.includes('ADA')) return 'BINANCE:ADAUSDT';
  if (s.includes('DOT')) return 'BINANCE:DOTUSDT';
  if (s.includes('AVAX')) return 'BINANCE:AVAXUSDT';
  if (s.includes('MATIC') || s.includes('POL')) return 'BINANCE:POLUSDT';
  if (s.includes('LINK')) return 'BINANCE:LINKUSDT';
  if (s.includes('UNI')) return 'BINANCE:UNIUSDT';
  if (s.includes('PEPE')) return 'BINANCE:PEPEUSDT';
  if (s.includes('SHIB')) return 'BINANCE:SHIBUSDT';
  if (s.includes('TRX')) return 'BINANCE:TRXUSDT';
  if (s.includes('LTC')) return 'BINANCE:LTCUSDT';
  if (s.includes('NEAR')) return 'BINANCE:NEARUSDT';
  if (s.includes('EURUSD') || s === 'EUR/USD') return 'FX:EURUSD';
  if (s.includes('GBPUSD') || s === 'GBP/USD') return 'FX:GBPUSD';
  if (s.includes('USDJPY') || s === 'USD/JPY') return 'FX:USDJPY';
  if (s.includes('AUDUSD') || s === 'AUD/USD') return 'FX:AUDUSD';
  if (s.includes('USDCAD') || s === 'USD/CAD') return 'FX:USDCAD';
  if (s.includes('USDCHF') || s === 'USD/CHF') return 'FX:USDCHF';
  if (s.includes('NZDUSD') || s === 'NZD/USD') return 'FX:NZDUSD';
  if (s.includes('EURGBP') || s === 'EUR/GBP') return 'FX:EURGBP';
  if (s.includes('EURJPY') || s === 'EUR/JPY') return 'FX:EURJPY';
  if (s.includes('GBPJPY') || s === 'GBP/JPY') return 'FX:GBPJPY';
  if (s.includes('GOLD') || s.includes('XAUUSD')) return 'OANDA:XAUUSD';
  return `BINANCE:${s}USDT`;
}
