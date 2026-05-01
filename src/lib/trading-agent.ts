import { getKnowledgeText } from '@/lib/store';

// ==========================================
// Groq API - FREE, public, fast
// OpenAI-compatible format
// Get your key at: https://console.groq.com/keys
// ==========================================

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGroq(messages: Array<{role: string, content: string}>, temperature: number = 0.7): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it in Vercel Environment Variables.');
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export interface AnalysisResult {
  symbol: string;
  direction: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  confidence: string;
  analysis: string;
  reasoning: string;
  chartSymbol: string;
}

export async function analyzeSymbol(symbol: string): Promise<AnalysisResult> {
  const knowledge = getKnowledgeText();

  // ==========================================
  // STEP 1: Get structured trade data as JSON
  // ==========================================
  const dataPrompt = `You are a trading analyst. Analyze ${symbol} and return ONLY valid JSON. No other text.

Return this exact JSON format:
{"direction":"Bullish or Bearish or Neutral","entry":"price number","stoploss":"price number","tp1":"price number","tp2":"price number","tp3":"price number","confidence":"High or Medium or Low"}

Price examples: "63500" or "1.0850" or "148.50" - always as plain numbers without $ or commas.

${knowledge ? `Reference these trading concepts: ${knowledge.substring(0, 1000)}` : ''}`;

  let structuredData: any = {};

  try {
    const dataText = await callGroq(
      [
        { role: 'system', content: 'You only respond with valid JSON. No explanation, no markdown, no code blocks. Just raw JSON.' },
        { role: 'user', content: dataPrompt }
      ],
      0.3
    );

    // Clean up: remove markdown code blocks if present
    let cleaned = dataText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    structuredData = JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse failed, trying manual extraction:', e);
    structuredData = {};
  }

  // ==========================================
  // STEP 2: Get detailed analysis text
  // ==========================================
  const analysisSystemPrompt = `أنت وكيل تداول محترف (Professional Trading Agent) متخصص في تحليل العملات الرقمية (Cryptocurrency) والفوركس (Forex).

## خبراتك:
لقد درست 6 كتب متخصصة في التداول:
- The Black Book of Forex Trading (Paul Langer) - Price Action, Position Sizing
- The Ultimate Harmonic Pattern Trading Guide - Butterfly, Cypher, Gartley, Crab, Bat, Shark
- One Good Trade (Mike Bellafiore) - Prop Trading, Stocks In Play, Reading the Tape
- Am Trades Personal Model - Risk Management, Personal Trading Strategy
- Alexandre Elder - Trading for a Living - Trading Psychology, Triple Screen
- Asia Session Trading Strategy - Session-based Analysis

## قواعدك:
1. قدم تحليلاً مفصلاً ومهنياً (على الأقل 500 كلمة)
2. استشهد بمفاهيم محددة من الكتب الستة
3. اكتب بالعربية مع المصطلحات الإنجليزية بين قوسين
4. استخدم إدارة المخاطر (لا تخاطر بأكثر من 1-2% من رأس المال)`;

  const entryHint = structuredData.entry || '';

  const analysisPrompt = `قم بتحليل الرمز: **${symbol}**

${entryHint ? `البيانات المرجعية: Entry=${structuredData.entry}, SL=${structuredData.stoploss}, TP1=${structuredData.tp1 || ''}, TP2=${structuredData.tp2 || ''}, TP3=${structuredData.tp3 || ''}` : ''}

${knowledge ? `=== معرفتك من الكتب الستة ===\n${knowledge}\n=== نهاية المعرفة ===` : ''}
اكتب تحليلاً فنياً شاملاً بالعربية مع المصطلحات الإنجليزية بين قوسين. استشهد بمفاهيم من الكتب الستة. التحليل يجب أن يكون طويلاً ومفصلاً (على الأقل 500 كلمة).`;

  let analysisText = '';
  try {
    analysisText = await callGroq(
      [
        { role: 'system', content: analysisSystemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      0.7
    );
  } catch (e) {
    console.error('Analysis call failed:', e);
    analysisText = 'Analysis generation failed. Please try again.';
  }

  // ==========================================
  // STEP 3: Combine results
  // ==========================================
  const result: AnalysisResult = {
    symbol,
    direction: structuredData.direction || (extractFromText(analysisText, ['صعودي', 'bullish', 'شراء']) ? 'Bullish'
      : extractFromText(analysisText, ['هبوطي', 'bearish', 'بيع']) ? 'Bearish' : 'Neutral'),
    entryPrice: structuredData.entry || findAnyPrice(analysisText, ['entry', 'دخول']),
    stopLoss: structuredData.stoploss || findAnyPrice(analysisText, ['stop', 'وقف', 'خسارة']),
    takeProfit1: structuredData.tp1 || findAnyPrice(analysisText, ['tp1', 'هدف أول']),
    takeProfit2: structuredData.tp2 || findAnyPrice(analysisText, ['tp2', 'هدف ثاني']),
    takeProfit3: structuredData.tp3 || findAnyPrice(analysisText, ['tp3', 'هدف ثالث']),
    confidence: structuredData.confidence || 'Medium',
    analysis: analysisText,
    reasoning: analysisText,
    chartSymbol: normalizeSymbol(symbol),
  };

  return result;
}

export async function chatWithAgent(message: string, history: Array<{role: string, content: string}> = []): Promise<string> {
  const knowledge = getKnowledgeText();

  const systemMessage = `أنت وكيل تداول محترف متخصص في العملات الرقمية والفوركس. درست 6 كتب متخصصة. أجب بالعربية مع المصطلحات الإنجليزية بين قوسين.

${knowledge ? `معرفتك من الكتب:\n${knowledge}` : ''}`;

  const messages = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10),
    { role: 'user', content: message }
  ];

  const response = await callGroq(messages, 0.7);
  return response || 'عذراً، لم أتمكن من معالجة طلبك.';
}

// ==========================================
// Robust fallback extractors
// ==========================================

function extractFromText(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function findAnyPrice(text: string, keywords: string[]): string {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    const after = text.substring(idx, Math.min(idx + 100, text.length));
    const numMatch = after.match(/(\d{1,3}(?:,\d{3})+|\d+\.\d{2,6}|\d{3,})/);
    if (numMatch && numMatch[1]) {
      return numMatch[1].replace(/,/g, '');
    }
  }
  return 'N/A';
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
