'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Send,
  Bot,
  User,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Zap,
  ImageIcon,
  X,
  Download,
  Eye,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TradingViewChart } from './trading-chart';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  symbol?: string;
  chartSymbol?: string;
  tradePlanUrl?: string;
  isLoading?: boolean;
  isGeneratingImage?: boolean;
  timestamp: Date;
}

interface ChatPanelProps {
  onSymbolAnalyzed?: (symbol: string) => void;
}

function getDirectionIcon(direction?: string) {
  if (!direction) return <Minus className="w-4 h-4 text-muted-foreground" />;
  const d = direction.toLowerCase();
  if (d.includes('صعود') || d.includes('bullish') || d.includes('شراء') || d.includes('buy')) {
    return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  }
  if (d.includes('هبوط') || d.includes('bearish') || d.includes('بيع') || d.includes('sell')) {
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  }
  return <Minus className="w-4 h-4 text-yellow-400" />;
}

function extractField(text: string, ...keywords: string[]): string {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[**\\s:]*([\\d$.,\\s]+)`, 'i');
    const match = text.match(regex);
    if (match && match[1].trim()) {
      return match[1].trim().substring(0, 30);
    }
  }
  return '';
}

export function ChatPanel({ onSymbolAnalyzed }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChart, setShowChart] = useState<{ symbol: string; chartSymbol: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, lightboxImage]);

  const detectSymbol = (text: string): { isSymbol: boolean; symbol: string } => {
    const cryptoPatterns = [
      /\b(BTC|ETH|BNB|SOL|XRP|DOGE|ADA|DOT|AVAX|LINK|UNI|PEPE|SHIB|TRX|LTC|NEAR|MATIC|POL|ATOM|FIL|APT|ARB|OP)\b/i,
      /\b(Bitcoin|Ethereum|Binance|Solana|Cardano|Polkadot|Avalanche|Chainlink)\b/i,
      /\b(XAUUSD|GOLD)\b/i,
    ];
    const forexPatterns = [
      /\b(EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NZDUSD|EURGBP|EURJPY|GBPJPY)\b/i,
      /\b(EUR\/USD|GBP\/USD|USD\/JPY|AUD\/USD|USD\/CAD|USD\/CHF)\b/i,
    ];

    for (const pattern of [...cryptoPatterns, ...forexPatterns]) {
      const match = text.match(pattern);
      if (match) {
        return { isSymbol: true, symbol: match[1] };
      }
    }
    return { isSymbol: false, symbol: '' };
  };

  const normalizeSymbolForChart = (symbol: string): string => {
    const s = symbol.toUpperCase().trim().replace(/\s+/g, '');
    const map: Record<string, string> = {
      'BTC': 'BINANCE:BTCUSDT', 'BITCOIN': 'BINANCE:BTCUSDT',
      'ETH': 'BINANCE:ETHUSDT', 'ETHEREUM': 'BINANCE:ETHUSDT',
      'BNB': 'BINANCE:BNBUSDT', 'SOL': 'BINANCE:SOLUSDT', 'SOLANA': 'BINANCE:SOLUSDT',
      'XRP': 'BINANCE:XRPUSDT', 'DOGE': 'BINANCE:DOGEUSDT',
      'ADA': 'BINANCE:ADAUSDT', 'DOT': 'BINANCE:DOTUSDT',
      'AVAX': 'BINANCE:AVAXUSDT', 'LINK': 'BINANCE:LINKUSDT',
      'UNI': 'BINANCE:UNIUSDT', 'PEPE': 'BINANCE:PEPEUSDT',
      'SHIB': 'BINANCE:SHIBUSDT', 'TRX': 'BINANCE:TRXUSDT',
      'LTC': 'BINANCE:LTCUSDT', 'NEAR': 'BINANCE:NEARUSDT',
      'EURUSD': 'FX:EURUSD', 'GBPUSD': 'FX:GBPUSD',
      'USDJPY': 'FX:USDJPY', 'AUDUSD': 'FX:AUDUSD',
      'USDCAD': 'FX:USDCAD', 'USDCHF': 'FX:USDCHF',
      'GOLD': 'OANDA:XAUUSD', 'XAUUSD': 'OANDA:XAUUSD',
    };
    return map[s] || `BINANCE:${s}USDT`;
  };

  const generateTradePlanImage = useCallback(async (symbol: string, analysisText: string): Promise<string | null> => {
    try {
      const direction = analysisText.includes('صعود') || analysisText.includes('bullish') || analysisText.includes('شراء') || analysisText.includes('buy')
        ? 'buy'
        : analysisText.includes('هبوط') || analysisText.includes('bearish') || analysisText.includes('بيع') || analysisText.includes('sell')
        ? 'sell'
        : 'buy';

      const entryPrice = extractField(analysisText, 'نقطة الدخول', 'Entry', 'الدخول');
      const stopLoss = extractField(analysisText, 'وقف الخسارة', 'Stop Loss', 'وقف');
      const tp1 = extractField(analysisText, 'هدف الربح', 'Take Profit', 'TP1', 'الهدف الأول');
      const tp2 = extractField(analysisText, 'الهدف الثاني', 'TP2');
      const tp3 = extractField(analysisText, 'الهدف الثالث', 'TP3');

      const res = await fetch('/api/trade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          analysis: analysisText,
          direction,
          entryPrice,
          stopLoss,
          takeProfit1: tp1,
          takeProfit2: tp2,
          takeProfit3: tp3,
        }),
      });

      const data = await res.json();
      return data.imageUrl || null;
    } catch (error) {
      console.error('Failed to generate trade plan image:', error);
      return null;
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { isSymbol, symbol } = detectSymbol(input);

      if (isSymbol) {
        const chartSymbol = normalizeSymbolForChart(symbol);

        // Add loading message
        const loadingId = (Date.now() + 1).toString();
        const loadingMsg: Message = {
          id: loadingId,
          role: 'assistant',
          content: '',
          symbol,
          chartSymbol,
          isLoading: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, loadingMsg]);

        try {
          // Step 1: Get AI analysis
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol }),
          });

          const data = await res.json();
          const analysisText = data.analysis || data.reasoning || '';

          const assistantMsg: Message = {
            id: loadingId,
            role: 'assistant',
            content: analysisText,
            symbol,
            chartSymbol,
            isGeneratingImage: true,
            timestamp: new Date(),
          };

          setMessages(prev => prev.map(m => m.id === loadingId ? assistantMsg : m));

          // Step 2: Generate trade plan image
          const tradePlanUrl = await generateTradePlanImage(symbol, analysisText);

          setMessages(prev => prev.map(m =>
            m.id === loadingId
              ? { ...m, tradePlanUrl: tradePlanUrl || undefined, isGeneratingImage: false }
              : m
          ));

          setShowChart({ symbol, chartSymbol });
          onSymbolAnalyzed?.(symbol);
        } catch {
          const errorMsg: Message = {
            id: loadingId,
            role: 'assistant',
            content: 'عذراً، حدث خطأ في التحليل. يرجى المحاولة مرة أخرى.',
            symbol,
            timestamp: new Date(),
          };
          setMessages(prev => prev.map(m => m.id === loadingId ? errorMsg : m));
        }
      } else {
        // Regular chat
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input, history }),
        });

        const data = await res.json();

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                <BarChart3 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">TradeX AI</h2>
              <p className="text-muted-foreground max-w-md leading-relaxed">
                وكيل التداول الذكي. أرسل رمز عملة مثل{' '}
                <Badge variant="outline" className="mx-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">BTC</Badge>{' '}
                أو{' '}
                <Badge variant="outline" className="mx-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">EURUSD</Badge>{' '}
                للحصول على تحليل فوري مع صورة خطة التداول.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {['BTC', 'ETH', 'SOL', 'XRP', 'GOLD', 'EURUSD'].map(s => (
                <Button
                  key={s}
                  variant="outline"
                  className="border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm"
                  onClick={() => { setInput(`حلل لي ${s}`); textareaRef.current?.focus(); }}
                >
                  <BarChart3 className="w-3 h-3 ml-1" />
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-primary/20 text-primary'
                : 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-emerald-400'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-left' : ''}`}>
              {msg.isLoading ? (
                <Card className="bg-card border-border p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-foreground">جاري تحليل {msg.symbol}...</p>
                      <p className="text-xs text-muted-foreground mt-1">يفحص المؤشرات والأنماط الفنية</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className={`bg-card border-border overflow-hidden ${
                  msg.role === 'user' ? 'bg-secondary' : ''
                }`}>
                  {msg.symbol && msg.role === 'assistant' && (
                    <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-foreground">{msg.symbol}</span>
                        {getDirectionIcon(msg.content)}
                      </div>
                      <div className="flex items-center gap-1">
                        {msg.tradePlanUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => setLightboxImage(msg.tradePlanUrl!)}
                          >
                            <ImageIcon className="w-3 h-3 ml-1" />
                            خطة التداول
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setShowChart(msg.chartSymbol ? { symbol: msg.symbol!, chartSymbol: msg.chartSymbol } : null)}
                        >
                          📊 رسم بياني
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Trade Plan Image - shown prominently */}
                  {msg.tradePlanUrl && msg.role === 'assistant' && (
                    <div className="border-b border-border">
                      <div
                        className="cursor-pointer relative group"
                        onClick={() => setLightboxImage(msg.tradePlanUrl!)}
                      >
                        <img
                          src={msg.tradePlanUrl}
                          alt={`Trade Plan - ${msg.symbol}`}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <Eye className="w-5 h-5 text-white" />
                            <span className="text-white text-sm font-medium">عرض بالحجم الكامل</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generating image indicator */}
                  {msg.isGeneratingImage && (
                    <div className="border-b border-border p-4">
                      <div className="flex items-center gap-3 justify-center">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        <p className="text-sm text-muted-foreground">جاري إنشاء صورة خطة التداول...</p>
                      </div>
                    </div>
                  )}

                  {/* Text Analysis */}
                  <div className="p-4 analysis-content">
                    {msg.role === 'user' ? (
                      <p className="text-sm text-foreground">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox for full-size image */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setLightboxImage(null)}
            >
              <X className="w-5 h-5 ml-1" />
              إغلاق
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 left-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => {
                const a = document.createElement('a');
                a.href = lightboxImage;
                a.download = `trade-plan-${Date.now()}.png`;
                a.click();
              }}
            >
              <Download className="w-5 h-5 ml-1" />
              تحميل
            </Button>
            <img
              src={lightboxImage}
              alt="Trade Plan Full Size"
              className="w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Chart Display - Full Screen Modal */}
      {showChart && !lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-[#0a0e17] flex flex-col animate-in fade-in duration-200"
          onClick={() => setShowChart(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#0d1117]/90 backdrop-blur-sm flex-shrink-0">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              {showChart.symbol} - TradingView
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(showChart.chartSymbol)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
                onClick={(e) => e.stopPropagation()}
              >
                فتح في TradingView
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowChart(null); }}
              >
                <X className="w-4 h-4 ml-1" />
                إغلاق
              </Button>
            </div>
          </div>
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <TradingViewChart symbol={showChart.chartSymbol} height={800} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رمز العملة أو سؤالك... (مثال: حلل لي BTC)"
              className="min-h-[44px] max-h-[120px] resize-none bg-secondary border-border focus:border-emerald-500/50 placeholder:text-muted-foreground/50"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-11 w-11 p-0 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
          ⚠️ التحليلات لأغراض تعليمية فقط وليست نصائح استثمارية
        </p>
      </div>
    </div>
  );
}
