import { Client, LocalAuth, MessageMedia, Message as WAMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export interface WhatsAppState {
  status: 'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready';
  qrCodeDataUrl: string | null;
  phone: string | null;
  pushname: string | null;
  lastError: string | null;
  boundGroupId: string | null;
  boundGroupName: string | null;
  boundChatId: string | null;
}

let client: Client | null = null;
let ioInstance: SocketIOServer | null = null;
let prismaInstance: PrismaClient | null = null;

let state: WhatsAppState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  phone: null,
  pushname: null,
  lastError: null,
  boundGroupId: null,
  boundGroupName: null,
  boundChatId: null,
};

const cachedChatsMap = new Map<string, { id: string; name: string; isGroup: boolean; number?: string; unreadCount?: number; type?: string; boundGroup?: { id: string; name: string } }>();
const processedMessageIds = new Set<string>();

// Clean and normalize phone number for matching
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

// Find or auto-create a system user matching a WhatsApp contact
async function findOrCreateWhatsAppUser(rawNumber: string, pushname?: string): Promise<any> {
  if (!prismaInstance) return null;
  const cleanPhone = normalizePhone(rawNumber);

  // 1. Match by last 10 digits
  if (cleanPhone.length >= 10) {
    const last10 = cleanPhone.slice(-10);
    const users = await prismaInstance.user.findMany();
    const matched = users.find((u) => u.phone && normalizePhone(u.phone).endsWith(last10));
    if (matched) return matched;
  }

  // 2. Match by full name
  if (pushname) {
    const trimmed = pushname.trim().toLowerCase();
    const users = await prismaInstance.user.findMany();
    const matched = users.find((u) => u.fullName.toLowerCase() === trimmed || (u.fullName.length > 3 && trimmed.includes(u.fullName.toLowerCase())));
    if (matched) return matched;
  }

  // 3. If not found, auto-create a user for this contact
  try {
    const displayName = pushname || (cleanPhone ? ('+' + cleanPhone) : 'WhatsApp Kullanıcısı');
    const autoEmail = 'wa_' + (cleanPhone || Date.now()) + '@whatsapp.prjrms';
    const newUser = await prismaInstance.user.create({
      data: {
        email: autoEmail,
        fullName: displayName,
        phone: cleanPhone || null,
        passwordHash: '$2a$10$e84Wb3.H1234567890123456789012345678901234567890123456',
        role: 'MEMBER',
      },
    });
    return newUser;
  } catch (err) {
    return await prismaInstance.user.findFirst({ where: { role: 'ADMIN' } });
  }
}

// Find existing PRJrms group or auto-create channel for this WhatsApp chat
async function getOrCreateTargetGroup(waChatId: string, chatTitle: string, isGroup: boolean, senderUser?: any): Promise<any> {
  if (!prismaInstance || !ioInstance) return null;

  // 1. Check if an existing group has this whatsappChatId
  const existing = await prismaInstance.group.findFirst({
    where: { whatsappChatId: waChatId },
    include: { members: true },
  });
  if (existing) return existing;

  // 2. Auto-create channel for this WhatsApp conversation
  const adminUser = await prismaInstance.user.findFirst({ where: { role: 'ADMIN' } });
  const membersToCreate: any[] = [];
  if (adminUser) {
    membersToCreate.push({ userId: adminUser.id, role: 'ADMIN' });
  }
  if (senderUser && adminUser && senderUser.id !== adminUser.id) {
    membersToCreate.push({ userId: senderUser.id, role: 'MEMBER' });
  }

  const groupName = isGroup ? (chatTitle || 'WhatsApp Grubu') : (chatTitle + ' (WhatsApp)');

  try {
    const newGroup = await prismaInstance.group.create({
      data: {
        name: groupName.slice(0, 100),
        description: isGroup ? 'WhatsApp Grubu Senkronizasyonu' : ('WhatsApp Birebir Yazışma (' + chatTitle + ')'),
        whatsappChatId: waChatId,
        members: {
          create: membersToCreate,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, avatarUrl: true, role: true, email: true },
            },
          },
        },
        tasks: true,
      },
    });

    // Notify web clients
    ioInstance.emit('group_created', newGroup);
    return newGroup;
  } catch (e) {
    return await prismaInstance.group.findFirst({ orderBy: { createdAt: 'asc' } });
  }
}

