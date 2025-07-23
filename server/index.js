const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Создаем HTTP сервер для Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Разрешаем запросы без origin (например, мобильные приложения)
      if (!origin) {
        return callback(null, true);
      }
      
      // Разрешаем localhost и 127.0.0.1
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Разрешаем IP-адреса локальной сети
      if (origin.match(/^https?:\/\/(192\.168\.|10\.)/)) {
        return callback(null, true);
      }
      
      // Разрешаем указанный в переменной окружения URL
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      
      callback(null, true); // Разрешаем все для разработки
    },
    methods: ['GET', 'POST']
  }
});

// Хранилище активных соединений пользователей
const userSockets = new Map(); // userId -> Set of socket ids

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('🔌 Новое WebSocket соединение:', socket.id);
  
  // Аутентификация пользователя через WebSocket
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      
      // Добавляем сокет в карту пользователей
      if (!userSockets.has(decoded.userId)) {
        userSockets.set(decoded.userId, new Set());
      }
      userSockets.get(decoded.userId).add(socket.id);
      
      console.log(`✅ Пользователь ${decoded.userId} аутентифицирован через WebSocket`);
      socket.emit('authenticated', { success: true });
      
      // Отправляем всем клиентам обновленный список онлайн пользователей
      broadcastOnlineUsers();
    } catch (error) {
      console.error('❌ Ошибка аутентификации WebSocket:', error);
      socket.emit('authentication_error', { error: 'Неверный токен' });
    }
  });
  
  // Обработка ping для поддержания соединения
  socket.on('ping', () => {
    console.log('🏓 Получен ping от клиента:', socket.id);
    socket.emit('pong');
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket соединение закрыто:', socket.id);
    
    // Удаляем сокет из карты пользователей
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket.id);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
      
      // Отправляем всем клиентам обновленный список онлайн пользователей
      broadcastOnlineUsers();
    }
  });
});

// Функция для отправки всем клиентам списка пользователей онлайн
const broadcastOnlineUsers = async () => {
  try {
    // Получаем список всех пользователей из базы данных
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        patronymic: true,
        role: true
      }
    });
    
    // Формируем список пользователей с их онлайн-статусом
    const usersWithStatus = allUsers.map(user => ({
      ...user,
      isOnline: userSockets.has(user.id)
    }));
    
    // Отправляем список всем подключенным клиентам
    io.emit('users_status_updated', usersWithStatus);
    
    console.log('📡 Отправлен обновленный список пользователей онлайн:', 
      usersWithStatus.filter(u => u.isOnline).length, 'из', usersWithStatus.length);
  } catch (error) {
    console.error('❌ Ошибка при отправке статусов пользователей:', error);
  }
};

// Функция для отправки обновлений всем пользователям
const notifyAll = (event, data) => {
  console.log(`📡 WebSocket broadcast: ${event} to ${io.engine.clientsCount} clients`);
  io.emit(event, data);
};

const notifyUser = (userId, event, data) => {
  const userSocketIds = userSockets.get(userId);
  if (userSocketIds && userSocketIds.size > 0) {
    console.log(`📡 WebSocket notify user ${userId}: ${event} to ${userSocketIds.size} sockets`);
    userSocketIds.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  } else {
    console.log(`⚠️ User ${userId} not found in active sockets for event: ${event}`);
  }
};

// Middleware
app.use(helmet());
// Настройка CORS
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 CORS запрос от origin:', origin);
    
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) {
      console.log('✅ Разрешен запрос без origin');
      return callback(null, true);
    }
    
    // Разрешаем localhost и 127.0.0.1
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('✅ Разрешен localhost/127.0.0.1');
      return callback(null, true);
    }
    
    // Разрешаем IP-адреса локальной сети
    if (origin.match(/^https?:\/\/(192\.168\.|10\.)/)) {
      console.log('✅ Разрешен IP локальной сети');
      return callback(null, true);
    }
    
    // Разрешаем указанный в переменной окружения URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      console.log('✅ Разрешен FRONTEND_URL');
      return callback(null, true);
    }
    
    console.log('❌ CORS запрещен для origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, {
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method === 'POST' ? JSON.stringify(req.body).substring(0, 200) : undefined
  });
  next();
});

// Создаем папку для загрузки файлов
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Middleware для аутентификации
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Статические файлы для загруженных файлов
app.use('/uploads', express.static(uploadsDir));

