import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RegisterFormProps {
  onRegister: (userData: any) => void;
  onBackToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onBackToLogin }) => {
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    patronymic: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        patronymic: formData.patronymic,
        role: "USER"
      });

      onRegister({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        patronymic: formData.patronymic,
        role: "USER",
      });

      toast({
        title: "Успешно!",
        description: "Регистрация завершена. Вы можете войти в систему.",
      });
    } catch (error: any) {
      let errorMessage = "Произошла ошибка при регистрации";
      
      if (error.message?.includes('email')) {
        errorMessage = "Этот email уже используется";
      }
      
      toast({
        title: "Ошибка регистрации",
        description: errorMessage,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <Button
        type="button"
        variant="ghost"
        onClick={onBackToLogin}
        className="mb-3 sm:mb-4 p-0 h-auto font-normal text-sm flex items-center min-h-[44px] sm:min-h-auto"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к входу
      </Button>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">Фамилия</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Иванов"
            className="h-11 sm:h-10 text-base sm:text-sm"
            required
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">Имя</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="Иван"
            className="h-11 sm:h-10 text-base sm:text-sm"
            required
          />
        </div>
      </div>
      
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="patronymic" className="text-sm font-medium">Отчество (необязательно)</Label>
        <Input
          id="patronymic"
          value={formData.patronymic}
          onChange={(e) => setFormData({...formData, patronymic: e.target.value})}
          placeholder="Иванович"
          className="h-11 sm:h-10 text-base sm:text-sm"
        />
      </div>
      
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="ivan@example.com"
          className="h-11 sm:h-10 text-base sm:text-sm"
          required
        />
      </div>
      
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="••••••••"
          className="h-11 sm:h-10 text-base sm:text-sm"
          required
        />
      </div>
      
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Подтвердите пароль</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          placeholder="••••••••"
          className="h-11 sm:h-10 text-base sm:text-sm"
          required
        />
      </div>
      
      <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium" disabled={loading}>
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
};

