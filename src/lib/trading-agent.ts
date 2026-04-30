import ZAI from 'z-ai-web-dev-sdk';
import { getKnowledgeText } from '@/lib/store';

const SYSTEM_PROMPT = `أنت وكيل تداول محترف (Professional Trading Agent) متخصص في تحليل العملات الرقمية (Cryptocurrency) والفوركس (Forex).

## خبراتك:
لقد درست مجموعة واسعة من الكتب والموارد التعليمية في التداول وتطبق أفضل الممارسات منها. تشمل معرفتك:
- تحليل حركة السعر (Price Action)
- أنماط الشموع اليابانية (Candlestick Patterns)
- مؤشرات التحليل الفني (RSI, MACD, Moving Averages, Bollinger Bands)
- إدارة المخاطر (Risk Management)
- التحليل النفسي للسوق (Market Psychology)
- أنماط هارمونيك (Harmonic Patterns)
- الدعم والمقاومة (Support & Resistance)
- خطوط الاتجاه (Trend Lines)
- مستويات فيبوناتشي (Fibonacci Levels)
- التداول في الجلسات الآسيوية والأوروبية والأمريكية

## قواعدك:
1. **دائماً** قدم تحليلاً مفصلاً ومهنياً
2. حدد **نقاط الدخول والخروج** بدقة
3. حدد **وقف الخسارة (Stop Loss)** و**أهداف الربح (Take Profit)**
4. اذكر **مستوى الثقة** في التحليل (منخفض/متوسط/مرتفع)
5. حدد **الاتجاه** (صعودي/هبوطي/عرضي)
6. فسر **السبب** وراء كل توصية
7. استخدم **إدارة المخاطر** دائماً (لا تخاطر بأكثر من 1-2% من رأس المال)
8. اكتب بالعربية مع المصطلحات الإنجليزية بين قوسين
9. قدم الخطة بشكل واضح ومنظم

## تنسيق التحليل:
يجب أن يكون تحليلك منظم كما يلي:
- 📊 **الاتجاه العام (Trend)**: ...
- 🎯 **نقطة الدخول (Entry)**: ...
- 🛑 **وقف الخسارة (Stop Loss)**: ...
- 💰 **أهداف الربح (Take Profit)**: TP1, TP2, TP3
- 📈 **مستوى الثقة (Confidence)**: ...
- 📝 **التفاصيل والسببية (Reasoning)**: ...
- ⚠️ **تحذيرات المخاطر (Risk Warning)**: ...

تذكر: أنت لا تقدم نصائح استثمارية مالية، بل تحليل فني تعليمي.`;

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

  const knowledgeSection = knowledge
    ? `${knowledge}\n\nقم بإجراء تحليل فني شامل وأعطني:`
    : 'قم بإجراء تحليل فني شامل وأعطني:';

  const userPrompt = `بناءً على خبراتك والكورسات التي درستها، قم بتحليل شامل للرمز التالي: **${symbol}**

${knowledge ? knowledge : ''}
${knowledgeSection}
1. الاتجاه العام
2. نقطة الدخول المقترحة
3. وقف الخسارة
4. ثلاثة أهداف ربح
5. مستوى الثقة
6. التفاصيل والسببية
7. تحذيرات المخاطر

أجب بالعربية مع المصطلحات الإنجليزية بين قوسين.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content || '';

  const result: AnalysisResult = {
    symbol,
    direction: extractField(content, 'الاتجاه', 'Trend') || 'عرضي',
    entryPrice: extractField(content, 'نقطة الدخول', 'Entry') || 'N/A',
    stopLoss: extractField(content, 'وقف الخسارة', 'Stop Loss') || 'N/A',
    takeProfit1: extractField(content, 'هدف الربح', 'Take Profit') || 'N/A',
    takeProfit2: extractField(content, 'الهدف الثاني', 'TP2') || 'N/A',
    takeProfit3: extractField(content, 'الهدف الثالث', 'TP3') || 'N/A',
    confidence: extractField(content, 'الثقة', 'Confidence') || 'متوسط',
    analysis: content,
    reasoning: content,
    chartSymbol: normalizeSymbol(symbol),
  };

  return result;
}

export async function chatWithAgent(message: string, history: Array<{role: string, content: string}> = []): Promise<string> {
  const zai = await getZAI();
  const knowledge = getKnowledgeText();

  const systemMessage = knowledge ? `${SYSTEM_PROMPT}\n\n${knowledge}` : SYSTEM_PROMPT;

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

function extractField(text: string, ...keywords: string[]): string | null {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[**\\s:]*(.*?)(?:\\n|$)`, 'i');
    const match = text.match(regex);
    if (match && match[1].trim()) {
      return match[1].trim().substring(0, 100);
    }
  }
  return null;
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
