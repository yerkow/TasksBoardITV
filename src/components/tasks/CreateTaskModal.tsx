
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";
import { ClipboardList, Calendar, Flag, User, CheckCircle2, X } from "lucide-react";

interface CreateTaskModalProps {
  onClose: () => void;
  onSubmit: (taskData: any) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onSubmit }) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '',
    deadline: '',
    assigneeId: '',
    assigneeName: ''
  });

  // Получаем список пользователей с ролью 'USER'
  const { users, loading } = useUsers('USER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description && formData.priority && formData.deadline && formData.assigneeId) {
      const success = await onSubmit(formData);
      if (success) {
        setFormData({
          title: '',
          description: '',
          priority: '',
          deadline: '',
          assigneeId: '',
          assigneeName: ''
        });
        onClose();
      }
    } else {
      alert('Пожалуйста, заполните все обязательные поля');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssigneeChange = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      const fullName = `${selectedUser.lastName} ${selectedUser.firstName}${selectedUser.patronymic ? ' ' + selectedUser.patronymic : ''}`;
      setFormData(prev => ({
        ...prev,
        assigneeId: userId,
        assigneeName: fullName
      }));
    }
  };

  return (
    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">Создать новую задачу</DialogTitle>
        <DialogDescription className="text-sm sm:text-base">
          Заполните информацию о новой задаче
        </DialogDescription>
      </DialogHeader>
        
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm sm:text-base font-medium">Название задачи</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Введите название задачи"
              required
              className="mt-2 h-12 sm:h-10 text-base sm:text-sm"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="description" className="text-sm sm:text-base font-medium">Описание</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Введите описание задачи"
            rows={4}
            className="mt-2 text-base sm:text-sm min-h-[100px]"
          />
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority" className="text-sm sm:text-base font-medium">Приоритет</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="mt-2 h-12 sm:h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Выберите приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="низкий">Низкий</SelectItem>
                  <SelectItem value="средний">Средний</SelectItem>
                  <SelectItem value="высокий">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deadline" className="text-sm sm:text-base font-medium">Срок выполнения</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
                className="mt-2 h-12 sm:h-10 text-base sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="assignee" className="text-sm sm:text-base font-medium">Исполнитель</Label>
            <Select value={formData.assigneeId} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="mt-2 h-12 sm:h-10 text-base sm:text-sm">
                <SelectValue placeholder="Выберите исполнителя" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.lastName} {user.firstName}{user.patronymic ? ' ' + user.patronymic : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
            size="lg"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto order-1 sm:order-2"
            size="lg"
          >
            Создать задачу
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
  );
};
