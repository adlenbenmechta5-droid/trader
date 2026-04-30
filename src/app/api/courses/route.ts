import { NextResponse } from 'next/server';
import { getCourses, deleteCourse } from '@/lib/store';

export async function GET() {
  try {
    const courses = getCourses();
    return NextResponse.json({ courses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, courses: [] }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    deleteCourse(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