// === AUTH ROUTES ===

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Запрос на регистрацию получен');
  try {
    const { email, password, firstName, lastName, patronymic, role = 'USER' } = req.body;
    console.log('📝 Данные регистрации:', { email, firstName, lastName, role });
    
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('❌ Пользователь уже существует:', email);
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        patronymic: patronymic || '',
        role: role.toUpperCase()
      }
    });
    
    console.log('✅ Пользователь создан:', user.id);
    
    // Создаем токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT токен создан');
    
    res.json({ 
      token, 
      user: { 
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Запрос на вход получен');
  try {
    const { email, password } = req.body;
    console.log('🔐 Попытка входа для:', email);
    
    // Находим пользователя
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    
    console.log('✅ Пользователь найден:', user.id);
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('❌ Неверный пароль для:', email);
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    
    console.log('✅ Пароль верный');
    
    // Создаем токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT токен создан для входа');
    
    res.json({ 
      token, 
      user: { 
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Получение текущего пользователя
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        patronymic: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
});

// === USER ROUTES ===

// Обновить пользователя
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, firstName, lastName, patronymic } = req.body;
    
    // Проверяем права доступа
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId }
    });
    
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'BOSS')) {
      return res.status(403).json({ error: 'Недостаточно прав для обновления пользователя' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(patronymic !== undefined && { patronymic })
      }
    });
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Получить всех пользователей
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    
    const where = role ? { role: role.toUpperCase() } : {};
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        patronymic: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// Получить статус пользователей (онлайн/оффлайн)
app.get('/api/users/status', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        patronymic: true,
        role: true
      }
    });
    
    // Добавляем информацию об онлайн-статусе
    const usersWithStatus = users.map(user => ({
      ...user,
      isOnline: userSockets.has(user.id)
    }));
    
    res.json(usersWithStatus);
  } catch (error) {
    console.error('Get users status error:', error);
    res.status(500).json({ error: 'Ошибка при получении статуса пользователей' });
  }
});

// === TASK ROUTES ===

// Получение задач
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { role, userId } = req.user;
    console.log('GET /api/tasks - User:', { role, userId });
    
    let where = {};
    
    // Если пользователь не boss или admin, показываем только его задачи
    if (role !== 'BOSS' && role !== 'ADMIN') {
      where.assigneeId = userId;
    }
    
    console.log('Query where condition:', where);
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            patronymic: true
          }
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found tasks:', tasks.length);
    console.log('Tasks data:', tasks);
    
    // Преобразуем статусы и приоритеты в русский язык для фронтенда
    const tasksWithRussianLabels = tasks.map(task => ({
      ...task,
      status: mapStatusToRussian(task.status),
      priority: mapPriorityToRussian(task.priority)
    }));
    
    res.json(tasksWithRussianLabels);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Ошибка при получении задач' });
  }
});

// Создание задачи
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, deadline, assigneeId, assigneeName } = req.body;
    
    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        priority: priority?.toUpperCase() || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        status: 'ASSIGNED',
        assigneeId,
        assigneeName,
        createdBy: req.user.userId
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            patronymic: true
          }
        }
      }
    });
    
    // Преобразуем статусы и приоритеты в русский язык для фронтенда
    const taskWithRussianLabels = {
      ...task,
      status: mapStatusToRussian(task.status),
      priority: mapPriorityToRussian(task.priority)
    };
    
    // Отправляем real-time уведомление всем пользователям о новой задаче
    notifyAll('task_created', taskWithRussianLabels);
    
    res.json(taskWithRussianLabels);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// Обновление задачи
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Преобразуем статус и приоритет в верхний регистр если они есть
    if (updates.status) {
      updates.status = updates.status.toUpperCase();
    }
    if (updates.priority) {
      updates.priority = updates.priority.toUpperCase();
    }
    if (updates.deadline) {
      updates.deadline = new Date(updates.deadline);
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...updates,
        updatedBy: req.user.userId
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            patronymic: true
          }
        }
      }
    });
    
    // Преобразуем статусы и приоритеты в русский язык для фронтенда
    const taskWithRussianLabels = {
      ...task,
      status: mapStatusToRussian(task.status),
      priority: mapPriorityToRussian(task.priority)
    };
    
    // Отправляем real-time уведомление всем пользователям об обновлении задачи
    console.log('📡 Отправка WebSocket уведомления task_updated для задачи:', task.id, 'статус:', taskWithRussianLabels.status);
    notifyAll('task_updated', taskWithRussianLabels);
    
    res.json(taskWithRussianLabels);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении задачи' });
  }
});

// Удаление задачи
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.task.delete({
      where: { id }
    });
    
    // Отправляем real-time уведомление об удалении задачи
    notifyAll('task_deleted', { taskId: id });
    
    res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Ошибка при удалении задачи' });
  }
});

// Загрузка файла для задачи
app.post('/api/tasks/:id/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, textContent, reportType } = req.body;
    
    console.log('Upload request:', { id, reportType, hasFile: !!req.file, hasTextContent: !!textContent });
    
    let reportFile;
    
    if (reportType === 'text' && textContent) {
      // Обработка текстового отчета
      reportFile = {
        type: 'text',
        content: textContent,
        uploadedAt: new Date().toISOString(),
        comment: comment || '',
        isTextReport: true
      };
    } else if (req.file) {
      // Обработка файлового отчета
      const fileUrl = `/uploads/${req.file.filename}`;
      reportFile = {
        type: 'file',
        name: req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
        size: req.file.size,
        comment: comment || '',
        isTextReport: false
      };
    } else {
      console.log('No file or text content provided');
      return res.status(400).json({ error: 'Не предоставлен ни файл, ни текстовый контент' });
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        reportFile,
        status: 'UNDER_REVIEW', // Автоматически меняем статус на "на проверке"
        updatedBy: req.user.userId
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            patronymic: true
          }
        }
      }
    });
    
    console.log('Task updated successfully:', task.id);
    
    // Преобразуем статусы и приоритеты в русский язык для фронтенда
    const taskWithRussianLabels = {
      ...task,
      status: mapStatusToRussian(task.status),
      priority: mapPriorityToRussian(task.priority)
    };
    
    // Отправляем real-time уведомление всем пользователям о загрузке отчета и изменении статуса
    console.log('📡 Отправка WebSocket уведомления task_updated для загрузки отчета, задача:', task.id, 'статус:', taskWithRussianLabels.status);
    notifyAll('task_updated', {
      ...taskWithRussianLabels,
      reportFile: {
        ...taskWithRussianLabels.reportFile,
        // Добавляем флаг для фронтенда, что отчет был только что загружен
        isNew: true
      }
    });
    
    res.json({ task: taskWithRussianLabels, fileUrl: reportFile.url || null });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Ошибка при загрузке файла' });
  }
});

