'use client';

import { useEffect, useRef, useState } from 'react';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  fullscreen?: boolean;
}

export function TradingViewChart({ symbol, height = 500, fullscreen = false }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget completely
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(10, 14, 23, 1)',
      gridColor: 'rgba(30, 41, 59, 0.5)',
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies', 'MACD@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, widgetKey]);

  // Force re-render when fullscreen state changes
  useEffect(() => {
    setWidgetKey(prev => prev + 1);
  }, [fullscreen]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#0a0e17]">
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{
          height: fullscreen ? '100%' : `${height}px`,
          width: '100%',
          minHeight: fullscreen ? '400px' : undefined,
        }}
      />
    </div>
  );
}

interface TradingViewTickerProps {
  symbols: string[];
}

export function TradingViewTicker({ symbols }: TradingViewTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || symbols.length === 0) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols.map(s => ({ proName: s, title: s.split(':')[1] || s })),
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);
  }, [symbols]);

  return (
    <div className="border-b border-border">
      <div ref={containerRef} className="tradingview-widget-container" />
    </div>
  );
}
