import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeText } from '@/lib/store';

const ZAI_BASE_URL = 'http://172.25.136.193:8080/v1';
const ZAI_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer Z.ai',
  'X-Z-AI-From': 'Z',
  'X-Chat-Id': 'chat-c892de0c-9f7e-4b5d-8ea7-0a756ab73646',
  'X-User-Id': 'ed5bfcf5-d208-4418-b935-e29322b9d6ae',
  'X-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWQ1YmZjZjUtZDIwOC00NDE4LWI5MzUtZTI5MzIyYjlkNmFlIiwiY2hhdF9pZCI6ImNoYXQtYzg5MmRlMGMtOWY3ZS00YjVkLThlYTctMGE3NTZhYjczNjQ2IiwicGxhdGZvcm0iOiJ6YWkifQ.9iPQ17tAEFwZ8DOkoLJav-rj5TrpxtUStHOEwkTp6Qo',
};

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const knowledge = getKnowledgeText();
    const systemMessage = `أنت وكيل تداول محترف متخصص في العملات الرقمية والفوركس. درست 6 كتب متخصصة. أجب بالعربية مع المصطلحات الإنجليزية بين قوسين.
${knowledge ? `معرفتك من الكتب:\n${knowledge.substring(0, 2000)}` : ''}`;

    const messages = [
      { role: 'system', content: systemMessage },
      ...(history || []).slice(-10),
      { role: 'user', content: message }
    ];

    const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: ZAI_HEADERS,
      body: JSON.stringify({
        model: 'default',
        messages,
        temperature: 0.7,
        thinking: { type: 'disabled' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const response = data.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك.';

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
