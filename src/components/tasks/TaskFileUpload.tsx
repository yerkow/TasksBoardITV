import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Upload, X, FileText, File } from 'lucide-react';
// Firebase импорты удалены, так как проект использует собственный API сервер

interface TaskFileUploadProps {
  onUpload: (file: File | string) => Promise<void>;
  onCancel: () => void;
}

export const TaskFileUpload: React.FC<TaskFileUploadProps> = React.memo(({ onUpload, onCancel }) => {
  // Используем обычное состояние React для стабильного управления данными
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textReport, setTextReport] = useState<string>('');
  const [reportType, setReportType] = useState<string>('text');
  const [uploading, setUploading] = useState<boolean>(false);
  
  // Используем хук для определения мобильного устройства
  const isMobile = useIsMobile();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setReportType(value);
    // Данные сохраняются при переключении табов
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextReport(e.target.value);
  }, []);

  const handleUpload = async () => {
    if (uploading) return; // Предотвращаем множественные отправки
    
    setUploading(true);
    try {
      if (reportType === 'file' && selectedFile) {
        // Проверяем размер файла (максимум 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
          throw new Error("Размер файла не должен превышать 10MB");
        }
        // Передаем файл родительскому компоненту для обработки
        await onUpload(selectedFile);
      } else if (reportType === 'text' && textReport.trim()) {
        // Проверяем длину текстового отчета (максимум 5000 символов)
        if (textReport.length > 5000) {
          throw new Error("Текстовый отчет не должен превышать 5000 символов");
        }
        // Передаем текст родительскому компоненту для обработки
        await onUpload(textReport.trim());
      } else {
        throw new Error("Пожалуйста, выберите файл или введите текстовый отчет");
      }
      
      // Успешная загрузка - сбрасываем только использованные данные
      setUploading(false);
      if (reportType === 'file') {
        setSelectedFile(null);
        // Сбрасываем значение input файла
        const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else if (reportType === 'text') {
        setTextReport('');
      }
      
      // Автоматически закрываем компонент после успешной загрузки
      // Пользователь получит уведомление от родительского компонента
      onCancel();
    } catch (error) {
      console.error('Ошибка загрузки отчета:', error);
      setUploading(false);
      
      // Не очищаем поля при ошибке - пользователь может попробовать снова
      // Родительский компонент должен показать уведомление об ошибке
    }
  };

  // Focus management for mobile keyboards
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Auto-focus textarea when text tab is selected
    if (reportType === 'text' && textareaRef.current) {
      // Добавляем небольшую задержку для мобильных устройств
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [reportType]);

  return (
    <div className="w-full space-y-3 sm:space-y-4 relative">
      <button 
        onClick={onCancel}
        className="absolute right-0 top-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Close upload dialog"
        // Prevent default to avoid keyboard closing on mobile
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        type="button"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>
      
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-base sm:text-lg font-medium">Загрузить отчет</h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Выберите файл отчета или введите текстовый отчет
        </p>
      </div>
        
        <Tabs value={reportType} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
            <TabsTrigger value="text" className="text-sm sm:text-base py-2">Текстовый отчет</TabsTrigger>
            <TabsTrigger value="file" className="text-sm sm:text-base py-2">Файл</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="textReport" className="text-sm font-medium">Текст отчета</Label>
              <Textarea
                id="textReport"
                ref={textareaRef}
                value={textReport}
                onChange={handleTextChange}
                placeholder="Введите ваш отчет здесь..."
                className="w-full min-h-[120px] sm:min-h-[140px] resize-none"
                required
                // Mobile-specific attributes to prevent keyboard auto-closing
                onFocus={() => {
                  if (isMobile) {
                    // Add slight delay to ensure keyboard stays open
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }
                }}
                // Prevent input from losing focus on mobile
                onBlur={(e) => {
                  // Only refocus if the blur wasn't caused by clicking another element
                  if (isMobile && !e.relatedTarget) {
                    // Small delay to prevent keyboard flicker
                    setTimeout(() => {
                      if (textareaRef.current && document.activeElement !== textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 100);
                  }
                }}
                // Prevent keyboard from closing when scrolling on mobile
                onTouchStart={(e) => {
                  if (isMobile) {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="fileUpload" className="text-sm font-medium">Выберите файл</Label>
              <Input
                id="fileUpload"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                className="h-11 sm:h-10 text-base sm:text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {selectedFile && (
                <p className="text-xs sm:text-sm text-gray-600 break-all">
                  Выбран файл: {selectedFile.name}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          disabled={uploading}
          className="w-full sm:w-auto h-10 sm:h-9 text-sm font-medium"
        >
          Отмена
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={uploading || (!selectedFile && reportType === 'file') || (!textReport.trim() && reportType === 'text')}
          className="w-full sm:w-auto h-10 sm:h-9 text-sm font-medium"
        >
          {uploading ? 'Загрузка...' : 'Загрузить'}
        </Button>
      </div>
    </div>
  );
});

TaskFileUpload.displayName = 'TaskFileUpload';

export default TaskFileUpload;
