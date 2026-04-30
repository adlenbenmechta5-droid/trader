import ZAI from 'z-ai-web-dev-sdk';
import { getKnowledgeText } from '@/lib/store';

const SYSTEM_PROMPT = `You are a Professional Trading Agent specialized in Cryptocurrency and Forex analysis.

## Your Expertise:
You have studied 6 specialized trading books and apply best practices from all of them. Your knowledge includes:
- Price Action Analysis (from Paul Langer's Black Book of Forex Trading)
- Harmonic Patterns: Butterfly, Cypher, Gartley, Crab, Bat, Shark (from Ultimate Harmonic Pattern Trading Guide)
- Prop Trading Fundamentals, Stock In Play, Reading the Tape (from One Good Trade by Mike Bellafiore)
- Personal Trading Model, Risk Management Framework (from Am Trades Personal Model)
- Trading Psychology, Triple Screen, Elder-ray (from Alexandre Elder - Trading for a Living)
- Asia Session Trading Strategy, Session-based Analysis (from Asia Session Trading Strategy)

## Rules:
1. ALWAYS provide a DETAILED and PROFESSIONAL analysis (minimum 500 words)
2. Specify EXACT entry, stop loss, and take profit prices with numbers
3. Reference SPECIFIC concepts from the 6 books you studied
4. Use proper risk management (never risk more than 1-2% of capital)
5. Write the analysis in Arabic with English technical terms in parentheses
6. Structure your analysis clearly with sections and bullet points

**IMPORTANT: Your response MUST start EXACTLY with these 7 lines before anything else:**
DIRECTION: [Bullish or Bearish or Neutral]
ENTRY: [exact price number like 63,500 or 1.0850]
STOPLOSS: [exact price number]
TP1: [exact price number]
TP2: [exact price number]
TP3: [exact price number]
CONFIDENCE: [High or Medium or Low]

Then write the detailed analysis below with:
📊 **الاتجاه العام (Overall Trend)**: [explanation]

🎯 **نقطة الدخول (Entry)**: [price and reasoning]

🛑 **وقف الخسارة (Stop Loss)**: [price and reasoning]

💰 **أهداف الربح (Take Profit)**:
- TP1: [price] - [rationale]
- TP2: [price] - [rationale]
- TP3: [price] - [rationale]

📐 **نسبة المخاطرة للعائد (Risk:Reward)**: [ratio]

📝 **التفاصيل والسببية (Detailed Reasoning)**:
[Minimum 300 words of detailed analysis covering:]
- Current market structure and price action
- Key technical levels (support, resistance, supply/demand zones)
- Pattern recognition (harmonic patterns from the Ultimate Guide, candlestick patterns)
- Volume and momentum analysis
- Session-specific considerations (Asia/London/NY)
- Risk management plan referencing Paul Langer's position sizing methods
- What could invalidate this trade setup

📚 **مراجع من الكتب (Book References)**:
[Cite at least 2-3 specific concepts/strategies from the 6 books that support your analysis]

⚠️ **تحذيرات المخاطر (Risk Warnings)**:
[List specific risks and what to watch out for]

Remember: You provide educational technical analysis, not financial advice.`;

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

  const userPrompt = `قم بتحليل الرمز التالي: **${symbol}**

**مهم جداً:** يجب أن تبدأ إجابتك بالأسطر السبعة التالية بالضبط قبل أي شيء آخر:

DIRECTION: [Bullish أو Bearish أو Neutral]
ENTRY: [السعر الدقيق كرقم مثل 63,500 أو 1.0850]
STOPLOSS: [السعر الدقيق]
TP1: [السعر الدقيق]
TP2: [السعر الدقيق]
TP3: [السعر الدقيق]
CONFIDENCE: [High أو Medium أو Low]

بعد هذه الأسطر السبعة، اكتب التحليل المفصل بالعربية مع المصطلحات الإنجليزية بين قوسين.

${knowledge ? `=== معرفتك من الكتب الستة ===\n${knowledge}\n=== نهاية المعرفة ===` : ''}

قم بإجراء تحليل فني شامل ومعمق مستند على الكتب وأعطني:
1. الاتجاه العام (Trend) - مع توضيح السبب من الكتب (مفاهيم Price Action من Paul Langer)
2. نقطة الدخول المقترحة (Entry) - أرقام دقيقة
3. وقف الخسارة (Stop Loss) - بناءً على مستويات الدعم والمقاومة من الكتب
4. ثلاثة أهداف ربح (TP1, TP2, TP3) - مع استخدام فيبوناتشي من Harmonic Patterns Guide
5. نسبة المخاطرة للعائد (Risk:Reward)
6. مستوى الثقة (Confidence) - مع التبرير
7. التفاصيل والسببية (Reasoning) - استشهد بمفاهيم محددة من الكتب
8. مراجع من الكتب - اذكر على الأقل 2-3 مفاهيم محددة من الكتب الستة
9. تحذيرات المخاطر (Risk Warning)

**التحليل يجب أن يكون طويلاً ومفصلاً (على الأقل 500 كلمة).**

أجب بالعربية مع المصطلحات الإنجليزية بين قوسين.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content || '';

  // Extract structured data - try simple header first, then fallback to Arabic text
  const result: AnalysisResult = {
    symbol,
    direction: extractField(content, 'DIRECTION:') || extractField(content, 'الاتجاه', 'Trend') || 'Neutral',
    entryPrice: extractPrice(content, 'ENTRY:') || extractPrice(content, 'نقطة الدخول', 'Entry'),
    stopLoss: extractPrice(content, 'STOPLOSS:', 'STOP LOSS:') || extractPrice(content, 'وقف الخسارة', 'Stop Loss'),
    takeProfit1: extractPrice(content, 'TP1:') || extractPrice(content, 'هدف الربح الأول', 'Take Profit 1'),
    takeProfit2: extractPrice(content, 'TP2:') || extractPrice(content, 'هدف الربح الثاني', 'Take Profit 2'),
    takeProfit3: extractPrice(content, 'TP3:') || extractPrice(content, 'هدف الربح الثالث', 'Take Profit 3'),
    confidence: extractField(content, 'CONFIDENCE:') || extractField(content, 'الثقة', 'Confidence') || 'Medium',
    // Clean the analysis: remove the raw DIRECTION/ENTRY/STOPLOSS/TP/CONFIDENCE lines
    analysis: content
      .replace(/^DIRECTION:.*$/im, '')
      .replace(/^ENTRY:.*$/im, '')
      .replace(/^STOPLOSS:.*$/im, '')
      .replace(/^STOP LOSS:.*$/im, '')
      .replace(/^TP[123]:.*$/im, '')
      .replace(/^CONFIDENCE:.*$/im, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
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

  return completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';
}

/**
 * Find a keyword in text, then extract the first meaningful value after it.
 * Handles Arabic + English mixed text where non-matching chars sit between keyword and value.
 */
function findKeywordArea(text: string, keyword: string, searchRadius: number = 200): string | null {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return null;
  return text.substring(idx, Math.min(idx + searchRadius, text.length));
}

function extractField(text: string, ...keywords: string[]): string | null {
  for (const keyword of keywords) {
    const area = findKeywordArea(text, keyword, 200);
    if (!area) continue;
    // Remove the keyword itself and any markdown/emoji prefix
    const afterKeyword = area.replace(/^[^:]{0,80}:?/, '').trim();
    // Take everything until the next section header (emoji + bold) or newline
    const lines = afterKeyword.split('\n');
    const value = lines[0].replace(/^[*\s:-]+/, '').trim();
    if (value.length > 2) {
      return value.substring(0, 200);
    }
  }
  return null;
}

function extractPrice(text: string, ...keywords: string[]): string {
  for (const keyword of keywords) {
    const area = findKeywordArea(text, keyword, 300);
    if (!area) continue;
    // Skip the keyword line itself, look at what comes after
    const afterKey = area.replace(new RegExp('^' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
    // Price patterns ordered from most specific to least specific:
    const pricePatterns = [
      /\$(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/,   // $63,500 or $1,234.56
      /(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/,       // 63,500 or 1,234.56
      /(\d+\.\d{2,6})/,                         // 1.0850 or 0.6321 or 1234.56
      /(\d{3,})/,                                // 63500
    ];
    for (const pattern of pricePatterns) {
      const match = afterKey.match(pattern);
      if (match && match[1]) {
        const price = match[1].trim();
        if (price.length >= 2) {
          return price;
        }
      }
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