export function initWhatsAppService(io: SocketIOServer, prisma: PrismaClient) {
  ioInstance = io;
  prismaInstance = prisma;

  const authDir = path.join(process.cwd(), '.wwebjs_auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('[WhatsApp] Servis başlatılıyor...');
  state.status = 'connecting';
  broadcastStatus();

  try {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: authDir }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      },
    });

    client.on('qr', async (qr) => {
      console.log('[WhatsApp] Yeni QR Kod üretildi.');
      try {
        state.qrCodeDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
        state.status = 'qr';
        state.lastError = null;
        broadcastStatus();
        if (ioInstance) {
          ioInstance.emit('whatsapp_qr', { qrCodeDataUrl: state.qrCodeDataUrl });
        }
      } catch (err: any) {
        console.error('[WhatsApp] QR oluşturma hatası:', err);
      }
    });

    client.on('authenticated', () => {
      console.log('[WhatsApp] ✅ Oturum başarıyla doğrulandı.');
      state.status = 'authenticated';
      state.qrCodeDataUrl = null;
      state.lastError = null;
      broadcastStatus();
    });

    client.on('auth_failure', (msg) => {
      console.error('[WhatsApp] ❌ Oturum doğrulama hatası:', msg);
      state.status = 'disconnected';
      state.lastError = 'Oturum hatası: ' + msg;
      broadcastStatus();
    });

    client.on('ready', async () => {
      console.log('[WhatsApp] 🚀 WhatsApp istemcisi hazır ve bağlandı!');
      state.status = 'ready';
      state.qrCodeDataUrl = null;
      state.lastError = null;

      try {
        if (client?.info) {
          state.phone = client.info.wid.user;
          state.pushname = client.info.pushname || null;
        }
      } catch (e) {}

      broadcastStatus();
    });

    client.on('disconnected', (reason) => {
      console.log('[WhatsApp] ⚠️ WhatsApp bağlantısı kesildi:', reason);
      state.status = 'disconnected';
      state.qrCodeDataUrl = null;
      state.lastError = 'Bağlantı kesildi: ' + reason;
      broadcastStatus();
    });

    // 📩 INCOMING MESSAGES (From others)
    client.on('message', async (msg: WAMessage) => {
      try {
        await handleIncomingWhatsAppMessage(msg);
      } catch (err) {
        console.error('[WhatsApp] Gelen mesaj işleme hatası:', err);
      }
    });

    // 📩 ALL MESSAGES (Both incoming & outgoing)
    client.on('message_create', async (msg: WAMessage) => {
      try {
        await handleIncomingWhatsAppMessage(msg);
      } catch (err) {
        console.error('[WhatsApp] Mesaj işleme hatası:', err);
      }
    });

    client.initialize().catch((err) => {
      console.error('[WhatsApp] Başlatma hatası:', err);
      state.status = 'disconnected';
      state.lastError = err.message || 'WhatsApp başlatılamadı';
      broadcastStatus();
    });
  } catch (err: any) {
    console.error('[WhatsApp] Genel başlatma hatası:', err);
    state.status = 'disconnected';
    state.lastError = err.message;
    broadcastStatus();
  }
}

