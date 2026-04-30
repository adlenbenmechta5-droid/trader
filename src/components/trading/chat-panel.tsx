'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Send, Bot, User, Loader2, TrendingUp, TrendingDown, Minus,
  BarChart3, Zap, X, AlertTriangle, Shield, Expand, ExternalLink,
  Target, ArrowUpCircle, ArrowDownCircle, DollarSign,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TradingViewChart } from './trading-chart';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  symbol?: string;
  chartSymbol?: string;
  isLoading?: boolean;
  analysisData?: {
    direction: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    takeProfit3: string;
    confidence: string;
  };
  timestamp: Date;
}

interface ChatPanelProps {
  onSymbolAnalyzed?: (symbol: string) => void;
}

function getDirectionIcon(direction?: string) {
  if (!direction) return <Minus className="w-4 h-4 text-muted-foreground" />;
  const d = direction.toLowerCase();
  if (d.includes('up') || d.includes('bullish') || d.includes('buy') || d.includes('long') || d.includes('\u0635\u0639\u0648\u062f') || d.includes('\u0634\u0631\u0627\u0621')) {
    return <TrendingUp className="w-5 h-5 text-emerald-400" />;
  }
  if (d.includes('down') || d.includes('bearish') || d.includes('sell') || d.includes('short') || d.includes('\u0647\u0628\u0648\u0637') || d.includes('\u0628\u064a\u0639')) {
    return <TrendingDown className="w-5 h-5 text-red-400" />;
  }
  return <Minus className="w-5 h-5 text-yellow-400" />;
}

function getDirectionColor(direction?: string): string {
  if (!direction) return 'border-yellow-500/30 bg-yellow-500/5';
  const d = direction.toLowerCase();
  if (d.includes('up') || d.includes('bullish') || d.includes('buy') || d.includes('long')) {
    return 'border-emerald-500/30 bg-emerald-500/5';
  }
  if (d.includes('down') || d.includes('bearish') || d.includes('sell') || d.includes('short')) {
    return 'border-red-500/30 bg-red-500/5';
  }
  return 'border-yellow-500/30 bg-yellow-500/5';
}

