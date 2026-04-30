import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDFBuffer, summarizeText } from '@/lib/pdf-extractor';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF buffer directly (no filesystem needed)
    const text = await extractTextFromPDFBuffer(buffer);
    const summary = summarizeText(text, 12000);

    // Create course record
    const course = await db.course.create({
      data: {
        title: file.name.replace(/\.pdf$/i, ''),
        filename: file.name,
        content: text,
        summary: summary,
        fileSize: buffer.length,
        status: 'ready',
      }
    });

    return NextResponse.json({ 
      success: true, 
      course,
      textLength: text.length 
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
