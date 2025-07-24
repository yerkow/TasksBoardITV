// Определяем базовый URL API
const API_BASE_URL = (() => {
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  // Логирование для отладки
  console.log("🔍 Определение API URL:");
  console.log("- Текущий хост:", currentHost);
  console.log("- Текущий протокол:", currentProtocol);
  console.log("- VITE_API_URL:", import.meta.env.VITE_API_URL);

  // Если фронтенд работает по HTTPS, используем HTTPS для API
  if (currentProtocol === "https:") {
    const apiUrl = `https://${currentHost}/api`;
    console.log("- Используем HTTPS для API:", apiUrl);
    return apiUrl;
  }

  // Если запрос идет с IP-адреса (не localhost), используем тот же IP для API с HTTPS
  if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
    const apiUrl = `https://${currentHost}/api`;
    console.log("- Используем IP-адрес для API (HTTPS):", apiUrl);
    return apiUrl;
  }

  // Если задан через переменную окружения, используем его
  if (import.meta.env.VITE_API_URL) {
    console.log("- Используем VITE_API_URL:", import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // По умолчанию используем localhost с HTTPS
  const defaultUrl = "https://tasks.abai-it.kz/api";
  console.log("- Используем по умолчанию (HTTPS):", defaultUrl);
  return defaultUrl;
})();

console.log("🌐 Итоговый API_BASE_URL:", API_BASE_URL);

import {
  TaskStatus,
  TaskPriority,
  UserRole,
  TaskStatusEn,
  TaskPriorityEn,
  UserRoleEn,
  TaskStatusRu,
  TaskPriorityRu,
  UserRoleRu,
  isRussianStatus,
  isRussianPriority,
} from "./types";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  reportFile?: {
    name: string;
    url: string;
    uploadedAt: string;
    size?: number;
    comment?: string;
    isTextReport?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  creator?: User | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getFormDataHeaders(): HeadersInit {
    const token = localStorage.getItem("authToken");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log("🔄 Обработка ответа:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("❌ Ошибка от сервера:", errorData);
      } catch (e) {
        errorData = { message: "Неизвестная ошибка" };
        console.error("❌ Не удалось распарсить ошибку:", e);
      }
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    try {
      const data = await response.json();
      console.log("✅ Успешный ответ получен");
      return data;
    } catch (e) {
      console.error("❌ Ошибка парсинга JSON:", e);
      throw new Error("Ошибка обработки ответа сервера");
    }
  }

  // === AUTH METHODS ===

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    patronymic?: string;
    role?: string;
  }): Promise<AuthResponse> {
    console.log("📝 Попытка регистрации:", {
      email: userData.email,
      apiUrl: `${API_BASE_URL}/auth/register`,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      console.log(
        "📝 Ответ сервера на регистрацию:",
        response.status,
        response.statusText,
      );

      return this.handleResponse<AuthResponse>(response);
    } catch (error) {
      console.error("❌ Ошибка при регистрации:", error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    console.log("🔐 Попытка входа:", {
      email,
      apiUrl: `${API_BASE_URL}/auth/login`,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log(
        "🔐 Ответ сервера на вход:",
        response.status,
        response.statusText,
      );

      return this.handleResponse<AuthResponse>(response);
    } catch (error) {
      console.error("❌ Ошибка при входе:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<User>(response);
  }

  // === USER METHODS ===

  async getUsers(role?: string): Promise<User[]> {
    const url = new URL(`${API_BASE_URL}/users`);
    if (role) {
      url.searchParams.append("role", role);
    }

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<User[]>(response);
  }

  // === TASK METHODS ===

  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<Task[]>(response);
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    deadline?: string;
    assigneeId?: string;
    assigneeName?: string;
  }): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });

    return this.handleResponse<Task>(response);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    return this.handleResponse<Task>(response);
  }

  async deleteTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async uploadTaskFile(
    taskId: string,
    file?: File,
    comment?: string,
    textContent?: string,
  ): Promise<{ task: Task; fileUrl: string }> {
    const formData = new FormData();

    if (textContent) {
      // Текстовый отчет
      formData.append("reportType", "text");
      formData.append("textContent", textContent);
    } else if (file) {
      // Файловый отчет
      formData.append("reportType", "file");
      formData.append("file", file);
    } else {
      throw new Error(
        "Необходимо предоставить либо файл, либо текстовый контент",
      );
    }

    if (comment) {
      formData.append("comment", comment);
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/upload`, {
      method: "POST",
      headers: this.getFormDataHeaders(),
      body: formData,
    });

    return this.handleResponse<{ task: Task; fileUrl: string }>(response);
  }

  // === UTILITY METHODS ===

  setAuthToken(token: string): void {
    localStorage.setItem("authToken", token);
  }

  removeAuthToken(): void {
    localStorage.removeItem("authToken");
  }

  getAuthToken(): string | null {
    return localStorage.getItem("authToken");
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export const apiClient = new ApiClient();

// Утилиты для преобразования данных с улучшенной типизацией
export const mapStatusToRussian = (status: TaskStatusEn): TaskStatusRu => {
  const statusMap: Record<TaskStatusEn, TaskStatusRu> = {
    ASSIGNED: "назначено",
    IN_PROGRESS: "в работе",
    UNDER_REVIEW: "на проверке",
    COMPLETED: "выполнено",
    REVISION: "доработка",
  };
  return statusMap[status];
};

export const mapStatusFromRussian = (status: TaskStatus): TaskStatusEn => {
  if (isRussianStatus(status)) {
    const statusMap: Record<TaskStatusRu, TaskStatusEn> = {
      назначено: "ASSIGNED",
      "в работе": "IN_PROGRESS",
      "на проверке": "UNDER_REVIEW",
      выполнено: "COMPLETED",
      доработка: "REVISION",
    };
    return statusMap[status];
  }
  return status as TaskStatusEn;
};

export const mapPriorityToRussian = (
  priority: TaskPriorityEn,
): TaskPriorityRu => {
  const priorityMap: Record<TaskPriorityEn, TaskPriorityRu> = {
    LOW: "низкий",
    MEDIUM: "средний",
    HIGH: "высокий",
  };
  return priorityMap[priority];
};

export const mapPriorityFromRussian = (
  priority: TaskPriority,
): TaskPriorityEn => {
  if (isRussianPriority(priority)) {
    const priorityMap: Record<TaskPriorityRu, TaskPriorityEn> = {
      низкий: "LOW",
      средний: "MEDIUM",
      высокий: "HIGH",
    };
    return priorityMap[priority];
  }
  return priority as TaskPriorityEn;
};

export const mapRoleToRussian = (role: UserRoleEn): UserRoleRu => {
  const roleMap: Record<UserRoleEn, UserRoleRu> = {
    USER: "пользователь",
    ADMIN: "администратор",
    BOSS: "руководитель",
  };
  return roleMap[role];
};

export const mapRoleFromRussian = (role: UserRole): UserRoleEn => {
  const roleMap: Record<string, UserRoleEn> = {
    пользователь: "USER",
    администратор: "ADMIN",
    руководитель: "BOSS",
  };
  return roleMap[role as string] || (role as UserRoleEn);
};
