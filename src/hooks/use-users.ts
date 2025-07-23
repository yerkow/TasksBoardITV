import { useState, useEffect } from 'react';
import { apiClient, User, mapRoleFromRussian } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Используем интерфейс User из api.ts
export type UserData = User;

export const useUsers = (role?: 'USER' | 'ADMIN' | 'BOSS') => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Роль уже в правильном формате для API
        let apiRole: string | undefined;
        if (role) {
          apiRole = role;
        }
        
        const usersData = await apiClient.getUsers(apiRole);
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Ошибка при загрузке пользователей');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, role]);

  return { users, loading, error };
};