async function handleIncomingWhatsAppMessage(msg: WAMessage) {
  if (!prismaInstance || !ioInstance) return;
  if (!msg || msg.isStatus || msg.type === 'e2e_notification' || msg.type === 'protocol') return;

  const msgId = msg.id?._serialized || (typeof msg.id === 'string' ? msg.id : '');
  if (msgId && processedMessageIds.has(msgId)) {
    return; // De-duplicate
  }
  if (msgId) {
    processedMessageIds.add(msgId);
    if (processedMessageIds.size > 2000) {
      const first = processedMessageIds.values().next().value;
      if (first) processedMessageIds.delete(first);
    }
  }

  // Determine chat ID: if from me -> to or from, else from
  let rawChatId = msg.fromMe ? (msg.to || msg.from) : msg.from;
  if (!rawChatId) {
    try {
      const chat = await msg.getChat();
      rawChatId = chat.id?._serialized || (typeof chat.id === 'string' ? chat.id : '');
    } catch (e) {}
  }
  if (!rawChatId) return;

  const isGroup = rawChatId.endsWith('@g.us');

  // Determine Sender Number and Pushname
  let rawSenderNumber = '';
  if (msg.fromMe) {
    rawSenderNumber = state.phone || (client?.info?.wid?.user || '');
  } else {
    rawSenderNumber = msg.author ? msg.author.split('@')[0] : rawChatId.split('@')[0];
  }

  let pushname = (msg as any)._data?.notifyName || (msg as any).notifyName || '';
  let chatTitle = isGroup ? 'WhatsApp Grubu' : 'WhatsApp Kişisi';

  try {
    const chat = await msg.getChat();
    if (chat) {
      chatTitle = chat.name || (chat as any).formattedTitle || chatTitle;
    }
  } catch (e) {}

  // Önbelleğe kaydet
  cachedChatsMap.set(rawChatId, {
    id: rawChatId,
    name: chatTitle,
    isGroup,
    number: isGroup ? undefined : rawSenderNumber,
  });

  // Göndereni tespit et veya otomatik kullanıcı oluştur
  const senderUser = await findOrCreateWhatsAppUser(rawSenderNumber, pushname);
  if (!senderUser) return;

  // Hedef grubu bul veya otomatik kanal oluştur (hem birebir hem grup için)
  const targetGroup = await getOrCreateTargetGroup(rawChatId, chatTitle, isGroup, senderUser);
  if (!targetGroup) return;

  // Grup üyeliği yoksa ekle
  try {
    const existingMember = await prismaInstance.groupMember.findFirst({
      where: { groupId: targetGroup.id, userId: senderUser.id },
    });
    if (!existingMember) {
      await prismaInstance.groupMember.create({
        data: {
          groupId: targetGroup.id,
          userId: senderUser.id,
          role: senderUser.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        },
      });
    }
  } catch (e) {}

  // 📷 MEDYA / DOSYA İNDİRME
  let attachmentsData: Array<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> = [];

  if (msg.hasMedia) {
    try {
      const media = await msg.downloadMedia();
      if (media && media.data) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
        const fileName = media.filename || ('wa_' + Date.now() + '.' + ext);
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(media.data, 'base64');

        fs.writeFileSync(filePath, buffer);

        attachmentsData.push({
          fileUrl: '/uploads/' + fileName,
          fileName: fileName,
          fileSize: buffer.length,
          mimeType: media.mimetype,
        });
      }
    } catch (mediaErr) {
      console.error('[WhatsApp] Medya indirme hatası:', mediaErr);
    }
  }

  const messageText = (msg.body || '').trim();

  // Veritabanına mesajı kaydet
  const savedMessage = await prismaInstance.message.create({
    data: {
      groupId: targetGroup.id,
      senderId: senderUser.id,
      content: messageText || (attachmentsData.length > 0 ? '📷 [Medya / Fotoğraf]' : ''),
      type: attachmentsData.length > 0 ? 'IMAGE' : 'TEXT',
      attachments: attachmentsData.length > 0 ? {
        create: attachmentsData,
      } : undefined,
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
      attachments: true,
      reactions: true,
      task: true,
    },
  });

  // Socket.io ile web arayüzüne yayınla
  ioInstance.to('group_' + targetGroup.id).emit('new_message', savedMessage);

  // 🤖 BOT KOMUTLARI: !gorev, !durum, !tamamla, !yardim
  const lower = messageText.toLowerCase();
  if (lower.startsWith('!gorev') || lower.startsWith('!task') || lower.startsWith('!plan')) {
    await handleWhatsAppTaskCommand(msg, savedMessage, targetGroup.id, senderUser, isGroup);
  } else if (lower.startsWith('!durum') || lower.startsWith('!gorevler') || lower.startsWith('!tasks')) {
    await handleWhatsAppStatusCommand(msg, targetGroup.id);
  } else if (lower.startsWith('!tamamla') || lower.startsWith('!bitti') || lower.startsWith('!done')) {
    await handleWhatsAppCompleteCommand(msg, targetGroup.id, senderUser);
  } else if (lower === '!yardim' || lower === '!help' || lower === '!komutlar') {
    await handleWhatsAppHelpCommand(msg);
  }
}