export function ChatPanel({ onSymbolAnalyzed }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChart, setShowChart] = useState<{ symbol: string; chartSymbol: string } | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleAnalysis = (msgId: string) => {
    setExpandedAnalysis(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

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
            analysisData: {
              direction: data.direction || '',
              entryPrice: data.entryPrice || 'N/A',
              stopLoss: data.stopLoss || 'N/A',
              takeProfit1: data.takeProfit1 || 'N/A',
              takeProfit2: data.takeProfit2 || 'N/A',
              takeProfit3: data.takeProfit3 || 'N/A',
              confidence: data.confidence || 'Medium',
            },
            timestamp: new Date(),
          };

          setMessages(prev => prev.map(m => m.id === loadingId ? assistantMsg : m));
          onSymbolAnalyzed?.(symbol);
        } catch {
          const errorMsg: Message = {
            id: loadingId,
            role: 'assistant',
            content: 'Sorry, analysis failed. Please try again.',
            symbol,
            timestamp: new Date(),
          };
          setMessages(prev => prev.map(m => m.id === loadingId ? errorMsg : m));
        }
      } else {
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
        content: 'Sorry, an error occurred. Please try again.',
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/10 flex items-center justify-center border border-emerald-500/20">
                <BarChart3 className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">TradeX AI</h2>
              <p className="text-muted-foreground max-w-lg text-base leading-relaxed">
                {"AI Trading Agent trained on 6 specialized books. Send a symbol like "}
                <Badge variant="outline" className="mx-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-sm px-2 py-0.5">BTC</Badge>
                {" for real-time chart + detailed analysis."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {['BTC', 'ETH', 'SOL', 'XRP', 'GOLD', 'EURUSD'].map(s => (
                <Button
                  key={s}
                  variant="outline"
                  className="border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm h-10"
                  onClick={() => { setInput(`Analyze ${s}`); textareaRef.current?.focus(); }}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-primary/20 text-primary'
                : 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-emerald-400'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'max-w-[70%]' : 'max-w-full'}`}>
              {msg.isLoading ? (
                <Card className="bg-card border-border p-5">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    <div>
                      <p className="text-base font-medium text-foreground">{"Analyzing "}{msg.symbol}{"..."}</p>
                      <p className="text-sm text-muted-foreground mt-1">{"Reading 6 books knowledge & checking technical patterns"}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className={`bg-card border-border overflow-hidden ${
                  msg.role === 'user' ? 'bg-secondary' : ''
                }`}>
                  {/* Symbol analysis header - LARGER AND MORE PROMINENT */}
                  {msg.symbol && msg.role === 'assistant' && (
                    <div className="px-5 py-3 border-b border-border/50 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-lg font-bold text-foreground">{msg.symbol}</span>
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/50 text-muted-foreground">
                          Technical Analysis
                        </Badge>
                        {getDirectionIcon(msg.content)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          onClick={() => setShowChart(msg.chartSymbol ? { symbol: msg.symbol!, chartSymbol: msg.chartSymbol } : null)}
                        >
                          <Expand className="w-3.5 h-3.5 mr-1" />
                          Fullscreen
                        </Button>
                        {msg.chartSymbol && (
                          <a
                            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(msg.chartSymbol)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              TradingView
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Trade Plan Summary Table - PROMINENT AND CLEAR */}
                  {msg.symbol && msg.role === 'assistant' && msg.analysisData && !msg.isLoading && (
                    <div className={`mx-4 mt-4 p-4 rounded-xl border ${getDirectionColor(msg.analysisData.direction)}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-foreground uppercase tracking-wide">Trade Plan</span>
                        {msg.analysisData.direction && (
                          <Badge className={`text-xs px-2 py-0.5 ${
                            msg.analysisData.direction.toLowerCase().includes('buy') || msg.analysisData.direction.toLowerCase().includes('bull') || msg.analysisData.direction.toLowerCase().includes('long')
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : msg.analysisData.direction.toLowerCase().includes('sell') || msg.analysisData.direction.toLowerCase().includes('bear') || msg.analysisData.direction.toLowerCase().includes('short')
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {msg.analysisData.direction.toLowerCase().includes('buy') || msg.analysisData.direction.toLowerCase().includes('bull') || msg.analysisData.direction.toLowerCase().includes('long') ? (
                              <><ArrowUpCircle className="w-3 h-3 mr-1" />LONG</>
                            ) : msg.analysisData.direction.toLowerCase().includes('sell') || msg.analysisData.direction.toLowerCase().includes('bear') || msg.analysisData.direction.toLowerCase().includes('short') ? (
                              <><ArrowDownCircle className="w-3 h-3 mr-1" />SHORT</>
                            ) : (
                              'NEUTRAL'
                            )}
                          </Badge>
                        )}
                        {msg.analysisData.confidence && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-border/50">
                            {msg.analysisData.confidence}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Price</p>
                            <p className="text-sm font-bold text-blue-400">{msg.analysisData.entryPrice}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stop Loss</p>
                            <p className="text-sm font-bold text-red-400">{msg.analysisData.stopLoss}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Take Profit 1</p>
                            <p className="text-sm font-bold text-emerald-400">{msg.analysisData.takeProfit1}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="w-2 h-2 rounded-full bg-emerald-300" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Take Profit 2</p>
                            <p className="text-sm font-bold text-emerald-300">{msg.analysisData.takeProfit2}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="w-2 h-2 rounded-full bg-emerald-200" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Take Profit 3</p>
                            <p className="text-sm font-bold text-emerald-200">{msg.analysisData.takeProfit3}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20">
                          <DollarSign className="w-2 h-2 text-yellow-400" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk:Reward</p>
                            <p className="text-sm font-bold text-yellow-400">
                              {msg.analysisData.entryPrice !== 'N/A' && msg.analysisData.stopLoss !== 'N/A' && msg.analysisData.takeProfit1 !== 'N/A'
                                ? (() => {
                                    const entry = parseFloat(msg.analysisData.entryPrice.replace(/[^0-9.]/g, ''));
                                    const sl = parseFloat(msg.analysisData.stopLoss.replace(/[^0-9.]/g, ''));
                                    const tp = parseFloat(msg.analysisData.takeProfit1.replace(/[^0-9.]/g, ''));
                                    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && sl !== entry) {
                                      const risk = Math.abs(entry - sl);
                                      const reward = Math.abs(tp - entry);
                                      return `1:${(reward / risk).toFixed(1)}`;
                                    }
                                    return 'N/A';
                                  })()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REAL TradingView Chart - MUCH BIGGER */}
                  {msg.chartSymbol && msg.role === 'assistant' && !msg.isLoading && (
                    <div className="border-b border-border/50 bg-[#0a0e17]">
                      <div className="px-4 py-2 flex items-center justify-between bg-[#0d1117]">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Live Chart - TradingView
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2.5 text-[10px] text-muted-foreground hover:text-white hover:bg-white/10"
                          onClick={() => setShowChart(msg.chartSymbol ? { symbol: msg.symbol!, chartSymbol: msg.chartSymbol } : null)}
                        >
                          <Expand className="w-3 h-3 mr-1" />
                          Expand
                        </Button>
                      </div>
                      <div className="relative">
                        <TradingViewChart symbol={msg.chartSymbol} height={550} />
                      </div>
                    </div>
                  )}

                  {/* AI Analysis Text - LARGER AND CLEARER */}
                  <div className="p-5">
                    {msg.role === 'user' ? (
                      <p className="text-base text-foreground">{msg.content}</p>
                    ) : msg.content ? (
                      <div className="space-y-3">
                        {/* Toggle button for full analysis */}
                        <button
                          onClick={() => toggleAnalysis(msg.id)}
                          className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors w-full text-left"
                        >
                          <BarChart3 className="w-4 h-4" />
                          {"Detailed Analysis from 6 Trading Books"}
                          {expandedAnalysis[msg.id] ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </button>

                        <div className={`prose prose-invert max-w-none analysis-content transition-all duration-300 ${
                          expandedAnalysis[msg.id] ? '' : 'max-h-[500px] overflow-hidden relative'
                        }`}>
                          {/* Hide gradient when expanded */}
                          {!expandedAnalysis[msg.id] && (
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
                          )}
                          <div className="text-sm leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Chart Modal */}
      {showChart && (
        <div
          className="fixed inset-0 z-50 bg-[#0a0e17] flex flex-col animate-in fade-in duration-200"
          onClick={() => setShowChart(null)}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-[#0d1117]/90 backdrop-blur-sm flex-shrink-0">
            <span className="text-base font-medium text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
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
                Open in TradingView
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowChart(null); }}
              >
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <TradingViewChart symbol={showChart.chartSymbol} height={900} />
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
              placeholder={"Type a symbol or question... (e.g. Analyze BTC)"}
              className="min-h-[48px] max-h-[120px] resize-none bg-secondary border-border focus:border-emerald-500/50 placeholder:text-muted-foreground/50 text-base"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 p-0 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {"Analysis for educational purposes only, not financial advice"}
          </p>
          <span className="text-muted-foreground/20">|</span>
          <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            AI-Powered Analysis from 6 Books
          </p>
        </div>
      </div>
    </div>
  );
}