// Скачивание файла отчета
app.get('/api/tasks/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task || !task.reportFile) {
      return res.status(404).json({ error: 'Отчет не найден' });
    }

    const reportFile = task.reportFile;

    if (reportFile.isTextReport) {
      // Отдаем текстовый отчет
      res.setHeader('Content-Disposition', 'attachment; filename="report.txt"');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(reportFile.content);
    } else {
      // Отдаем файл
      const filePath = path.join(__dirname, reportFile.url);
      if (fs.existsSync(filePath)) {
        res.download(filePath, reportFile.name);
      } else {
        res.status(404).json({ error: 'Файл отчета не найден на сервере' });
      }
    }
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Ошибка при скачивании файла' });
  }
});

// Утилиты для преобразования данных
const mapStatusToRussian = (status) => {
  const statusMap = {
    'ASSIGNED': 'назначено',
    'IN_PROGRESS': 'в работе',
    'UNDER_REVIEW': 'на проверке',
    'COMPLETED': 'выполнено',
    'REVISION': 'доработка'
  };
  return statusMap[status] || status;
};

const mapPriorityToRussian = (priority) => {
  const priorityMap = {
    'LOW': 'низкий',
    'MEDIUM': 'средний',
    'HIGH': 'высокий'
  };
  return priorityMap[priority] || priority;
};

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Функция для получения локального IP
const getLocalIP = () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Функция для запуска серверов
const startServers = () => {
  const HTTP_PORT = PORT;
  const HTTPS_PORT = parseInt(PORT) + 1; // HTTPS на следующем порту
  const localIP = getLocalIP();
  
  // Запуск HTTP сервера с Socket.io
  server.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP сервер с WebSocket запущен на порту ${HTTP_PORT}`);
    console.log(`📊 API доступно по адресу: http://localhost:${HTTP_PORT}/api`);
    console.log(`📊 API доступно по адресу: http://${localIP}:${HTTP_PORT}/api`);
    console.log(`🔌 WebSocket доступен по адресу: ws://localhost:${HTTP_PORT}`);
    console.log(`🔌 WebSocket доступен по адресу: ws://${localIP}:${HTTP_PORT}`);
  });
  
  // Попытка запуска HTTPS сервера
  const certsPath = path.join(__dirname, 'certs');
  const keyPath = path.join(certsPath, 'key.pem');
  const certPath = path.join(certsPath, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔐 HTTPS сервер запущен на порту ${HTTPS_PORT}`);
        console.log(`📊 Безопасное API: https://localhost:${HTTPS_PORT}/api`);
        console.log(`📊 Безопасное API: https://${localIP}:${HTTPS_PORT}/api`);
        console.log('');
        console.log('✅ HTTPS включен - браузерные уведомления будут работать!');
        console.log('⚠️  При первом подключении браузер покажет предупреждение о сертификате.');
        console.log('   Нажмите "Дополнительно" → "Перейти на сайт" для продолжения.');
        console.log('');
        console.log('🌐 Доступные адреса:');
        console.log(`   ➜  API HTTP:  http://localhost:${HTTP_PORT}/api`);
        console.log(`   ➜  API HTTP:  http://${localIP}:${HTTP_PORT}/api`);
        console.log(`   ➜  API HTTPS: https://localhost:${HTTPS_PORT}/api`);
        console.log(`   ➜  API HTTPS: https://${localIP}:${HTTPS_PORT}/api`);
      });
    } catch (error) {
      console.error('❌ Ошибка запуска HTTPS сервера:', error.message);
      console.log('💡 Запущен только HTTP сервер. Для HTTPS выполните: node generate-ssl.js');
    }
  } else {
    console.log('⚠️  SSL сертификаты не найдены.');
    console.log('💡 Для включения HTTPS выполните: node generate-ssl.js');
    console.log('📱 Без HTTPS браузерные уведомления работать не будут!');
  }
  
  console.log('');
  console.log('📱 Для работы уведомлений используйте HTTPS версию!');
};

// Запуск серверов
startServers();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал SIGINT, завершаем работу...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал SIGTERM, завершаем работу...');
  await prisma.$disconnect();
  process.exit(0);
});