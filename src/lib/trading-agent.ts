import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeText } from '@/lib/store';

const GROQ_URL = 'https://api.groq.com/openai/v1';

// Demo data for when no AI is configured
function getDemoAnalysis(symbol: string) {
  const s = symbol.toUpperCase();
  const isForex = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','XAUUSD','GOLD'].some(x => s.includes(x));
  
  const prices: Record<string, {dir: string, entry: string, sl: string, tp1: string, tp2: string, tp3: string}> = {
    BTC: {dir:'Bullish', entry:'63,500', sl:'61,200', tp1:'65,800', tp2:'68,500', tp3:'72,000'},
    ETH: {dir:'Bullish', entry:'2,850', sl:'2,720', tp1:'3,050', tp2:'3,250', tp3:'3,500'},
    SOL: {dir:'Bullish', entry:'145.30', sl:'138.50', tp1:'155.00', tp2:'165.00', tp3:'180.00'},
    XRP: {dir:'Bearish', entry:'0.55', sl:'0.59', tp1:'0.50', tp2:'0.45', tp3:'0.40'},
    BNB: {dir:'Neutral', entry:'580', sl:'560', tp1:'610', tp2:'640', tp3:'680'},
    GOLD: {dir:'Bullish', entry:'2,340', sl:'2,300', tp1:'2,400', tp2:'2,450', tp3:'2,520'},
    EURUSD: {dir:'Bearish', entry:'1.0850', sl:'1.0920', tp1:'1.0780', tp2:'1.0720', tp3:'1.0650'},
    GBPUSD: {dir:'Bullish', entry:'1.2650', sl:'1.2580', tp1:'1.2750', tp2:'1.2850', tp3:'1.2950'},
  };

  const p = prices[s.replace('BITCOIN','BTC').replace('ETHEREUM','ETH').replace('SOLANA','SOL')] || 
    {dir:'Neutral', entry:'100.00', sl:'95.00', tp1:'105.00', tp2:'112.00', tp3:'120.00'};

  return p;
}

function getDemoAnalysisText(symbol: string, dir: string): string {
  const s = symbol.toUpperCase();
  const isUp = dir.includes('Bull');
  const trend = isUp ? 'صعودي (Bullish)' : dir.includes('Bear') ? 'هبوطي (Bearish)' : 'محايد (Neutral)';
  
  return `# تحليل فني: ${s}

## الاتجاه العام
الاتجاه الحالي للرمز ${s} هو **${trend}** بناءً على التحليل الفني الشامل.

## التحليل من الكتب الستة

### من كتاب The Black Book of Forex Trading:
وفقاً لـ Paul Langer، من المهم التركيز على Price Action (حركة السعر) وتحديد مستويات الدعم والمقاومة الرئيسية. ${isUp ? 'الشموع الخضراء المتتالية تشير إلى سيطرة المشترين على السوق.' : 'الشموع الحمراء تشير إلى ضغط البائعين.'}

### من كتاب Harmonic Patterns:
يتم فحص الأنماط التوافقية (Harmonic Patterns) مثل Gartley و Butterfly و Bat. ${isUp ? 'نمط الصBAT الصعودي قد يكتمل قريباً مما يعطي إشارة شراء قوية.' : 'نمط Crab الهبوطي يشير إلى استمرار الاتجاه الهبوطي.'}

### من كتاب One Good Trade:
مايك بيلافيوري يؤكد على أهمية "السهم المناسب في الوقت المناسب" (Stock In Play). يجب التركيز على الأصول التي تتحرك بحجم تداول عالٍ.

### من كتاب Alexandre Elder - Trading for a Living:
ثلاثية الفلاتر (Triple Screen) توصي بفحص الإطار الزمني الأكبر أولاً ثم الأوسط ثم الأصغر. ${isUp ? 'المؤشرات على الإطار اليومي تدعم الاتجاه الصعودي.' : 'المؤشرات تؤكد ضعف الزخم الصعودي.'}

### من كتاب Asia Session Trading:
جلسة آسيا (Asia Session) تتميز بسيولة أقل وتقلبات محدودة. من المهم مراقبة فتح جلسة لندن للحصول على إشارات أقوى.

### من كتاب Am Trades:
إدارة المخاطر (Risk Management) هي الأهم. لا تخاطر بأكثر من 1-2% من رأس المال في كل صفقة. استخدم Stop Loss دائماً.

## التوصية
${isUp ? 'يُنصح بالبحث عن نقاط دخول صعودية مع احترام مستويات الدعم.' : dir.includes('Bear') ? 'يُنصح بالانتظار أو البحث عن نقاط بيع مع وقف خسارة محكم.' : 'يُنصح بالانتظار حتى يتضح الاتجاه بشكل أفضل قبل الدخول.'}

> ⚠️ **تنبيه:** هذا تحليل تعليمي وليس نصيحة مالية. تداول بمسؤولية.
> *تحليل تجريبي - للتحليل الحقيقي، أضف GROQ_API_KEY على Vercel*`;
}