// 🤖 WhatsApp Botu !gorev Komutu İşleyici (Grup veya Birebir Sohbet)
async function handleWhatsAppTaskCommand(
  msg: WAMessage,
  sourceMessage: any,
  groupId: string,
  createdByUser: any,
  isGroup: boolean
) {
  if (!prismaInstance || !ioInstance) return;

  const rawText = msg.body.replace(/^!(gorev|task|plan)/i, '').trim();

  let targetTitle = rawText;
  let assignedUsers: any[] = [];
  let dueDate: Date | null = null;

  // Alıntılanan bir mesaja yanıt verilmişse onun metnini kullan
  if (msg.hasQuotedMsg) {
    const quotedMsg = await msg.getQuotedMessage();
    if (quotedMsg && quotedMsg.body) {
      targetTitle = rawText ? (rawText + ': ' + quotedMsg.body.slice(0, 80)) : quotedMsg.body.slice(0, 150);
    }
  }

  if (!targetTitle) {
    targetTitle = 'WhatsApp Üzerinden Açılan Görev';
  }

  // 1. Bahsedilen kişileri (mentions) çöz
  const mentions = await msg.getMentions();
  for (const contact of mentions) {
    const u = await findOrCreateWhatsAppUser(contact.number, contact.name || contact.pushname);
    if (u && !assignedUsers.some((x) => x.id === u.id)) {
      assignedUsers.push(u);
    }
  }

  // 2. Mention yoksa metin içinde isim ara
  if (assignedUsers.length === 0) {
    const allUsers = await prismaInstance.user.findMany();
    for (const u of allUsers) {
      const firstName = u.fullName.toLowerCase().split(' ')[0];
      if (firstName.length >= 3 && rawText.toLowerCase().includes(firstName)) {
        assignedUsers.push(u);
      }
    }
  }

  // 3. Birebir sohbetteyse karşıdaki kişiyi otomatik sorumlu yap
  if (assignedUsers.length === 0 && !isGroup) {
    assignedUsers.push(createdByUser);
  }

  // 4. Hala sorumlu yoksa görevi oluşturan kişiyi ata
  if (assignedUsers.length === 0) {
    assignedUsers.push(createdByUser);
  }

  // Tarih tespiti (Örn: 03.09.2026 veya 03/09/2026)
  const dateMatch = rawText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3], 10);
    dueDate = new Date(year, month, day, 18, 0, 0);
  }

  // Öncelik tespiti
  let priority: TaskPriority = TaskPriority.MEDIUM;
  if (rawText.toLowerCase().includes('acil') || rawText.toLowerCase().includes('kritik')) {
    priority = TaskPriority.URGENT;
  } else if (rawText.toLowerCase().includes('onemli') || rawText.toLowerCase().includes('önemli') || rawText.toLowerCase().includes('yüksek')) {
    priority = TaskPriority.HIGH;
  } else if (rawText.toLowerCase().includes('düşük') || rawText.toLowerCase().includes('dusuk')) {
    priority = TaskPriority.LOW;
  }

  const primaryAssignee = assignedUsers[0];

  const task = await prismaInstance.task.create({
    data: {
      groupId,
      messageId: sourceMessage.id,
      title: targetTitle.slice(0, 255),
      description: 'WhatsApp üzerinden oluşturuldu.\nGönderen: ' + createdByUser.fullName,
      assignedToId: primaryAssignee.id,
      createdById: createdByUser.id,
      status: TaskStatus.PENDING,
      priority,
      dueDate,
      assignees: {
        create: assignedUsers.map((u) => ({ userId: u.id })),
      },
    },
    include: {
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      assignees: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
        },
      },
    },
  });

  // Web arayüzüne yayınla
  ioInstance.to('group_' + groupId).emit('task_created', task);
  ioInstance.to('group_' + groupId).emit('message_task_updated', {
    messageId: sourceMessage.id,
    task,
  });

  // WhatsApp'a bot yanıtı gönder
  const assigneeNames = assignedUsers.map((u: any) => u.fullName).join(', ');
  const dateStr = dueDate ? dueDate.toLocaleDateString('tr-TR') : 'Belirtilmedi';
  const replyText = '✅ *Görev Oluşturuldu!*\n\n📋 *Görev:* ' + task.title + '\n👤 *Sorumlu:* ' + assigneeNames + '\n📅 *Bitiş:* ' + dateStr + '\n⚡ *Durum:* Bekliyor\n\n_PRJrms Kanban ve Plan Tablosuna işlendi._';

  try {
    await msg.reply(replyText);
  } catch (err) {
    console.error('[WhatsApp] Bot yanıt hatası:', err);
  }
}

