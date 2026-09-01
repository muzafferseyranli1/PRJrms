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
import {
  initWhatsAppService,
  getWhatsAppStatus,
  reconnectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppChats,
  bindWhatsAppGroup,
  notifyWhatsAppTaskCreated,
  notifyWhatsAppTaskCompleted,
  notifyWhatsAppTaskReopened,
} from './whatsapp-service';

dotenv.config();

// Ana yönetici hesabı — sabit, silinemez, değiştirilemez
const MASTER_ADMIN_EMAIL = 'muzaffer.seyranli@gmail.com';

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

  // 1. Auth: Login (E-Posta veya Kullanıcı Adı ile Giriş)
  server.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, username, login: loginField, password } = req.body;
      const rawIdentifier = (loginField || username || email || '').trim();
      
      if (!rawIdentifier || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı / e-posta ve şifre zorunludur' });
      }

      const identifier = rawIdentifier.toLowerCase();
      const cleanIdentifier = identifier.replace(/[^a-z0-9]/g, '');

      // 1. Doğrudan e-posta, e-posta ön eki veya isim ile ara
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: 'insensitive' } },
            { email: { startsWith: `${identifier}@`, mode: 'insensitive' } },
            { fullName: { equals: rawIdentifier, mode: 'insensitive' } },
          ],
        },
      });

      // 2. Ana Yönetici Kısayolları (muzaffer, muzafferseyranli, admin)
      if (!user && (identifier === 'muzaffer' || identifier === 'muzaffer.seyranli' || cleanIdentifier === 'muzafferseyranli' || identifier === 'admin')) {
        user = await prisma.user.findUnique({
          where: { email: MASTER_ADMIN_EMAIL },
        });
      }

      // 3. E-posta ön eki normalize edilmiş arama (örn: ahmet.yilmaz -> ahmet)
      if (!user) {
        const allUsers = await prisma.user.findMany({ where: { isActive: true } });
        user = allUsers.find((u) => {
          const emailPrefix = u.email.split('@')[0].toLowerCase();
          const cleanEmailPrefix = emailPrefix.replace(/[^a-z0-9]/g, '');
          return emailPrefix === identifier || cleanEmailPrefix === cleanIdentifier;
        }) || null;
      }

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

  // 5.1 Users: List All Active Team Members
  server.get('/api/users', requireAuth, async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
      });
      return res.json({ users });
    } catch (err: any) {
      return res.status(500).json({ error: 'Kullanıcılar listelenemedi' });
    }
  });

  // 5.2 Groups: Create New Group
  server.post('/api/groups', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const { name, description, avatarUrl, memberIds } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Grup adı zorunludur' });
      }

      // memberIds'den currentUser.id'yi kesinlikle çıkar (duplicate önleme)
      const safeMemberIds = Array.isArray(memberIds)
        ? memberIds.filter((id: string) => id !== currentUser.id)
        : [];

      const newGroup = await prisma.group.create({
        data: {
          name: name.trim(),
          description: description ? description.trim() : null,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
          members: {
            create: [
              { userId: currentUser.id, role: GroupRole.ADMIN },
              ...safeMemberIds.map((id: string) => ({ userId: id, role: GroupRole.MEMBER as any })),
            ],
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
        },
      });

      // İlk karşılama sistem mesajı
      await prisma.message.create({
        data: {
          groupId: newGroup.id,
          senderId: currentUser.id,
          content: `🎉 "${newGroup.name}" grubu oluşturuldu.`,
          type: MessageType.SYSTEM,
        },
      });

      return res.status(201).json({ group: newGroup });
    } catch (err: any) {
      console.error('Create group error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Grup oluşturulurken hata oluştu' });
    }
  });

  // 5.3 Groups: Delete Group (Admin or Group Creator)
  server.delete('/api/groups/:groupId', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const { groupId } = req.params;

      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Sadece yöneticiler grupları silebilir' });
      }

      const existingGroup = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!existingGroup) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }

      await prisma.group.delete({
        where: { id: groupId },
      });

      io.to(`group_${groupId}`).emit('group_deleted', { groupId });

      return res.json({ success: true, message: 'Grup başarıyla silindi' });
    } catch (err: any) {
      console.error('Delete group error:', err);
      return res.status(500).json({ error: 'Grup silinirken hata oluştu' });
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
              assignees: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      avatarUrl: true,
                      email: true,
                    },
                  },
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
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  email: true,
                },
              },
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

  // 8. Upload File / Media (Tekli veya Çoklu Dosya / Kamera Yükleme)
  server.post('/api/upload', requireAuth, upload.any(), (req: Request, res: Response) => {
    try {
      const uploadedFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'Yüklenecek dosya bulunamadı' });
      }

      const files = uploadedFiles.map((f) => ({
        fileUrl: `/uploads/${f.filename}`,
        fileName: f.originalname,
        fileSize: f.size,
        mimeType: f.mimetype,
      }));

      return res.json({
        success: true,
        files,
        fileUrl: files[0]?.fileUrl,
        fileName: files[0]?.fileName,
        fileSize: files[0]?.fileSize,
        mimeType: files[0]?.mimeType,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Dosya yükleme hatası' });
    }
  });

  // 9. WhatsApp Integration Endpoints
  server.get('/api/whatsapp/status', requireAuth, (req: Request, res: Response) => {
    return res.json(getWhatsAppStatus());
  });

  server.post('/api/whatsapp/connect', requireAuth, async (req: Request, res: Response) => {
    await reconnectWhatsApp();
    return res.json(getWhatsAppStatus());
  });

  server.post('/api/whatsapp/disconnect', requireAuth, async (req: Request, res: Response) => {
    await disconnectWhatsApp();
    return res.json({ success: true });
  });

  server.get('/api/whatsapp/chats', requireAuth, async (req: Request, res: Response) => {
    const chats = await getWhatsAppChats();
    return res.json({ chats });
  });

  server.post('/api/whatsapp/bind-group', requireAuth, async (req: Request, res: Response) => {
    const { groupId, waChatId } = req.body;
    if (!groupId || !waChatId) {
      return res.status(400).json({ error: 'Grup ID ve WhatsApp Chat ID gereklidir.' });
    }
    await bindWhatsAppGroup(groupId, waChatId);
    return res.json({ success: true });
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

  // Initialize WhatsApp Background Service
  initWhatsAppService(io, prisma);

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
      assignedToId?: string;
      assigneeIds?: string[];
      dueDate?: string;
      priority?: TaskPriority;
    }) => {
      try {
        const { groupId, messageId, title, description, assignedToId, assigneeIds = [], dueDate, priority = 'MEDIUM' } = taskData;

        // Check if task already exists for this message
        const existingTask = await prisma.task.findUnique({
          where: { messageId },
        });

        if (existingTask) {
          return socket.emit('error_message', { message: 'Bu mesaja ait zaten bir görev tanımlı' });
        }

        // Determine all unique assignee IDs
        const finalAssigneeIds = Array.from(
          new Set([...(assigneeIds || []), ...(assignedToId ? [assignedToId] : [])])
        ).filter(Boolean);

        const primaryAssigneeId = finalAssigneeIds[0] || assignedToId || null;

        const task = await prisma.task.create({
          data: {
            groupId,
            messageId,
            title: title.trim(),
            description: description ? description.trim() : null,
            assignedToId: primaryAssigneeId,
            createdById: user.id,
            status: TaskStatus.PENDING,
            priority: priority as TaskPriority,
            dueDate: dueDate ? new Date(dueDate) : null,
            assignees: {
              create: finalAssigneeIds.map((uid) => ({ userId: uid })),
            },
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
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    email: true,
                  },
                },
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

        // WhatsApp Notification
        notifyWhatsAppTaskCreated(task);

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

    // Delete Message (Admin or Message Author)
    socket.on('delete_message', async ({ messageId }: { messageId: string }) => {
      try {
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!msg) return;

        if (user.role !== 'ADMIN' && msg.senderId !== user.id) {
          return socket.emit('error_message', { message: 'Bu mesajı silme yetkiniz yok' });
        }

        await prisma.message.delete({
          where: { id: messageId },
        });

        io.to(`group_${msg.groupId}`).emit('message_deleted', {
          messageId,
          groupId: msg.groupId,
        });
      } catch (err: any) {
        console.error('Delete message socket error:', err);
      }
    });

    // Edit Task (Admin, Creator, or Assignee)
    socket.on('edit_task', async (data: {
      taskId: string;
      title: string;
      description?: string;
      assignedToId?: string;
      assigneeIds?: string[];
      dueDate?: string;
      priority: TaskPriority;
      status: TaskStatus;
      reopenNote?: string;
    }) => {
      try {
        const currentTask = await prisma.task.findUnique({
          where: { id: data.taskId },
          include: { assignedTo: true, assignees: true },
        });

        if (!currentTask) return;

        const wasClosed = currentTask.status === 'COMPLETED' || currentTask.status === 'CANCELLED';
        const isReopened = wasClosed && (data.status === 'PENDING' || data.status === 'IN_PROGRESS');

        // Sync assignees if provided
        if (data.assigneeIds && Array.isArray(data.assigneeIds)) {
          const finalAssigneeIds = Array.from(
            new Set([...data.assigneeIds, ...(data.assignedToId ? [data.assignedToId] : [])])
          ).filter(Boolean);

          await prisma.taskAssignee.deleteMany({ where: { taskId: data.taskId } });
          if (finalAssigneeIds.length > 0) {
            await prisma.taskAssignee.createMany({
              data: finalAssigneeIds.map((uid) => ({ taskId: data.taskId, userId: uid })),
              skipDuplicates: true,
            });
          }
        }

        const primaryAssigneeId = data.assignedToId !== undefined
          ? data.assignedToId
          : (data.assigneeIds && data.assigneeIds[0]) || currentTask.assignedToId;

        const updatedTask = await prisma.task.update({
          where: { id: data.taskId },
          data: {
            title: data.title !== undefined ? data.title.trim() : currentTask.title,
            description: data.description !== undefined ? (data.description ? data.description.trim() : null) : currentTask.description,
            assignedToId: primaryAssigneeId,
            priority: (data.priority as TaskPriority) || currentTask.priority,
            status: (data.status as TaskStatus) || currentTask.status,
            dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : currentTask.dueDate,
          },
          include: {
            assignedTo: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            createdBy: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        io.to(`group_${updatedTask.groupId}`).emit('task_updated', updatedTask);
        io.to(`group_${updatedTask.groupId}`).emit('message_task_updated', {
          messageId: updatedTask.messageId,
          task: updatedTask,
        });

        // 🌟 GÖREV YENİDEN AÇILDIĞINDA GRUBA MESAJ AT 🌟
        if (isReopened) {
          const dateStr = updatedTask.dueDate
            ? new Date(updatedTask.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
            : 'Belirtilmedi';

          const reopenMsg = await prisma.message.create({
            data: {
              groupId: updatedTask.groupId,
              senderId: user.id,
              content: `🔄 [GÖREV YENİDEN AÇILDI] "${updatedTask.title}"\n👤 Atanan: ${updatedTask.assignedTo?.fullName || 'Ekip Üyesi'}\n📅 Yeni Bitiş: ${dateStr}\n📝 Not: ${data.reopenNote || 'Görev yönetici tarafından yeniden aktif hale getirildi.'}`,
              type: MessageType.TEXT,
              replyToId: updatedTask.messageId,
            },
            include: {
              sender: {
                select: { id: true, fullName: true, avatarUrl: true, role: true },
              },
              replyTo: {
                select: {
                  id: true,
                  content: true,
                  sender: { select: { id: true, fullName: true } },
                },
              },
              attachments: true,
              reactions: true,
              task: true,
            },
          });

          io.to(`group_${updatedTask.groupId}`).emit('new_message', reopenMsg);
          notifyWhatsAppTaskReopened(updatedTask, user.fullName, data.reopenNote);
        }
      } catch (err: any) {
        console.error('Edit task socket error:', err);
      }
    });

    // Update Task Status
    socket.on('update_task_status', async ({ taskId, status, completionNote, reopenNote }: { taskId: string; status: TaskStatus; completionNote?: string; reopenNote?: string }) => {
      try {
        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        const wasClosed = oldTask ? (oldTask.status === 'COMPLETED' || oldTask.status === 'CANCELLED') : false;
        const isReopening = wasClosed && (status === 'PENDING' || status === 'IN_PROGRESS');

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
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        io.to(`group_${updatedTask.groupId}`).emit('task_updated', updatedTask);
        io.to(`group_${updatedTask.groupId}`).emit('message_task_updated', {
          messageId: updatedTask.messageId,
          task: updatedTask,
        });

        // 🌟 GÖREV TAMAMLANDIĞINDA GRUBA OTOMATİK MESAJ AT 🌟
        if (status === 'COMPLETED') {
          const noteText = completionNote && completionNote.trim() ? completionNote.trim() : 'Görev başarıyla tamamlandı.';
          const completionMsg = await prisma.message.create({
            data: {
              groupId: updatedTask.groupId,
              senderId: user.id,
              content: `✅ [GÖREV TAMAMLANDI] "${updatedTask.title}"\n📝 Tamamlama Notu: ${noteText}`,
              type: MessageType.TEXT,
              replyToId: updatedTask.messageId,
            },
            include: {
              sender: {
                select: { id: true, fullName: true, avatarUrl: true, role: true },
              },
              replyTo: {
                select: {
                  id: true,
                  content: true,
                  sender: { select: { id: true, fullName: true } },
                },
              },
              attachments: true,
              reactions: true,
              task: true,
            },
          });

          io.to(`group_${updatedTask.groupId}`).emit('new_message', completionMsg);
          notifyWhatsAppTaskCompleted(updatedTask, user.fullName, noteText);
        }

        // 🌟 GÖREV YENİDEN AÇILDIĞINDA GRUBA MESAJ AT 🌟
        if (isReopening) {
          notifyWhatsAppTaskReopened(updatedTask, user.fullName, reopenNote);
        }

        // 🌟 GÖREV YENİDEN AÇILDIĞINDA GRUBA OTOMATİK MESAJ AT 🌟
        if (isReopening) {
          const reopenMsg = await prisma.message.create({
            data: {
              groupId: updatedTask.groupId,
              senderId: user.id,
              content: `🔄 [GÖREV YENİDEN AÇILDI] "${updatedTask.title}"\n👤 Atanan: ${updatedTask.assignedTo?.fullName || 'Ekip Üyesi'}\n📌 Yeni Durum: ${status === 'IN_PROGRESS' ? 'Devam Ediyor' : 'Bekliyor'}\n📝 Not: ${reopenNote || 'Görev yeniden aktif hale getirildi.'}`,
              type: MessageType.TEXT,
              replyToId: updatedTask.messageId,
            },
            include: {
              sender: {
                select: { id: true, fullName: true, avatarUrl: true, role: true },
              },
              replyTo: {
                select: {
                  id: true,
                  content: true,
                  sender: { select: { id: true, fullName: true } },
                },
              },
              attachments: true,
              reactions: true,
              task: true,
            },
          });

          io.to(`group_${updatedTask.groupId}`).emit('new_message', reopenMsg);
        }
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
