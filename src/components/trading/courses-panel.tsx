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
      // Simulate progress
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-foreground">قاعدة المعرفة</h2>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              {courses.length} كتاب
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        {/* Upload Area */}
        {showUpload && (
          <div className="animate-slide-up">
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
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
                  <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs text-foreground font-medium">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">اسحب ملف PDF هنا أو اضغط للاختيار</p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-3 space-y-2">
                {isUploading && (
                  <Progress value={uploadProgress} className="h-1.5 bg-secondary" />
                )}
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      جاري التحميل والتحليل...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-1" />
                      رفع وتحليل الكتاب
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">لا توجد كتب مرفوعة</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">ارفع كتب PDF لتدريب الوكيل</p>
            </div>
          ) : (
            courses.map(course => (
              <Card key={course.id} className="bg-secondary/50 border-border/50 p-3 hover:border-emerald-500/20 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate" title={course.title}>
                      {course.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(course.fileSize)}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      {course.status === 'ready' ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          جاهز
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                          <Clock className="w-3 h-3" />
                          قيد المعالجة
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={() => handleDelete(course.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {courses.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>الوكيل يعتمد على {courses.length} كتاب كقاعدة معرفة</span>
          </div>
        </div>
      )}
    </div>
  );
}