// 🤖 WhatsApp Botu !durum / !gorevler Komutu
async function handleWhatsAppStatusCommand(msg: WAMessage, groupId: string) {
  if (!prismaInstance) return;

  try {
    const activeTasks = await prismaInstance.task.findMany({
      where: {
        groupId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        assignedTo: { select: { fullName: true } },
        assignees: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (activeTasks.length === 0) {
      await msg.reply('📊 *Aktif Görev Bulunmuyor.*\nBu sohbete ait bekleyen tüm görevler tamamlanmış.');
      return;
    }

    let report = '📊 *Aktif Görevler (' + activeTasks.length + ' Adet):*\n\n';
    activeTasks.forEach((t, idx) => {
      const assignees = t.assignees.map((a) => a.user.fullName).join(', ') || t.assignedTo?.fullName || 'Belirtilmedi';
      const dateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR') : '-';
      const statusIcon = t.status === 'IN_PROGRESS' ? '⏳' : '📌';
      report += (idx + 1) + '. ' + statusIcon + ' *' + t.title + '*\n   👤 ' + assignees + ' | 📅 ' + dateStr + '\n';
    });

    report += '\n_Tamamlamak için: !tamamla <görev adı>_';
    await msg.reply(report);
  } catch (e) {
    console.error('[WhatsApp] Status error:', e);
  }
}

// 🤖 WhatsApp Botu !tamamla Komutu
async function handleWhatsAppCompleteCommand(msg: WAMessage, groupId: string, senderUser: any) {
  if (!prismaInstance || !ioInstance) return;

  const targetKeyword = msg.body.replace(/^!(tamamla|bitti|done)/i, '').trim().toLowerCase();

  try {
    const tasks = await prismaInstance.task.findMany({
      where: {
        groupId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let matchedTask = tasks.find((t) => t.title.toLowerCase().includes(targetKeyword));
    if (!matchedTask && tasks.length === 1) {
      matchedTask = tasks[0];
    }

    if (!matchedTask) {
      await msg.reply('⚠️ Tamamlanacak görev bulunamadı. Lütfen görev adını belirtin (Örn: !tamamla Rapor)');
      return;
    }

    const updated = await prismaInstance.task.update({
      where: { id: matchedTask.id },
      data: { status: TaskStatus.COMPLETED },
      include: {
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        assignees: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, email: true } } } },
      },
    });

    ioInstance.to('group_' + groupId).emit('task_updated', updated);
    ioInstance.to('group_' + groupId).emit('message_task_updated', {
      messageId: updated.messageId,
      task: updated,
    });

    await msg.reply('🎉 *Görev Başarıyla Tamamlandı!*\n\n✅ "' + updated.title + '" kapatıldı.\n_İşlem Yapan: ' + senderUser.fullName + '_');
  } catch (e) {
    console.error('[WhatsApp] Complete error:', e);
  }
}

// 🤖 WhatsApp Botu !yardim Komutu
async function handleWhatsAppHelpCommand(msg: WAMessage) {
  const helpText = '🤖 *PRJrms WhatsApp Asistanı*\n\n' +
    '📌 *!gorev <Başlık> [Tarih]*\n_Örnek: !gorev Fatura kesilecek 05.09.2026_\n\n' +
    '📊 *!durum* veya *!gorevler*\n_Bu sohbetteki aktif görevleri listeler_\n\n' +
    '✅ *!tamamla <Görev Adı>*\n_Görevi tamamlandı olarak işaretler_\n\n' +
    'ℹ️ *!yardim*\n_Bu menüyü gösterir_';

  try {
    await msg.reply(helpText);
  } catch (e) {}
}

function broadcastStatus() {
  if (!ioInstance) return;
  ioInstance.emit('whatsapp_status', state);
}

export function getWhatsAppStatus(): WhatsAppState {
  return state;
}

export async function reconnectWhatsApp() {
  if (client) {
    try {
      await client.destroy();
    } catch (e) {}
    client = null;
  }
  if (ioInstance && prismaInstance) {
    initWhatsAppService(ioInstance, prismaInstance);
  }
}

export async function disconnectWhatsApp() {
  if (client) {
    try {
      await client.logout();
      await client.destroy();
    } catch (e) {}
    client = null;
  }
  state.status = 'disconnected';
  state.qrCodeDataUrl = null;
  state.phone = null;
  state.pushname = null;
  broadcastStatus();
}

// Tüm WhatsApp Sohbetlerini ve Kişilerini Getir (Gruplar + Birebir Yazışmalar)
export async function getWhatsAppChats() {
  const resultChats: any[] = [];
  const seenIds = new Set<string>();

  // 1. Veritabanındaki tüm personelleri birebir sohbet olarak listele
  if (prismaInstance) {
    try {
      const users = await prismaInstance.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, phone: true, role: true },
      });
      for (const u of users) {
        if (u.phone) {
          const clean = normalizePhone(u.phone);
          const fullNumber = clean.startsWith('90') ? clean : ('90' + clean.replace(/^0+/, ''));
          const waId = fullNumber + '@c.us';
          if (!seenIds.has(waId)) {
            seenIds.add(waId);
            resultChats.push({
              id: waId,
              name: u.fullName + ' (' + (u.role === 'ADMIN' ? 'Yönetici' : 'Personel') + ')',
              isGroup: false,
              number: fullNumber,
              type: 'personnel',
            });
          }
        }
      }
    } catch (e) {}
  }

  // 2. WhatsApp Client'tan tüm Rehber ve Kişileri Al
  if (client) {
    try {
      const contacts = await client.getContacts();
      if (contacts && contacts.length > 0) {
        for (const c of contacts) {
          const cid = c.id?._serialized || (typeof c.id === 'string' ? c.id : '');
          if (cid && !cid.includes('status@broadcast') && !seenIds.has(cid)) {
            seenIds.add(cid);
            const isGrp = c.isGroup || cid.endsWith('@g.us');
            const displayName = c.name || c.pushname || (c as any).formattedTitle || c.number || cid.split('@')[0];
            resultChats.push({
              id: cid,
              name: displayName,
              isGroup: isGrp,
              number: c.number || null,
              type: isGrp ? 'group' : 'contact',
            });
          }
        }
      }
    } catch (e) {
      console.warn('[WhatsApp] getContacts error:', e);
    }

    // 3. WhatsApp Client'tan aktif Sohbetleri Al
    try {
      const chats = await client.getChats();
      if (chats && chats.length > 0) {
        for (const c of chats) {
          const cid = c.id?._serialized || (typeof c.id === 'string' ? c.id : '');
          if (cid && !seenIds.has(cid)) {
            seenIds.add(cid);
            const isGrp = c.isGroup || cid.endsWith('@g.us');
            resultChats.push({
              id: cid,
              name: c.name || (c as any).formattedTitle || (isGrp ? 'WhatsApp Grubu' : 'Kişi'),
              isGroup: isGrp,
              unreadCount: c.unreadCount || 0,
              type: isGrp ? 'group' : 'chat',
            });
          }
        }
      }
    } catch (e) {}
  }

  // 4. Önbellekteki sohbetleri birleştir
  for (const [id, item] of cachedChatsMap.entries()) {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      resultChats.push(item);
    }
  }

  // 5. Halihazırda bağlı PRJrms Gruplarını İşaretle
  if (prismaInstance) {
    try {
      const boundGroups = await prismaInstance.group.findMany({
        where: { whatsappChatId: { not: null } },
        select: { id: true, name: true, whatsappChatId: true },
      });
      const boundMap = new Map(boundGroups.map((g) => [g.whatsappChatId!, { id: g.id, name: g.name }]));
      for (const item of resultChats) {
        if (boundMap.has(item.id)) {
          item.boundGroup = boundMap.get(item.id);
        }
      }
    } catch (e) {}
  }

  // Grupları öne al, sonra kişileri alfabetik sırala
  return resultChats.sort((a, b) => {
    if (a.isGroup && !b.isGroup) return -1;
    if (!a.isGroup && b.isGroup) return 1;
    return (a.name || '').localeCompare(b.name || '', 'tr');
  });
}

