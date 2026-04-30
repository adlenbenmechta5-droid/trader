'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  BookOpen,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  X,
  GraduationCap,
  Library,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

export function CoursesPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 300);

      const res = await fetch('/api/courses/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (data.success) {
        await fetchCourses();
        setSelectedFile(null);
        setShowUpload(false);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchCourses();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getBookEmoji = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('forex') || t.includes('black book')) return '📖';
    if (t.includes('harmonic')) return '📐';
    if (t.includes('trade') || t.includes('good')) return '📊';
    if (t.includes('model') || t.includes('personal')) return '📈';
    if (t.includes('viv') || t.includes('elder')) return '📉';
    if (t.includes('asia') || t.includes('session')) return '🌏';
    return '📚';
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <Library className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">قاعدة المعرفة</h2>
              <p className="text-[9px] text-muted-foreground -mt-0.5">Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-bold">
              {courses.length} كتاب
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Upload Area */}
        {showUpload && (
          <div className="mt-3 animate-slide-up">
            <div
              className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('pdf-upload')?.click()}
            >
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-7 h-7 text-emerald-400 mx-auto" />
                  <p className="text-xs text-foreground font-medium">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto" />
                  <p className="text-[10px] text-muted-foreground">اسحب ملف PDF هنا</p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-2 space-y-2">
                {isUploading && (
                  <Progress value={uploadProgress} className="h-1.5 bg-secondary" />
                )}
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                      جاري التحميل والتحليل...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 ml-1" />
                      رفع وتحليل الكتاب
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Courses List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground mb-1">لا توجد كتب مرفوعة</p>
              <p className="text-[10px] text-muted-foreground/50">ارفع كتب PDF لتدريب الوكيل</p>
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">
                  الوكيل يستخدم {courses.filter(c => c.status === 'ready').length} كتاب للتحليل
                </span>
              </div>

              {courses.map((course, index) => (
                <Card
                  key={course.id}
                  className="bg-secondary/30 border-border/40 p-2.5 hover:border-emerald-500/20 transition-all group cursor-pointer"
                  onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Book icon with number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-sm">
                      {getBookEmoji(course.title)}
                    </div>

                    {/* Book info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate leading-tight" title={course.title}>
                        {course.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-muted-foreground">{formatFileSize(course.fileSize)}</span>
                        {course.status === 'ready' ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium">
                            <CheckCircle className="w-2.5 h-2.5" />
                            جاهز للتحليل
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] text-yellow-400">
                            <Clock className="w-2.5 h-2.5" />
                            قيد المعالجة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {expandedCourse === course.id ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                        onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded info */}
                  {expandedCourse === course.id && (
                    <div className="mt-2 pt-2 border-t border-border/30 animate-slide-up">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-background/50 rounded-md p-1.5">
                          <span className="text-muted-foreground">اسم الملف:</span>
                          <p className="text-foreground truncate mt-0.5" title={course.filename}>{course.filename}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-1.5">
                          <span className="text-muted-foreground">الحالة:</span>
                          <p className="text-emerald-400 font-medium mt-0.5">
                            {course.status === 'ready' ? 'مفعّل' : 'قيد المعالجة'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <GraduationCap className="w-3 h-3 text-emerald-400" />
                        <span>هذا الكتاب يُستخدم كمرجع في كل تحليل</span>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {courses.length > 0 && (
        <div className="p-3 border-t border-border/50 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-[10px] text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span className="font-medium">
              {courses.filter(c => c.status === 'ready').length} كتاب نشط في قاعدة المعرفة
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
