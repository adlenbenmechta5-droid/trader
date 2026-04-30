import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { symbol, analysis, direction, entryPrice, stopLoss, takeProfit1, takeProfit2, takeProfit3 } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const svgString = generateTradePlanSVG({
      symbol: symbol.toUpperCase(),
      direction: direction || 'buy',
      entryPrice: entryPrice || 'N/A',
      stopLoss: stopLoss || 'N/A',
      takeProfit1: takeProfit1 || 'N/A',
      takeProfit2: takeProfit2 || 'N/A',
      takeProfit3: takeProfit3 || 'N/A',
    });

    // Return SVG as base64 data URL (no sharp needed!)
    const base64 = Buffer.from(svgString, 'utf-8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
    });
  } catch (error: any) {
    console.error('Trade plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

interface TradePlanData {
  symbol: string;
  direction: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface Candle { open: number; high: number; low: number; close: number; }

function generateCandlestickData(seed: number, count: number, isBuy: boolean): Candle[] {
  const candles: Candle[] = [];
  let basePrice = 100 + seededRandom(seed) * 50;
  const trendSlope = isBuy ? 0.15 : -0.15;

  for (let i = 0; i < count; i++) {
    const r = seededRandom(seed + i * 7);
    const r2 = seededRandom(seed + i * 13);
    const r3 = seededRandom(seed + i * 23);
    const volatility = 1.5 + r * 3;
    const trend = trendSlope + (r2 - 0.5) * 0.5;

    const open = basePrice;
    const close = open + trend + (r3 - 0.45) * volatility;
    const high = Math.max(open, close) + r * volatility * 0.8;
    const low = Math.min(open, close) - r2 * volatility * 0.8;

    candles.push({ open, high, low, close });
    basePrice = close;
  }

  return candles;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateTradePlanSVG(data: TradePlanData): string {
  const width = 1200;
  const height = 700;

  const isBuy = data.direction.toLowerCase().includes('buy') ||
    data.direction.toLowerCase().includes('bullish');

  const candleSeed = data.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const candles = generateCandlestickData(candleSeed, 60, isBuy);

  let minPrice = Infinity, maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  const chartLeft = 80;
  const chartRight = width - 280;
  const chartTop = 100;
  const chartBottom = height - 80;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  const displayMin = minPrice - pricePadding;
  const displayMax = maxPrice + pricePadding;
  const displayRange = displayMax - displayMin;

  function priceToY(price: number): number {
    return chartBottom - ((price - displayMin) / displayRange) * chartHeight;
  }

  const candleWidth = Math.max(4, Math.floor(chartWidth / candles.length * 0.7));
  const candleGap = chartWidth / candles.length;

  // Build candlestick SVG elements
  let candleSVG = '';
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const x = chartLeft + i * candleGap + candleGap / 2;
    const isGreen = c.close >= c.open;
    const color = isGreen ? '#10b981' : '#ef4444';
    const bodyTop = priceToY(Math.max(c.open, c.close));
    const bodyBottom = priceToY(Math.min(c.open, c.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    candleSVG += `<line x1="${x}" y1="${priceToY(c.high)}" x2="${x}" y2="${priceToY(c.low)}" stroke="${color}" stroke-width="1" opacity="0.7"/>`;
    candleSVG += `<rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="1" opacity="0.85"/>`;
  }

  // Grid lines
  let gridSVG = '';
  const gridLines = 6;
  for (let i = 0; i <= gridLines; i++) {
    const y = chartTop + (chartHeight / gridLines) * i;
    const price = displayMax - (displayRange / gridLines) * i;
    gridSVG += `<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
    gridSVG += `<text x="${chartLeft - 10}" y="${y + 4}" font-family="'Courier New', monospace" font-size="10" fill="rgba(255,255,255,0.3)" text-anchor="end">${price.toFixed(1)}</text>`;
  }

  // Price level positions
  const entryY = chartTop + chartHeight * 0.50;
  const slY = isBuy ? chartTop + chartHeight * 0.70 : chartTop + chartHeight * 0.30;
  const tp1Y = isBuy ? chartTop + chartHeight * 0.38 : chartTop + chartHeight * 0.62;
  const tp2Y = isBuy ? chartTop + chartHeight * 0.26 : chartTop + chartHeight * 0.74;
  const tp3Y = isBuy ? chartTop + chartHeight * 0.15 : chartTop + chartHeight * 0.85;

  const panelX = chartRight + 20;
  const panelWidth = 230;

  // Profit and Loss zones
  let zonesSVG = '';

  if (isBuy) {
    // Profit zone (above entry)
    zonesSVG += `<rect x="${chartLeft}" y="${tp3Y}" width="${chartRight - chartLeft}" height="${entryY - tp3Y}" fill="rgba(16, 185, 129, 0.07)" rx="4"/>`;
    zonesSVG += `<text x="${chartLeft + 15}" y="${(tp1Y + entryY) / 2}" font-family="'Arial', 'Helvetica', sans-serif" font-size="14" font-weight="bold" fill="rgba(16, 185, 129, 0.5)" letter-spacing="3">PROFIT ZONE</text>`;

    // Loss zone (below entry)
    zonesSVG += `<rect x="${chartLeft}" y="${entryY}" width="${chartRight - chartLeft}" height="${slY - entryY}" fill="rgba(239, 68, 68, 0.08)" rx="4"/>`;
    zonesSVG += `<text x="${chartLeft + 15}" y="${(entryY + slY) / 2}" font-family="'Arial', 'Helvetica', sans-serif" font-size="14" font-weight="bold" fill="rgba(239, 68, 68, 0.5)" letter-spacing="3">LOSS ZONE</text>`;
  } else {
    // Profit zone (below entry for sell)
    zonesSVG += `<rect x="${chartLeft}" y="${entryY}" width="${chartRight - chartLeft}" height="${tp3Y - entryY}" fill="rgba(16, 185, 129, 0.07)" rx="4"/>`;
    zonesSVG += `<text x="${chartLeft + 15}" y="${(entryY + tp1Y) / 2}" font-family="'Arial', 'Helvetica', sans-serif" font-size="14" font-weight="bold" fill="rgba(16, 185, 129, 0.5)" letter-spacing="3">PROFIT ZONE</text>`;

    // Loss zone (above entry for sell)
    zonesSVG += `<rect x="${chartLeft}" y="${slY}" width="${chartRight - chartLeft}" height="${entryY - slY}" fill="rgba(239, 68, 68, 0.08)" rx="4"/>`;
    zonesSVG += `<text x="${chartLeft + 15}" y="${(slY + entryY) / 2}" font-family="'Arial', 'Helvetica', sans-serif" font-size="14" font-weight="bold" fill="rgba(239, 68, 68, 0.5)" letter-spacing="3">LOSS ZONE</text>`;
  }

  // Level dashed lines with labels
  // ENTRY line
  zonesSVG += `
    <line x1="${chartLeft}" y1="${entryY}" x2="${chartRight}" y2="${entryY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8,4"/>
    <rect x="${chartRight - 60}" y="${entryY - 12}" width="55" height="20" rx="4" fill="rgba(245, 158, 11, 0.9)"/>
    <text x="${chartRight - 32}" y="${entryY + 3}" font-family="'Courier New', monospace" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">ENTRY</text>
  `;

  // STOP LOSS line
  zonesSVG += `
    <line x1="${chartLeft}" y1="${slY}" x2="${chartRight}" y2="${slY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4"/>
    <rect x="${chartRight - 60}" y="${slY - 12}" width="55" height="20" rx="4" fill="rgba(239, 68, 68, 0.9)"/>
    <text x="${chartRight - 32}" y="${slY + 3}" font-family="'Courier New', monospace" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">SL</text>
  `;

  // TP1 line
  zonesSVG += `
    <line x1="${chartLeft}" y1="${tp1Y}" x2="${chartRight}" y2="${tp1Y}" stroke="#10b981" stroke-width="2" stroke-dasharray="8,4"/>
    <rect x="${chartRight - 60}" y="${tp1Y - 12}" width="55" height="20" rx="4" fill="rgba(16, 185, 129, 0.9)"/>
    <text x="${chartRight - 32}" y="${tp1Y + 3}" font-family="'Courier New', monospace" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">TP1</text>
  `;

  // TP2 line
  zonesSVG += `
    <line x1="${chartLeft}" y1="${tp2Y}" x2="${chartRight}" y2="${tp2Y}" stroke="#34d399" stroke-width="1.5" stroke-dasharray="6,4"/>
    <rect x="${chartRight - 60}" y="${tp2Y - 12}" width="55" height="20" rx="4" fill="rgba(52, 211, 153, 0.7)"/>
    <text x="${chartRight - 32}" y="${tp2Y + 3}" font-family="'Courier New', monospace" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">TP2</text>
  `;

  // TP3 line
  zonesSVG += `
    <line x1="${chartLeft}" y1="${tp3Y}" x2="${chartRight}" y2="${tp3Y}" stroke="#6ee7b7" stroke-width="1" stroke-dasharray="4,4"/>
    <rect x="${chartRight - 60}" y="${tp3Y - 12}" width="55" height="20" rx="4" fill="rgba(110, 231, 183, 0.5)"/>
    <text x="${chartRight - 32}" y="${tp3Y + 3}" font-family="'Courier New', monospace" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">TP3</text>
  `;

  // Direction arrow
  const arrowX = chartLeft + 40;
  if (isBuy) {
    zonesSVG += `
      <polygon points="${arrowX},${entryY - 5} ${arrowX - 12},${entryY + 15} ${arrowX + 12},${entryY + 15}" fill="#10b981" opacity="0.8"/>
      <line x1="${arrowX}" y1="${entryY - 5}" x2="${arrowX}" y2="${tp3Y + 20}" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4,3" opacity="0.5"/>
    `;
  } else {
    zonesSVG += `
      <polygon points="${arrowX},${entryY + 5} ${arrowX - 12},${entryY - 15} ${arrowX + 12},${entryY - 15}" fill="#ef4444" opacity="0.8"/>
      <line x1="${arrowX}" y1="${entryY + 5}" x2="${arrowX}" y2="${tp3Y - 20}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,3" opacity="0.5"/>
    `;
  }

  // Right panel - Trade Plan Details
  let panelSVG = '';
  panelSVG += `
    <rect x="${panelX}" y="${chartTop}" width="${panelWidth}" height="${chartHeight}" rx="12" 
          fill="rgba(17, 24, 39, 0.95)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="${panelX + panelWidth / 2}" y="${chartTop + 35}" font-family="'Arial', 'Helvetica', sans-serif" 
          font-size="18" font-weight="bold" fill="#10b981" text-anchor="middle" letter-spacing="2">TRADE PLAN</text>
    <text x="${panelX + panelWidth / 2}" y="${chartTop + 55}" font-family="'Arial', 'Helvetica', sans-serif" 
          font-size="14" fill="#94a3b8" text-anchor="middle">${escapeXml(data.symbol)}</text>
  `;

  // Direction badge
  const dirText = isBuy ? 'LONG / BUY' : 'SHORT / SELL';
  const dirColor = isBuy ? '#10b981' : '#ef4444';
  const dirBg = isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  panelSVG += `
    <rect x="${panelX + 15}" y="${chartTop + 68}" width="${panelWidth - 30}" height="32" rx="8" 
          fill="${dirBg}" stroke="${dirColor}" stroke-width="1.5"/>
    <text x="${panelX + panelWidth / 2}" y="${chartTop + 89}" font-family="'Arial', 'Helvetica', sans-serif" 
          font-size="14" font-weight="bold" fill="${dirColor}" text-anchor="middle">${dirText}</text>
  `;
  panelSVG += `<line x1="${panelX + 15}" y1="${chartTop + 112}" x2="${panelX + panelWidth - 15}" y2="${chartTop + 112}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;

  // Price levels in panel
  const levels = [
    { label: 'ENTRY', value: data.entryPrice, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', y: chartTop + 130 },
    { label: 'STOP LOSS', value: data.stopLoss, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', y: chartTop + 192 },
    { label: 'TP 1', value: data.takeProfit1, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', y: chartTop + 254 },
    { label: 'TP 2', value: data.takeProfit2, color: '#34d399', bg: 'rgba(52, 211, 153, 0.10)', y: chartTop + 316 },
    { label: 'TP 3', value: data.takeProfit3, color: '#6ee7b7', bg: 'rgba(110, 231, 183, 0.08)', y: chartTop + 378 },
  ];

  for (const level of levels) {
    panelSVG += `
      <rect x="${panelX + 12}" y="${level.y}" width="${panelWidth - 24}" height="48" rx="8" 
            fill="${level.bg}" stroke="${level.color}" stroke-width="1" stroke-opacity="0.4"/>
      <text x="${panelX + 22}" y="${level.y + 20}" font-family="'Arial', 'Helvetica', sans-serif" 
            font-size="10" font-weight="bold" fill="${level.color}" letter-spacing="1.5">${level.label}</text>
      <text x="${panelX + panelWidth - 22}" y="${level.y + 32}" font-family="'Courier New', monospace" 
            font-size="16" font-weight="bold" fill="#ffffff" text-anchor="end">${escapeXml(level.value)}</text>
    `;
  }

  // R:R ratio
  const rrY = chartTop + chartHeight - 55;
  panelSVG += `<line x1="${panelX + 15}" y1="${rrY}" x2="${panelX + panelWidth - 15}" y2="${rrY}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  panelSVG += `
    <text x="${panelX + panelWidth / 2}" y="${rrY + 25}" font-family="'Arial', 'Helvetica', sans-serif" 
          font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">Risk : Reward</text>
    <text x="${panelX + panelWidth / 2}" y="${rrY + 45}" font-family="'Courier New', monospace" 
          font-size="13" font-weight="bold" fill="#10b981" text-anchor="middle">1 : 3+</text>
  `;

  // Header
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  let headerSVG = `
    <rect x="0" y="0" width="${width}" height="80" fill="#0a0e17"/>
    <line x1="0" y1="80" x2="${width}" y2="80" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <rect x="20" y="18" width="44" height="44" rx="10" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.3)" stroke-width="1"/>
    <text x="42" y="47" font-family="'Arial', 'Helvetica', sans-serif" font-size="22" fill="#10b981" text-anchor="middle" font-weight="bold">TX</text>
    <text x="80" y="38" font-family="'Arial', 'Helvetica', sans-serif" font-size="18" font-weight="bold" fill="#e2e8f0" letter-spacing="1">TradeX AI</text>
    <text x="80" y="56" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" fill="#64748b">Professional Trading Agent</text>
    <text x="${width - 20}" y="38" font-family="'Courier New', monospace" font-size="11" fill="#64748b" text-anchor="end">${escapeXml(dateStr)}</text>
    <text x="${width - 20}" y="56" font-family="'Courier New', monospace" font-size="10" fill="#475569" text-anchor="end">${escapeXml(data.symbol)}</text>
  `;

  // Footer
  let footerSVG = `
    <rect x="0" y="${height - 50}" width="${width}" height="50" fill="#0a0e17"/>
    <line x1="0" y1="${height - 50}" x2="${width}" y2="${height - 50}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <text x="20" y="${height - 28}" font-family="'Arial', 'Helvetica', sans-serif" font-size="10" fill="rgba(255,255,255,0.15)">TradeX AI</text>
    <text x="${width / 2}" y="${height - 15}" font-family="'Arial', 'Helvetica', sans-serif" font-size="9" fill="rgba(239, 68, 68, 0.3)" text-anchor="middle">For educational purposes only</text>
  `;

  // Chart border
  let borderSVG = `
    <rect x="${chartLeft - 1}" y="${chartTop - 1}" width="${chartRight - chartLeft + 2}" height="${chartHeight + 2}" 
          rx="2" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  `;

  // Assemble full SVG
  const fullSVG = [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `<defs>`,
    `  <style>`,
    `    text { font-family: 'Arial', 'Helvetica', sans-serif; }`,
    `    .mono { font-family: 'Courier New', monospace; }`,
    `  </style>`,
    `</defs>`,
    `<rect width="${width}" height="${height}" fill="#0a0e17"/>`,
    headerSVG,
    gridSVG,
    borderSVG,
    candleSVG,
    zonesSVG,
    panelSVG,
    footerSVG,
    `</svg>`,
  ].join('\n');

  return fullSVG;
}