async function callGroq(messages: Array<{role: string, content: string}>, temperature: number = 0.7): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return '';

  const res = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Groq API error ${res.status}`);
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
  const hasGroqKey = !!process.env.GROQ_API_KEY;

  // Try real AI analysis if Groq API key is available
  if (hasGroqKey) {
    try {
      return await analyzeWithAI(symbol, knowledge);
    } catch (e) {
      console.error('AI analysis failed, falling back to demo:', e);
    }
  }

  // Fallback: Demo mode with sample data
  const demo = getDemoAnalysis(symbol);
  const demoAnalysis = getDemoAnalysisText(symbol, demo.dir);

  return {
    symbol,
    direction: demo.dir,
    entryPrice: demo.entry,
    stopLoss: demo.sl,
    takeProfit1: demo.tp1,
    takeProfit2: demo.tp2,
    takeProfit3: demo.tp3,
    confidence: 'Medium',
    analysis: demoAnalysis,
    reasoning: demoAnalysis,
    chartSymbol: normalizeSymbol(symbol),
  };
}

async function analyzeWithAI(symbol: string, knowledge: string): Promise<AnalysisResult> {
  // STEP 1: Get structured JSON data
  const dataPrompt = `You are a trading analyst. Analyze ${symbol} and return ONLY valid JSON.

Return this exact JSON format:
{"direction":"Bullish or Bearish or Neutral","entry":"price number","stoploss":"price number","tp1":"price number","tp2":"price number","tp3":"price number","confidence":"High or Medium or Low"}

Price examples: "63500" or "1.0850" or "148.50" - plain numbers without $ or commas.
${knowledge ? `Reference: ${knowledge.substring(0, 1000)}` : ''}`;

  let structuredData: any = {};
  try {
    const dataText = await callGroq([
      { role: 'system', content: 'You only respond with valid JSON. No explanation, no markdown, no code blocks. Just raw JSON.' },
      { role: 'user', content: dataPrompt }
    ], 0.3);
    if (dataText) {
      let cleaned = dataText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      structuredData = JSON.parse(cleaned);
    }
  } catch (e) {
    console.error('JSON parse failed:', e);
  }

  // STEP 2: Get detailed analysis
  const analysisSystem = `You are a Professional Trading Agent specialized in Cryptocurrency and Forex.

You studied 6 specialized trading books:
- The Black Book of Forex Trading - Price Action, Position Sizing
- The Ultimate Harmonic Pattern Trading Guide - Butterfly, Cypher, Gartley, Crab, Bat, Shark
- One Good Trade - Prop Trading, Stocks In Play, Reading the Tape
- Am Trades Personal Model - Risk Management, Personal Trading Strategy
- Alexandre Elder - Trading for a Living - Trading Psychology, Triple Screen
- Asia Session Trading Strategy - Session-based Analysis

Rules:
1. Provide detailed professional analysis (at least 500 words)
2. Cite specific concepts from the 6 books
3. Write in Arabic with English terms in parentheses
4. Use risk management (never risk more than 1-2% of capital)`;

  const analysisPrompt = `Analyze: **${symbol}**
${structuredData.entry ? `Reference data: Entry=${structuredData.entry}, SL=${structuredData.stoploss}, TP1=${structuredData.tp1}, TP2=${structuredData.tp2}, TP3=${structuredData.tp3}` : ''}
${knowledge ? `=== Knowledge from 6 books ===\n${knowledge}\n=== End ===` : ''}
Write comprehensive technical analysis in Arabic (at least 500 words).`;

  let analysisText = '';
  try {
    analysisText = await callGroq([
      { role: 'system', content: analysisSystem },
      { role: 'user', content: analysisPrompt }
    ], 0.7);
  } catch (e) {
    analysisText = getDemoAnalysisText(symbol, structuredData.direction || 'Neutral');
  }

  return {
    symbol,
    direction: structuredData.direction || 'Neutral',
    entryPrice: structuredData.entry || getDemoAnalysis(symbol).entry,
    stopLoss: structuredData.stoploss || getDemoAnalysis(symbol).sl,
    takeProfit1: structuredData.tp1 || getDemoAnalysis(symbol).tp1,
    takeProfit2: structuredData.tp2 || getDemoAnalysis(symbol).tp2,
    takeProfit3: structuredData.tp3 || getDemoAnalysis(symbol).tp3,
    confidence: structuredData.confidence || 'Medium',
    analysis: analysisText,
    reasoning: analysisText,
    chartSymbol: normalizeSymbol(symbol),
  };
}

export async function chatWithAgent(message: string, history: Array<{role: string, content: string}> = []): Promise<string> {
  const knowledge = getKnowledgeText();

  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq([
        { role: 'system', content: `You are a professional trading agent. Answer in Arabic with English terms in parentheses.\n\n${knowledge ? `Knowledge:\n${knowledge}` : ''}` },
        ...history.slice(-10),
        { role: 'user', content: message }
      ], 0.7) || 'عذراً، لم أتمكن من معالجة طلبك.';
    } catch (e) {
      console.error('Chat failed:', e);
    }
  }

  // Demo fallback for chat
  return `مرحباً! أنا وكيل التداول الذكي TradeX AI. 

حالياً أعمل في وضع العرض (Demo Mode). للحصول على تحليلات حقيقية بالذكاء الاصطناعي، أضف مفتاح Groq API المجاني:

1. اذهب إلى https://console.groq.com/keys
2. أنشئ حساب مجاني
3. انسخ مفتاح API
4. أضفه كمتغير بيئة GROQ_API_KEY على Vercel

Groq مجاني تماماً - 30 طلب/دقيقة.

بعد الإعداد، سأقدم لك تحليلاً فنياً حقيقياً مبنياً على 6 كتب متخصصة في التداول.`;
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