// Seçilen WhatsApp Sohbeti için Yeni PRJrms Kanalı Oluştur
export async function createChannelForWhatsApp(waChatId: string, name: string, isGroup: boolean) {
  if (!prismaInstance || !ioInstance) return null;

  // Zaten varsa onu döndür
  const existing = await prismaInstance.group.findFirst({
    where: { whatsappChatId: waChatId },
    include: {
      members: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } } } },
      tasks: true,
    },
  });
  if (existing) return existing;

  const adminUser = await prismaInstance.user.findFirst({ where: { role: 'ADMIN' } });
  const membersToCreate: any[] = [];
  if (adminUser) {
    membersToCreate.push({ userId: adminUser.id, role: 'ADMIN' });
  }

  // Eğer 1-on-1 kişi ise ve sistemde kayıtlıysa o kişiyi de ekle
  if (!isGroup) {
    const rawNumber = waChatId.split('@')[0];
    const contactUser = await findOrCreateWhatsAppUser(rawNumber, name);
    if (contactUser && adminUser && contactUser.id !== adminUser.id) {
      membersToCreate.push({ userId: contactUser.id, role: 'MEMBER' });
    }
  }

  const newGroup = await prismaInstance.group.create({
    data: {
      name: (name || (isGroup ? 'WhatsApp Grubu' : 'WhatsApp Kişisi')).slice(0, 100),
      description: isGroup ? 'WhatsApp Grubu Senkronizasyonu' : ('WhatsApp Birebir Sohbet (' + name + ')'),
      whatsappChatId: waChatId,
      members: {
        create: membersToCreate,
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } },
        },
      },
      tasks: true,
    },
  });

  ioInstance.emit('group_created', newGroup);
  return newGroup;
}

