// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  // For backward compatibility, dynamically import fs only when needed
  const fs = await import('fs');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

export function summarizeText(text: string, maxLength: number = 8000): string {
  // Clean and normalize text
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) return cleaned;

  // Take first portion which usually contains key concepts
  return cleaned.substring(0, maxLength) + '...[truncated]';
}

export function extractKeyConcepts(text: string): string[] {
  const concepts: string[] = [];
  
  // Trading-specific patterns
  const patterns = [
    /support and resistance/gi,
    /moving average/gi,
    /RSI|relative strength/gi,
    /MACD/gi,
    /Fibonacci|fib retracement/gi,
    /candlestick pattern/gi,
    /trend line/gi,
    /breakout/gi,
    /stop loss/gi,
    /take profit/gi,
    /risk management/gi,
    /position sizing/gi,
    /market structure/gi,
    /price action/gi,
    /harmonic pattern/gi,
    /supply and demand/gi,
    /Elliot wave|elliott wave/gi,
    /volume analysis/gi,
    /risk-reward ratio/gi,
    /scalping|day trading|swing trading/gi,
    /double top|double bottom|head and shoulders/gi,
    /bullish|bearish/gi,
    /overbought|oversold/gi,
    /divergence/gi,
    /confluence/gi,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      concepts.push(pattern.source.replace(/\\[a-z]+/gi, '').replace(/[()|]/g, ''));
    }
  }

  return [...new Set(concepts.map(c => c.trim().toLowerCase()))];
}
