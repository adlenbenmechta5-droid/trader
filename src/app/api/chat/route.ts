import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/trading-agent';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use the SDK-based chatWithAgent function (uses z-ai-web-dev-sdk)
    const response = await chatWithAgent(message, history || []);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
