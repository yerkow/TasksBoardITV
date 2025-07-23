# 🚀 Подробный гайд по запуску сервера

## 📋 Предварительные требования

1. **Node.js** (версия 16 или выше)
2. **PostgreSQL** (для базы данных)
3. **npm** или **yarn** (менеджер пакетов)

## 🔧 Пошаговая настройка

### 1. Установка зависимостей

#### Для корневого проекта (фронтенд):
```bash
npm install
```

#### Для сервера:
```bash
cd server
npm install
```

### 2. Настройка базы данных

#### Создание базы данных PostgreSQL:
```bash
# Запустите PostgreSQL и создайте базу данных
psql -U postgres
CREATE DATABASE taskmanager;
\q
```

#### Настройка Prisma схемы:
```bash
cd server
npx prisma generate
npx prisma db push
```

### 3. Настройка переменных окружения

#### Скопируйте файлы примеров:
```bash
# В корне проекта
cp .env.example .env

# В папке server
cd server
cp .env.example .env
```

#### Отредактируйте файлы .env:

**Корневой .env:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskmanager"
JWT_SECRET="ваш_секретный_ключ_jwt"
PORT=3001
VITE_API_URL=http://localhost:3001/api
UPLOADS_DIR=uploads
```

**server/.env:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskmanager"
JWT_SECRET="ваш_секретный_ключ_jwt"
PORT=3001
UPLOADS_DIR=uploads
```

## 🚀 Команды для запуска

### Основные команды запуска:

#### 1. Запуск только сервера:
```bash
# Из корня проекта
node server/index.js

# ИЛИ через npm script
npm run server

# ИЛИ из папки server
cd server
node index.js
```

#### 2. Запуск фронтенда:
```bash
# Из корня проекта
npm run dev
```

#### 3. Запуск всего проекта одновременно:
```bash
# Используйте два терминала:
# Терминал 1 - сервер
npm run server

# Терминал 2 - фронтенд
npm run dev
```

### Команды для работы с базой данных:

#### Применение миграций:
```bash
cd server
npx prisma db push
```

#### Генерация Prisma клиента:
```bash
cd server
npx prisma generate
```

#### Просмотр базы данных:
```bash
cd server
npx prisma studio
```

#### Сброс базы данных:
```bash
cd server
npx prisma db push --force-reset
```

### Полезные команды для разработки:

#### Создание тестового пользователя:
```bash
cd server
node create-test-user.js
```

#### Проверка пользователей:
```bash
cd server
node check-users.js
```

#### Обновление паролей:
```bash
cd server
node update-passwords.js
```

## 🌐 Доступ к приложению

### Локальный доступ:
- **Фронтенд:** http://localhost:5173
- **API сервер:** http://localhost:3001/api
- **Prisma Studio:** http://localhost:5555

### Доступ с мобильных устройств:
1. Узнайте IP-адрес вашего компьютера:
   ```bash
   ipconfig
   ```
2. Используйте IP вместо localhost:
   - **Фронтенд:** http://ВАШ_IP:5173
   - **API:** http://ВАШ_IP:3001/api

## 🔧 Готовые скрипты

### Windows (.bat файлы):
```bash
# Установка всех зависимостей
install.bat

# Запуск проекта
start.bat

# Запуск только проекта
start-project.bat
```

### PowerShell скрипты:
```bash
# Настройка для Windows
.\setup-windows.ps1

# Создание базы данных
.\create-database.ps1

# Исправление базы данных
.\fix-database.ps1
```

## 🐛 Решение проблем

### Проблема с подключением к базе данных:
```bash
# Проверьте статус PostgreSQL
net start postgresql-x64-14

# Или перезапустите службу
net stop postgresql-x64-14
net start postgresql-x64-14
```

### Проблема с портами:
```bash
# Проверьте, какие порты заняты
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

### Очистка и переустановка:
```bash
# Удалите node_modules и переустановите
rmdir /s node_modules
rmdir /s server\node_modules
npm install
cd server && npm install
```

## 📱 Настройка для мобильных устройств

### Обновите .env файл:
```env
# Замените localhost на IP вашего компьютера
VITE_API_URL=http://192.168.1.100:3001/api
```

### Убедитесь, что брандмауэр разрешает подключения:
```bash
# Добавьте правила в брандмауэр Windows для портов 3001 и 5173
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
```

## ✅ Проверка работоспособности

### Тест API:
```bash
# Проверьте доступность API
curl http://localhost:3001/api/auth/login

# Или откройте в браузере
http://localhost:3001/api
```

### Тест фронтенда:
```bash
# Откройте в браузере
http://localhost:5173
```

---

## 🎯 Быстрый старт (TL;DR)

```bash
# 1. Установка
npm install && cd server && npm install && cd ..

# 2. Настройка БД
cd server && npx prisma generate && npx prisma db push && cd ..

# 3. Запуск (в двух терминалах)
# Терминал 1:
npm run server

# Терминал 2:
npm run dev
```

**Готово!** Приложение доступно по адресу http://localhost:5173