import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { prisma } from '../src/lib/prisma';
import { signToken, verifyToken, hashPassword, comparePassword } from '../src/lib/auth';
import { UserRole, GroupRole, MessageType, TaskStatus, TaskPriority } from '@prisma/client';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: path.resolve(__dirname, '..') });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || '3005', 10);
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  server.use(cors());
  server.use(express.json());

  // Static uploads directory
  server.use('/uploads', express.static(UPLOAD_DIR));

  // ==========================================
  // AUTH MIDDLEWARE
  // ==========================================
  const requireAuth = (req: Request, res: Response, nextStep: () => void) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum' });
    }
    (req as any).user = user;
    nextStep();
  };

  // ==========================================
  // REST API ENDPOINTS
  // ==========================================

  // Healthcheck
  server.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'PRJrms Team Chat & Task Engine', time: new Date().toISOString() });
  });

  // 1. Auth: Login
  server.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı veya hesabı devre dışı' });
      }

      const validPassword = await comparePassword(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Hatalı şifre' });
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role as any,
      });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: `Giriş işlemi sırasında sunucu hatası oluştu: ${err.message || 'Veritabanı bağlantı hatası'}` });
    }
  });

  // 2. Auth: Get Current User (Me)
  server.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      return res.json({ user });
    } catch (err: any) {
      return res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı' });
    }
  });

  // 3. Admin: Create New User
  server.post('/api/auth/create-user', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Sadece yöneticiler yeni kullanıcı oluşturabilir' });
      }

      const { email, password, fullName, role, avatarUrl } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'E-posta, şifre ve ad-soyad alanları zorunludur' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Bu e-posta adresi ile kayıtlı kullanıcı zaten var' });
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          fullName: fullName.trim(),
          role: role === 'ADMIN' ? UserRole.ADMIN : UserRole.MEMBER,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        },
      });

      // Otomatik olarak genel gruba ekle
      const generalGroup = await prisma.group.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (generalGroup) {
        await prisma.groupMember.create({
          data: {
            groupId: generalGroup.id,
            userId: newUser.id,
            role: newUser.role === UserRole.ADMIN ? GroupRole.ADMIN : GroupRole.MEMBER,
          },
        });
      }

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          avatarUrl: newUser.avatarUrl,
          role: newUser.role,
        },
      });
    } catch (err: any) {
      console.error('Create user error:', err);
      return res.status(500).json({ error: 'Kullanıcı oluşturulurken bir hata oluştu' });
    }
  });

  // 4. Update Profile
  server.put('/api/auth/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const { fullName, avatarUrl } = req.body;

      const updated = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          ...(fullName && { fullName: fullName.trim() }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
        },
      });

      return res.json({ user: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'Profil güncellenemedi' });
    }
  });

  // 5. Groups: List User's Groups
  server.get('/api/groups', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;

      const groups = await prisma.group.findMany({
        where: {
          members: {
            some: {
              userId: currentUser.id,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formatted = groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatarUrl,
        members: g.members,
        lastMessage: g.messages[0] || null,
      }));

      return res.json({ groups: formatted });
    } catch (err: any) {
      console.error('List groups error:', err);
      return res.status(500).json({ error: 'Gruplar listelenemedi' });
    }
  });

  // 6. Messages: List Group Messages
  server.get('/api/groups/:groupId/messages', requireAuth, async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;

      const messages = await prisma.message.findMany({
        where: { groupId },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          task: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
              createdBy: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      return res.json({ messages });
    } catch (err: any) {
      console.error('List messages error:', err);
      return res.status(500).json({ error: 'Mesajlar getirilemedi' });
    }
  });

  // 7. Tasks: List Group Tasks
  server.get('/api/groups/:groupId/tasks', requireAuth, async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const tasks = await prisma.task.findMany({
        where: { groupId },
        include: {
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ tasks });
    } catch (err: any) {
      console.error('List tasks error:', err);
      return res.status(500).json({ error: 'Görevler getirilemedi' });
    }
  });

  // 8. Upload File / Media
  server.post('/api/upload', requireAuth, upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenemedi' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Dosya yükleme hatası' });
    }
  });

  // ==========================================
  // SOCKET.IO REALTIME ENGINE
  // ==========================================
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e8,
  });

  // Socket Auth Middleware
  io.use((socket, nextStep) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return nextStep(new Error('Kimlik doğrulama belirteci eksik'));
    }
    const user = verifyToken(token as string);
    if (!user) {
      return nextStep(new Error('Geçersiz oturum belirteci'));
    }
    (socket as any).user = user;
    nextStep();
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`⚡ Kullanıcı bağlandı: ${user.fullName} (${user.id})`);

    // Group Room Join
    socket.on('join_group', (groupId: string) => {
      socket.join(`group_${groupId}`);
      console.log(`👥 ${user.fullName} gruba katıldı: ${groupId}`);
    });

    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group_${groupId}`);
    });

    // Typing Status
    socket.on('typing_start', ({ groupId }: { groupId: string }) => {
      socket.to(`group_${groupId}`).emit('user_typing', {
        groupId,
        userId: user.id,
        fullName: user.fullName,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ groupId }: { groupId: string }) => {
      socket.to(`group_${groupId}`).emit('user_typing', {
        groupId,
        userId: user.id,
        fullName: user.fullName,
        isTyping: false,
      });
    });

    // Send Message
    socket.on('send_message', async (data: {
      groupId: string;
      content?: string;
      type?: MessageType;
      replyToId?: string;
      attachments?: Array<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }>;
    }) => {
      try {
        const { groupId, content, type = 'TEXT', replyToId, attachments } = data;

        const newMessage = await prisma.message.create({
          data: {
            groupId,
            senderId: user.id,
            content: content || null,
            type: type as MessageType,
            replyToId: replyToId || null,
            ...(attachments && attachments.length > 0 && {
              attachments: {
                create: attachments.map((att) => ({
                  fileUrl: att.fileUrl,
                  fileName: att.fileName,
                  fileSize: att.fileSize,
                  mimeType: att.mimeType,
                })),
              },
            }),
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
            attachments: true,
            reactions: true,
            task: true,
          },
        });

        // Update group timestamp
        await prisma.group.update({
          where: { id: groupId },
          data: { updatedAt: new Date() },
        });

        io.to(`group_${groupId}`).emit('new_message', newMessage);
      } catch (err: any) {
        console.error('Send message socket error:', err);
        socket.emit('error_message', { message: 'Mesaj gönderilemedi' });
      }
    });

    // Add / Toggle Reaction
    socket.on('add_reaction', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      try {
        const existing = await prisma.messageReaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId: user.id,
              emoji,
            },
          },
        });

        let messageGroupId: string | undefined;

        if (existing) {
          await prisma.messageReaction.delete({
            where: { id: existing.id },
          });
        } else {
          const reaction = await prisma.messageReaction.create({
            data: {
              messageId,
              userId: user.id,
              emoji,
            },
            include: {
              message: {
                select: { groupId: true },
              },
            },
          });
          messageGroupId = reaction.message.groupId;
        }

        const updatedMessage = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        });

        if (updatedMessage) {
          io.to(`group_${updatedMessage.groupId}`).emit('message_reactions_updated', {
            messageId,
            reactions: updatedMessage.reactions,
          });
        }
      } catch (err: any) {
        console.error('Reaction error:', err);
      }
    });

    // Chat-to-Task: Convert Message to Task
    socket.on('create_task', async (taskData: {
      groupId: string;
      messageId: string;
      title: string;
      description?: string;
      assignedToId: string;
      dueDate?: string;
      priority?: TaskPriority;
    }) => {
      try {
        const { groupId, messageId, title, description, assignedToId, dueDate, priority = 'MEDIUM' } = taskData;

        // Check if task already exists for this message
        const existingTask = await prisma.task.findUnique({
          where: { messageId },
        });

        if (existingTask) {
          return socket.emit('error_message', { message: 'Bu mesaja ait zaten bir görev tanımlı' });
        }

        const task = await prisma.task.create({
          data: {
            groupId,
            messageId,
            title: title.trim(),
            description: description ? description.trim() : null,
            assignedToId,
            createdById: user.id,
            status: TaskStatus.PENDING,
            priority: priority as TaskPriority,
            dueDate: dueDate ? new Date(dueDate) : null,
          },
          include: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Broadcast task created and update the source message
        io.to(`group_${groupId}`).emit('task_created', task);
        io.to(`group_${groupId}`).emit('message_task_updated', {
          messageId,
          task,
        });

        // Also emit a system message notification in chat
        const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
        const systemMsg = await prisma.message.create({
          data: {
            groupId,
            senderId: user.id,
            content: `📌 "${title}" görevi oluşturuldu ve ${assignee?.fullName || 'ekip üyesine'} atandı.`,
            type: MessageType.SYSTEM,
          },
          include: {
            sender: {
              select: { id: true, fullName: true, avatarUrl: true, role: true },
            },
          },
        });
        io.to(`group_${groupId}`).emit('new_message', systemMsg);
      } catch (err: any) {
        console.error('Create task error:', err);
        socket.emit('error_message', { message: 'Görev oluşturulurken bir hata oluştu' });
      }
    });

    // Update Task Status
    socket.on('update_task_status', async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      try {
        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: { status: status as TaskStatus },
          include: {
            assignedTo: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            createdBy: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        });

        io.to(`group_${updatedTask.groupId}`).emit('task_updated', updatedTask);
        io.to(`group_${updatedTask.groupId}`).emit('message_task_updated', {
          messageId: updatedTask.messageId,
          task: updatedTask,
        });
      } catch (err: any) {
        console.error('Update task status error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Kullanıcı ayrıldı: ${user.fullName}`);
    });
  });

  // Next.js page requests handler
  server.all('*', (req: Request, res: Response) => {
    return handle(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`> PRJrms Server hazır: http://localhost:${PORT}`);
    console.log(`> Mod: ${dev ? 'Geliştirme (Development)' : 'Canlı (Production)'}`);
  });
});
