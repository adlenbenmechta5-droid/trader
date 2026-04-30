import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDFBuffer, summarizeText } from '@/lib/pdf-extractor';
import { addCourse, getCourses } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDFBuffer(buffer);
    const summary = summarizeText(text, 12000);

    const course = {
      id: `course_${Date.now()}`,
      title: file.name.replace(/\.pdf$/i, ''),
      filename: file.name,
      summary: summary,
      fileSize: buffer.length,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    addCourse(course);

    return NextResponse.json({ success: true, course, textLength: text.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const courses = getCourses();
    return NextResponse.json({ courses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, courses: [] });
  }
}
