import type { Course } from './types';

// Static courses data embedded in the bundle
import coursesData from '@/data/courses.json';

let courses: Course[] = coursesData as Course[];

export function getCourses(): Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return courses.find(c => c.id === id);
}

export function addCourse(course: Course): void {
  courses.unshift(course);
}

export function deleteCourse(id: string): boolean {
  const index = courses.findIndex(c => c.id === id);
  if (index >= 0) {
    courses.splice(index, 1);
    return true;
  }
  return false;
}

export function getKnowledgeText(): string {
  const readyCourses = courses.filter(c => c.status === 'ready');
  if (readyCourses.length === 0) return '';

  let knowledge = '## الكتب والكورسات التي درستها:\n\n';
  for (const course of readyCourses) {
    knowledge += `### 📚 ${course.title}\n`;
    knowledge += `${course.summary || 'ملخص غير متوفر'}\n\n`;
  }
  return knowledge;
}
