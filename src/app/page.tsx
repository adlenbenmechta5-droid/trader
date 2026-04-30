'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/trading/chat-panel';
import { CoursesPanel } from '@/components/trading/courses-panel';
import { TradingViewTicker } from '@/components/trading/trading-chart';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  BookOpen,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';

const TICKER_SYMBOLS = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:XRPUSDT',
  'BINANCE:BNBUSDT',
  'OANDA:XAUUSD',
  'FX:EURUSD',
  'FX:GBPUSD',
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'courses'>('courses');

  return (
    <div className="h-screen flex flex-col bg-[#0a0e17] overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-[#0d1117]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">TradeX AI</h1>
              <p className="text-[9px] text-muted-foreground -mt-0.5">Professional Trading Agent</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 ml-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400">متصل</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
            <BarChart3 className="w-3 h-3" />
            <span>AI-Powered Analysis</span>
          </div>
        </div>
      </header>

      {/* Ticker */}
      <TradingViewTicker symbols={TICKER_SYMBOLS} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={`border-l border-border bg-[#0d1117] flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">المكتبة</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setSidebarOpen(false)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CoursesPanel />
            </div>
          </div>
        </aside>

        {/* Toggle Sidebar Button */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2 z-10 h-8 w-8 p-0 text-muted-foreground hover:text-foreground bg-card/80 backdrop-blur-sm border border-border/50"
            onClick={() => setSidebarOpen(true)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel />
        </main>
      </div>
    </div>
  );
}
