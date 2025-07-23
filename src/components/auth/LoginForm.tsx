import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onLogin: (userData: any) => void;
  onRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onRegister }) => {
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      onLogin({ email });
    } catch (error: any) {
      let errorMessage = "Произошла ошибка при входе";
      
      if (error.message?.includes('credential') || error.message?.includes('password')) {
        errorMessage = "Неверный email или пароль";
      } else if (error.message?.includes('requests')) {
        errorMessage = "Слишком много попыток входа. Попробуйте позже";
      }
      
      toast({
        title: "Ошибка входа",
        description: errorMessage,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Введите ваш email"
          className="h-11 sm:h-10 text-base sm:text-sm"
          required
        />
      </div>
      
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Введите ваш пароль"
          className="h-11 sm:h-10 text-base sm:text-sm"
          required
        />
      </div>
      
      <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium" disabled={loading}>
        {loading ? 'Вход...' : 'Войти'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      
      <div className="text-center pt-2">
        <Button
          type="button"
          variant="link"
          onClick={onRegister}
          className="text-sm h-auto p-0 font-normal"
        >
          Нет аккаунта? Зарегистрироваться
        </Button>
      </div>
    </form>
  );
};
