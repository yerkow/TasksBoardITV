import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from '@/utils/notifications';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, AlertCircle, CheckCircle, Play, Upload, Download, Check, X, FileText, Flag } from 'lucide-react';
import { TaskFileUpload } from './TaskFileUpload';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from '@/hooks/use-tasks';
import { Task } from '@/lib/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface KanbanBoardProps {
  tasks: Task[];
  userRole: string;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  uploadTaskFile?: (taskId: string, file?: File, comment?: string, textContent?: string) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  userRole, 
  onUpdateTask, 
  uploadTaskFile
}) => {
  const [uploadModalData, setUploadModalData] = React.useState<{taskId: string; isOpen: boolean} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { playSuccessSound, playNewTaskSound, showNotification } = useNotifications();
  const { resumePolling } = useTasks();
  
  // Используем переданные функции или заглушки
  const safeUploadTaskFile = uploadTaskFile || (() => Promise.resolve());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'высокий': return 'destructive';
      case 'средний': return 'default';
      case 'низкий': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'назначено': return 'secondary';
      case 'в работе': return 'default';
      case 'на проверке': return 'outline';
      case 'выполнено': return 'outline';
      case 'доработка': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'назначено': return <Clock className="h-4 w-4" />;
      case 'в работе': return <Play className="h-4 w-4" />;
      case 'на проверке': return <Upload className="h-4 w-4" />;
      case 'выполнено': return <CheckCircle className="h-4 w-4" />;
      case 'доработка': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleTakeTask = useCallback((taskId: string) => {
    if (!user) return;
    
    // Обновляем статус и назначаем текущего пользователя исполнителем
    onUpdateTask(taskId, { 
      status: 'в работе',
      assigneeId: user.id,
      assigneeName: `${user.lastName} ${user.firstName}${user.patronymic ? ' ' + user.patronymic : ''}` 
    });
    
    toast({
      title: "Задача взята в работу",
      description: "Вы можете приступить к выполнению задачи"
    });
  }, [user, onUpdateTask, toast]);

  const handleUploadReport = useCallback(async (taskId: string, fileOrText: File | string, comment?: string) => {
    try {
      // Показываем индикатор загрузки
      toast({
        title: "Загрузка отчета",
        description: "Отчет загружается на сервер..."
      });
      
      if (typeof fileOrText === 'string') {
        // Обрабатываем текстовый отчет через API
        await safeUploadTaskFile(taskId, undefined, comment, fileOrText);
      } else {
        // Обрабатываем файл через API
        await safeUploadTaskFile(taskId, fileOrText, comment);
      }
      
      // Статус задачи обновляется автоматически на сервере
      
      // Не закрываем модальное окно автоматически - пусть пользователь сам решит когда закрыть
      // Это предотвратит потерю данных при случайном закрытии
      // setUploadModalData(null);
      
      toast({
        title: "Отчёт загружен",
        description: "Задача отправлена на проверку начальнику",
        duration: 5000
      });
      
      // Воспроизводим звук успешной загрузки
      playSuccessSound();
      
      // Задачи обновятся автоматически через polling
      
    } catch (error) {
      console.error('Error uploading report:', error);
      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось загрузить отчет",
        variant: "destructive",
        duration: 5000
      });
      
      // В случае ошибки не закрываем модальное окно, чтобы пользователь мог попробовать снова
      throw error; // Пробрасываем ошибку дальше
    }
  }, [safeUploadTaskFile, toast, playSuccessSound]);

  const [showTextReport, setShowTextReport] = React.useState<Task | null>(null);

  // Фильтрация задач по статусам будет выполнена ниже с учетом роли пользователя

  const handleDownloadReport = async (task: Task) => {
    if (task.reportFile) {
      try {
        const isTextReport = task.reportFile.isTextReport;
        
        if (isTextReport) {
          // Для текстовых отчетов открываем модальное окно
          setShowTextReport(task);
          
          toast({
            title: "Отчет открыт",
            description: "Текстовый отчет открыт"
          });
        } else {
          // Для файлов используем правильный URL с сервера
          toast({
            title: "Подготовка к скачиванию",
            description: `Подготовка файла ${task.reportFile.name}`
          });
          
          // Формируем правильный URL для скачивания, используя ту же логику что и в api.ts
          const currentHost = window.location.hostname;
          const currentProtocol = window.location.protocol;
          
          let API_BASE_URL;
          if (currentProtocol === 'https:') {
            API_BASE_URL = `https://${currentHost}:3002/api`;
          } else if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
            API_BASE_URL = `https://${currentHost}:3002/api`;
          } else if (import.meta.env.VITE_API_URL) {
            API_BASE_URL = import.meta.env.VITE_API_URL;
          } else {
            API_BASE_URL = 'https://localhost:3002/api';
          }
          
          const downloadUrl = `${API_BASE_URL}/tasks/${task.id}/download`;
          
          // Используем fetch для получения файла с правильными заголовками
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Получаем blob из ответа
          const blob = await response.blob();
          
          // Создаем URL для blob и скачиваем
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = task.reportFile.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Освобождаем память
          window.URL.revokeObjectURL(blobUrl);
          
          toast({
            title: "Файл скачан",
            description: `Файл ${task.reportFile.name} успешно скачан`
          });
        }
      } catch (error) {
        // Обработка ошибок
        console.error('Ошибка при скачивании отчета:', error);
        toast({
          title: "Ошибка скачивания",
          description: "Не удалось скачать отчет: " + (error instanceof Error ? error.message : 'Неизвестная ошибка'),
          variant: "destructive"
        });
      }
    }
  };

  const handleApproveTask = useCallback((taskId: string) => {
    onUpdateTask(taskId, { status: 'выполнено' });
    
    toast({
      title: "Задача принята",
      description: "Отчёт одобрен, задача завершена"
    });
  }, [onUpdateTask, toast]);

  const handleRejectTask = useCallback((taskId: string) => {
    onUpdateTask(taskId, { status: 'доработка' });
    
    toast({
      title: "Задача отклонена",
      description: "Задача возвращена исполнителю на доработку"
    });
  }, [onUpdateTask, toast]);

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  // Фильтрация задач в зависимости от роли
  const { user: currentUser } = useAuth();
  
  // Мемоизируем фильтрацию задач
  const filteredTasks = useMemo(() => {
    return userRole === 'USER' 
      ? tasks.filter(task => task.assigneeId === currentUser?.id)
      : tasks;
  }, [tasks, userRole, currentUser?.id]);

  // Мемоизируем группировку задач по статусам
  const { assignedTasks, inProgressTasks, completedTasks } = useMemo(() => {
    return {
      assignedTasks: filteredTasks.filter(task => task.status === 'назначено'),
      inProgressTasks: filteredTasks.filter(task => 
        task.status === 'в работе' || task.status === 'доработка'),
      completedTasks: filteredTasks.filter(task => 
        task.status === 'на проверке' || task.status === 'выполнено')
    };
  }, [filteredTasks]);

  const [activeTab, setActiveTab] = React.useState('assigned');

  // Мемоизированный компонент для отображения карточки задачи
  const TaskCard = React.memo(({ task }: { task: Task }) => {
    
    return (
      <Card key={task.id} className="mb-3 sm:mb-4 hover:shadow-md transition-all duration-300 group overflow-hidden border-l-4 touch-manipulation" style={{
        borderLeftColor: 
          task.priority === 'высокий' ? '#ef4444' : 
          task.priority === 'средний' ? '#f59e0b' : '#10b981'
      }}>
        <div className="absolute right-0 top-0 h-16 w-16 sm:h-24 sm:w-24 opacity-5 transform translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 group-hover:opacity-10 transition-opacity">
          {getStatusIcon(task.status)}
        </div>
        <CardHeader className={`${isMobile ? 'pb-2 pt-4 px-4' : 'pb-1 pt-3 px-3'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className={`${isMobile ? 'text-base leading-6' : 'text-base'} mb-2 flex items-center gap-2 group-hover:text-blue-700 transition-colors`}>
                {task.title}
                {isOverdue(task.deadline) && task.status !== 'выполнено' && (
                  <AlertCircle className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-red-500 animate-pulse`} />
                )}
              </CardTitle>
              <p className={`text-gray-600 ${isMobile ? 'text-sm leading-relaxed' : 'text-xs leading-relaxed'}`}>{task.description}</p>
              {task.reportFile && (
                <div className={`${isMobile ? 'mt-3 p-3' : 'mt-2 p-2'} bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200 shadow-sm`}>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-blue-700 flex items-center gap-2 flex-wrap`}>
                    <Upload className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} flex-shrink-0`} />
                    {task.reportFile.isTextReport ? (
                      <>Прикреплён текстовый отчет</>
                    ) : (
                      <>
                        <span className="whitespace-nowrap">Прикреплён файл:</span> 
                        <span className="font-medium truncate max-w-[150px]">{task.reportFile.name}</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center">
              <Badge variant={getPriorityColor(task.priority)} className={`shadow-sm ${isMobile ? 'text-sm px-3 py-1' : 'text-xs'} whitespace-nowrap`}>
                {task.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`${isMobile ? 'pt-0 pb-4 px-4' : 'pt-0 pb-3 px-3'}`}>
          <div className={`flex flex-col ${isMobile ? 'gap-4' : 'gap-3'}`}>
            <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'text-sm' : 'text-xs'} text-gray-600`}>
              <div className={`flex items-center ${isMobile ? 'gap-2 bg-gray-50 px-3 py-2' : 'gap-1.5 bg-gray-50 px-2 py-1'} rounded-full shadow-sm`}>
                <User className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-500 flex-shrink-0`} />
                <span className="font-medium truncate max-w-[120px]">{task.assigneeName}</span>
              </div>
              <div className={`flex items-center ${isMobile ? 'gap-2 bg-gray-50 px-3 py-2' : 'gap-1.5 bg-gray-50 px-2 py-1'} rounded-full shadow-sm`}>
                <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-500 flex-shrink-0`} />
                <span className="whitespace-nowrap">
                  до {new Date(task.deadline).toLocaleDateString('ru-RU')}
                  {isOverdue(task.deadline) && task.status !== 'выполнено' && (
                    <span className="text-red-500 ml-1 font-medium">(просрочено)</span>
                  )}
                </span>
              </div>
            </div>
            
            {/* Action buttons for employee */}
            {userRole === 'USER' && (
              <div className={`flex flex-wrap ${isMobile ? 'gap-3' : 'gap-2'}`}>
                {task.status === 'назначено' && (
                  <Button 
                    size={isMobile ? "default" : "sm"}
                    onClick={() => handleTakeTask(task.id)}
                    className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                  >
                    <Play className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1'} flex-shrink-0`} />
                    <span className="truncate">Взять в работу</span>
                  </Button>
                )}
                {task.status === 'в работе' && (
                  <Button 
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={() => setUploadModalData({taskId: task.id, isOpen: true})}
                    className={`flex items-center gap-1 border-blue-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm hover:shadow transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                  >
                    <Upload className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-500 flex-shrink-0`} />
                    <span className="truncate">Загрузить отчет</span>
                  </Button>
                )}
                {task.status === 'доработка' && (
                  <Button 
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={() => setUploadModalData({taskId: task.id, isOpen: true})}
                    className={`flex items-center gap-1 border-amber-200 hover:border-amber-400 hover:bg-amber-50 shadow-sm hover:shadow transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                  >
                    <Upload className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-amber-500 flex-shrink-0`} />
                    <span className="truncate">Исправить отчет</span>
                  </Button>
                )}
                {(task.status === 'на проверке' || task.status === 'выполнено') && task.reportFile && (
                  <Button 
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={() => handleDownloadReport(task)}
                    className={`flex items-center gap-1 border-blue-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm hover:shadow transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                  >
                    <Download className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-500 flex-shrink-0`} />
                    <span className="truncate">
                      {task.reportFile.isTextReport ? 'Просмотреть отчет' : 'Скачать файл'}
                    </span>
                  </Button>
                )}
              </div>
            )}
            
            {/* Action buttons for boss */}
            {(userRole === 'BOSS' || userRole === 'ADMIN') && (
              <div className={`flex flex-wrap ${isMobile ? 'gap-3' : 'gap-2'}`}>
                {task.status === 'на проверке' && task.reportFile && (
                  <>
                    <Button 
                      size={isMobile ? "default" : "sm"}
                      variant="outline"
                      onClick={() => handleDownloadReport(task)}
                      className={`flex items-center gap-1 border-blue-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm hover:shadow transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                    >
                      <Download className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-500 flex-shrink-0`} />
                      <span className="truncate">
                        {task.reportFile.isTextReport ? 'Просмотреть' : 'Скачать файл'}
                      </span>
                    </Button>
                    <Button 
                      size={isMobile ? "default" : "sm"}
                      onClick={() => handleApproveTask(task.id)}
                      className={`flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                    >
                      <Check className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} flex-shrink-0`} />
                      <span className="truncate">Принять</span>
                    </Button>
                    <Button 
                      size={isMobile ? "default" : "sm"}
                      variant="destructive"
                      onClick={() => handleRejectTask(task.id)}
                      className={`flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                    >
                      <X className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} flex-shrink-0`} />
                      <span className="truncate">Отклонить</span>
                    </Button>
                  </>
                )}
                {task.status === 'выполнено' && task.reportFile && (
                  <Button 
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={() => handleDownloadReport(task)}
                    className={`flex items-center gap-1 border-green-200 hover:border-green-400 hover:bg-green-50 shadow-sm hover:shadow transition-all duration-200 ${isMobile ? 'text-sm h-11 min-h-[44px]' : 'text-xs h-8'} w-full sm:w-auto touch-manipulation`}
                  >
                    <Download className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-green-500 flex-shrink-0`} />
                    <span className="truncate">
                      {task.reportFile.isTextReport ? 'Просмотреть отчет' : 'Скачать файл'}
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
          

        </CardContent>
      </Card>
    );  // Закрывающая скобка для компонента TaskCard
  });
    
    // Функция для получения текстового содержимого отчета
    const getTextReportContent = (reportFile: any): string => {
      try {
        // Если это текстовый отчет с полем content
        if (reportFile.content) {
          return reportFile.content;
        }
        
        // Если это старый формат с Base64 в url
        if (reportFile.url && typeof reportFile.url === 'string') {
          // Проверяем, является ли это data URL
          if (reportFile.url.startsWith('data:')) {
            const base64Part = reportFile.url.split(',')[1];
            if (!base64Part) {
              throw new Error('Неверный формат data URL');
            }
            
            // Декодируем base64 в бинарные данные
            const binaryString = atob(base64Part);
            
            // Преобразуем бинарную строку в Uint8Array
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Декодируем UTF-8
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(bytes);
          }
        }
        
        throw new Error('Не найдено содержимое текстового отчета');
      } catch (error) {
        console.error('Ошибка получения текста отчета:', error);
        return 'Ошибка при получении содержимого отчета';
      }
    };



    // Компонент для отображения содержимого колонки
    const ColumnContent = ({ 
      tasks, 
      emptyIcon, 
      emptyText 
    }: { 
      tasks: Task[], 
      emptyIcon: React.ReactNode, 
      emptyText: string 
    }) => (
      <div className="space-y-3 overflow-y-auto pr-1 pb-2 max-h-[calc(100vh-180px)]">
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <div className="mx-auto mb-2 text-gray-400">{emptyIcon}</div>
            <p>{emptyText}</p>
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    );

    return (
      <>
        {/* Global File Upload Modal */}
        {uploadModalData?.isOpen && (
          <Dialog open={uploadModalData.isOpen} onOpenChange={() => setUploadModalData(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Загрузить отчет</DialogTitle>
                <DialogDescription>
                  Загрузите файл или введите текстовый отчет для задачи
                </DialogDescription>
              </DialogHeader>
              <TaskFileUpload
                 key={`stable-upload-${uploadModalData.taskId}`}
                 onUpload={async (fileOrText) => {
                   try {
                     await handleUploadReport(uploadModalData.taskId, fileOrText);
                   } catch (error) {
                     console.error('Upload error:', error);
                     // Модал останется открытым при ошибке
                   }
                 }}
                 onCancel={() => setUploadModalData(null)}
               />
            </DialogContent>
          </Dialog>
        )}

        {/* Модальное окно для отображения текстового отчета */}
        {showTextReport && showTextReport.reportFile && (
          <Dialog open={!!showTextReport} onOpenChange={() => {
            setShowTextReport(null);
            resumePolling();
          }}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="break-words">
                    Текстовый отчет по задаче "{showTextReport.title}"
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Содержимое текстового отчета для задачи
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 p-3 sm:p-4 bg-gray-50 border rounded-md whitespace-pre-wrap text-xs sm:text-sm overflow-x-auto">
                {showTextReport.reportFile?.isTextReport ? 
                  getTextReportContent(showTextReport.reportFile) : 
                  'Отчет недоступен'
                }
              </div>
              
              <DialogFooter className="mt-4 flex justify-center sm:justify-end">
                <Button 
                  onClick={() => setShowTextReport(null)} 
                  className="w-full sm:w-auto"
                >
                  Закрыть
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Мобильная версия с табами */}
        {isMobile ? (
          <div className="w-full max-w-full overflow-hidden px-1">
            <Tabs defaultValue="assigned" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full mb-4 sticky top-0 z-10 bg-background h-12 rounded-lg p-1">
                <TabsTrigger value="assigned" className="flex items-center gap-1.5 px-2 py-2.5 text-sm min-h-[44px] touch-manipulation">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Назначено</span>
                  <Badge variant="outline" className="ml-1 flex-shrink-0 text-xs px-1.5 py-0.5">{assignedTasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inProgress" className="flex items-center gap-1.5 px-2 py-2.5 text-sm min-h-[44px] touch-manipulation">
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">В работе</span>
                  <Badge variant="outline" className="ml-1 flex-shrink-0 text-xs px-1.5 py-0.5">{inProgressTasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-1.5 px-2 py-2.5 text-sm min-h-[44px] touch-manipulation">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Завершено</span>
                  <Badge variant="outline" className="ml-1 flex-shrink-0 text-xs px-1.5 py-0.5">{completedTasks.length}</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="assigned" className="w-full mt-0">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-inner">
                  <div className="space-y-4">
                    {assignedTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-base">Нет назначенных задач</p>
                      </div>
                    ) : (
                      assignedTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="inProgress" className="w-full mt-0">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 shadow-inner">
                  <div className="space-y-4">
                    {inProgressTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-base">Нет задач в работе</p>
                      </div>
                    ) : (
                      inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="completed" className="w-full mt-0">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-inner">
                  <div className="space-y-4">
                    {completedTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-base">Нет завершенных задач</p>
                      </div>
                    ) : (
                      completedTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Десктопная версия с колонками */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {/* Колонка "Назначенные" */}
            <div className="bg-gray-50 rounded-lg p-4 lg:p-5 border border-gray-200 shadow-inner">
              <div className="flex items-center gap-2 lg:gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold truncate">Назначенные</h3>
                <Badge variant="outline" className="ml-auto bg-blue-50 text-sm lg:text-base px-2 py-1 flex-shrink-0">{assignedTasks.length}</Badge>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {assignedTasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Нет назначенных задач</p>
                  </div>
                ) : (
                  assignedTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>

            {/* Колонка "В работе" */}
            <div className="bg-amber-50 rounded-lg p-4 lg:p-5 border border-amber-200 shadow-inner">
              <div className="flex items-center gap-2 lg:gap-3 mb-4">
                <div className="bg-amber-100 p-2 rounded-full">
                  <Play className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold truncate">В работе</h3>
                <Badge variant="outline" className="ml-auto bg-amber-50 text-sm lg:text-base px-2 py-1 flex-shrink-0">{inProgressTasks.length}</Badge>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Play className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Нет задач в работе</p>
                  </div>
                ) : (
                  inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>

            {/* Колонка "Завершенные" */}
            <div className="bg-green-50 rounded-lg p-4 lg:p-5 border border-green-200 shadow-inner">
              <div className="flex items-center gap-2 lg:gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold truncate">Завершенные</h3>
                <Badge variant="outline" className="ml-auto bg-green-50 text-sm lg:text-base px-2 py-1 flex-shrink-0">{completedTasks.length}</Badge>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Нет завершенных задач</p>
                  </div>
                ) : (
                  completedTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
};


export default KanbanBoard;