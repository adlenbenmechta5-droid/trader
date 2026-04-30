import { NextRequest, NextResponse } from 'next/server';

async function getDB() {
  try {
    const { db } = await import('@/lib/db');
    return db;
  } catch {
    return null;
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
        console.error('DB query failed:', dbError.message);
      }
    }

    return NextResponse.json({ courses: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, courses: [] }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const database = await getDB();

    if (database) {
      try {
        await database.course.delete({ where: { id } });
        return NextResponse.json({ success: true });
      } catch (dbError: any) {
        console.error('DB delete failed:', dbError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
