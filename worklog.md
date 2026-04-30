---
Task ID: 1
Agent: Main Agent
Task: Fix chart display and trade plan image generation

Work Log:
- Analyzed existing code: chat-panel.tsx, trading-chart.tsx, trade-plan/route.ts, trading-agent.ts
- Fixed TradingView chart: changed from bottom panel (which had zero-height issue) to full-screen modal overlay with proper close button and TradingView link
- Updated TradingViewChart component: improved cleanup/teardown, added fullscreen support, fixed locale to 'en' for better compatibility
- Completely rewrote trade plan image generator: replaced agent-browser screenshot approach with professional SVG-based chart generation using sharp
- New trade plan features: 1200x700px high-quality image with simulated candlesticks, green profit zone box, red loss zone box, entry/SL/TP level lines, right panel with trade details, dark theme matching the app
- Verified both buy and sell directions generate correctly
- Removed old browser-screenshot based images

Stage Summary:
- Chart now opens as full-screen modal with TradingView widget properly loaded
- Trade plan images are now high-quality professional SVG charts (1200x700px) with clear green/red zones
- No more dependency on agent-browser for image generation
- Both API endpoints verified working: POST /api/trade-plan and GET /api/trade-plan/image
