import ZAI from 'z-ai-web-dev-sdk';
import { getKnowledgeText } from '@/lib/store';

let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
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
  const zai = await getZAI();
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
    const dataCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You only respond with valid JSON. No explanation, no markdown, no code blocks. Just raw JSON.' },
        { role: 'user', content: dataPrompt }
      ],
      temperature: 0.3,
    });

    let dataText = dataCompletion.choices[0]?.message?.content || '';
    
    // Clean up: remove markdown code blocks if present
    dataText = dataText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    // Try to parse JSON
    structuredData = JSON.parse(dataText);
  } catch (e) {
    console.error('JSON parse failed, trying manual extraction:', e);
    // Fallback: try to extract from raw text
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

  const directionHint = structuredData.direction || 'the current market';
  const entryHint = structuredData.entry || '';
  const slHint = structuredData.stoploss || '';

  const analysisPrompt = `قم بتحليل الرمز: **${symbol}**

${entryHint ? `البيانات المرجعية: Entry=${entryHint}, SL=${slHint}, TP1=${structuredData.tp1 || ''}, TP2=${structuredData.tp2 || ''}, TP3=${structuredData.tp3 || ''}` : ''}

${knowledge ? `=== معرفتك من الكتب الستة ===\n${knowledge}\n=== نهاية المعرفة ===` : ''}
اكتب تحليلاً فنياً شاملاً بالعربية مع المصطلحات الإنجليزية بين قوسين. استشهد بمفاهيم من الكتب الستة. التحليل يجب أن يكون طويلاً ومفصلاً (على الأقل 500 كلمة).`;

  let analysisText = '';
  try {
    const analysisCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: analysisSystemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.7,
    });
    analysisText = analysisCompletion.choices[0]?.message?.content || '';
  } catch (e) {
    console.error('Analysis call failed:', e);
    analysisText = 'Analysis generation failed. Please try again.';
  }

  // ==========================================
  // STEP 3: Combine results
  // ==========================================
  const result: AnalysisResult = {
    symbol,
    direction: structuredData.direction || extractFromText(analysisText, ['صعودي', 'bullish', 'شراء']) ? 'Bullish' 
      : extractFromText(analysisText, ['هبوطي', 'bearish', 'بيع']) ? 'Bearish' : 'Neutral',
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
  const zai = await getZAI();
  const knowledge = getKnowledgeText();

  const systemMessage = `أنت وكيل تداول محترف متخصص في العملات الرقمية والفوركس. درست 6 كتب متخصصة. أجب بالعربية مع المصطلحات الإنجليزية بين قوسين.
  
${knowledge ? `معرفتك من الكتب:\n${knowledge}` : ''}`;

  const messages = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10),
    { role: 'user', content: message }
  ];

  const completion = await zai.chat.completions.create({
    messages,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك.';
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
    // Find first number in the area
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