// Bir PRJrms Grubu ile WhatsApp Sohbetini Eşleştir
export async function bindWhatsAppGroup(groupId: string, waChatId: string) {
  if (!prismaInstance) return;
  await prismaInstance.group.update({
    where: { id: groupId },
    data: { whatsappChatId: waChatId },
  });
  state.boundGroupId = groupId;
  state.boundChatId = waChatId;
  broadcastStatus();
}

// 🔔 GİDEN BİLDİRİM: Web panelinden Görev Açıldığında WhatsApp'a Yaz
export async function notifyWhatsAppTaskCreated(task: any) {
  if (!client || state.status !== 'ready' || !prismaInstance) return;

  try {
    const group = await prismaInstance.group.findUnique({ where: { id: task.groupId } });
    if (!group || !group.whatsappChatId) return;

    const assignees = task.assignees && task.assignees.length > 0
      ? task.assignees.map((a: any) => a.user?.fullName).filter(Boolean).join(', ')
      : task.assignedTo?.fullName || 'Ekip';

    const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : 'Belirtilmedi';

    const text = '📋 *Yeni Görev Tanımlandı*\n\n📌 *Başlık:* ' + task.title + '\n👤 *Sorumlular:* ' + assignees + '\n📅 *Bitiş Tarihi:* ' + dateStr + '\n⚡ *Öncelik:* ' + (task.priority || 'MEDIUM') + '\n\n_PRJrms Sistemi_';

    await client.sendMessage(group.whatsappChatId, text);
  } catch (err) {
    console.error('[WhatsApp] Görev bildirim hatası:', err);
  }
}

