import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF, summarizeText } from '@/lib/pdf-extractor';
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

    // Save file to upload directory
    const uploadDir = path.join(process.cwd(), 'upload');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Extract text from PDF
    const text = await extractTextFromPDF(filePath);
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
