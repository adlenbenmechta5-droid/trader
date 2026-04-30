import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDFBuffer, summarizeText } from '@/lib/pdf-extractor';

// In-memory fallback for courses when no database is available
let memoryCourses: Array<{
  id: string;
  title: string;
  filename: string;
  content: string;
  summary: string | null;
  fileSize: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}> = [];

async function getDB() {
  try {
    const { db } = await import('@/lib/db');
    return db;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Extract text from PDF buffer (no file system needed)
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDFBuffer(buffer);
    const summary = summarizeText(text, 12000);

    const database = await getDB();

    if (database) {
      try {
        const course = await database.course.create({
          data: {
            title: file.name.replace(/\.pdf$/i, ''),
            filename: file.name,
            content: text,
            summary: summary,
            fileSize: buffer.length,
            status: 'ready',
          }
        });
        return NextResponse.json({ success: true, course, textLength: text.length });
      } catch (dbError: any) {
        console.error('DB save failed, using memory:', dbError.message);
      }
    }

    // Fallback: store in memory
    const course = {
      id: `mem_${Date.now()}`,
      title: file.name.replace(/\.pdf$/i, ''),
      filename: file.name,
      content: text,
      summary: summary,
      fileSize: buffer.length,
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryCourses.push(course);

    return NextResponse.json({ success: true, course, textLength: text.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const database = await getDB();

    if (database) {
      try {
        const courses = await database.course.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ courses });
      } catch (dbError: any) {
        console.error('DB query failed, using memory:', dbError.message);
      }
    }

    return NextResponse.json({ courses: memoryCourses.reverse() });
  } catch (error: any) {
    console.error('Fetch courses error:', error);
    return NextResponse.json({ courses: memoryCourses.reverse() });
  }
}

export { memoryCourses };
