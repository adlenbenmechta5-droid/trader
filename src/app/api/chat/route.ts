import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/trading-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = body?.message;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await chatWithAgent(message.trim(), body?.history || []);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({
      response: 'عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.',
    });
  }
}