// 🔔 GİDEN BİLDİRİM: Görev Tamamlandığında WhatsApp'a Yaz
export async function notifyWhatsAppTaskCompleted(task: any, completedByName?: string, note?: string) {
  if (!client || state.status !== 'ready' || !prismaInstance) return;

  try {
    const group = await prismaInstance.group.findUnique({ where: { id: task.groupId } });
    if (!group || !group.whatsappChatId) return;

    const text = '✅ *Görev Tamamlandı!*\n\n📌 *Görev:* ' + task.title + '\n👤 *Tamamlayan:* ' + (completedByName || 'Ekip Üyesi') + '\n📝 *Not:* ' + (note || '-') + '\n\n_PRJrms Sistemi_';

    await client.sendMessage(group.whatsappChatId, text);
  } catch (err) {
    console.error('[WhatsApp] Görev tamamlandı bildirim hatası:', err);
  }
}

// 🔔 GİDEN BİLDİRİM: Görev Yeniden Açıldığında WhatsApp'a Yaz
export async function notifyWhatsAppTaskReopened(task: any, reopenedByName?: string, note?: string) {
  if (!client || state.status !== 'ready' || !prismaInstance) return;

  try {
    const group = await prismaInstance.group.findUnique({ where: { id: task.groupId } });
    if (!group || !group.whatsappChatId) return;

    const text = '🔄 *Görev Yeniden Açıldı*\n\n📌 *Görev:* ' + task.title + '\n👤 *İşlem Yapan:* ' + (reopenedByName || 'Yönetici') + '\n📝 *Gerekçe:* ' + (note || '-') + '\n\n_PRJrms Sistemi_';

    await client.sendMessage(group.whatsappChatId, text);
  } catch (err) {
    console.error('[WhatsApp] Görev yeniden açıldı bildirim hatası:', err);
  }
}

// 💬 GİDEN MESAJ: PRJrms'de yazılan mesajı WhatsApp'a ilet
export async function sendWhatsAppMessageToChat(waChatId: string, messageText: string) {
  if (!client || state.status !== 'ready') return;
  try {
    await client.sendMessage(waChatId, messageText);
  } catch (err) {
    console.error('[WhatsApp] Giden mesaj hatası:', err);
  }
}
