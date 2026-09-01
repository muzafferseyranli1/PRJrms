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

const cachedChatsMap = new Map<string, { id: string; name: string; isGroup: boolean; unreadCount?: number }>();

// Clean and normalize phone number for matching
function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

// Find system user matching a WhatsApp phone number or push name
async function findUserByWhatsAppContact(rawNumber: string, pushname?: string) {
  if (!prismaInstance) return null;
  const cleanPhone = normalizePhone(rawNumber);

  // 1. Match by last 10 digits of phone (e.g. 5332760534)
  if (cleanPhone.length >= 10) {
    const last10 = cleanPhone.slice(-10);
    const users = await prismaInstance.user.findMany();
    const matched = users.find((u) => u.phone && normalizePhone(u.phone).endsWith(last10));
    if (matched) return matched;
  }

  // 2. Match by full name if pushname provided
  if (pushname) {
    const trimmed = pushname.trim().toLowerCase();
    const users = await prismaInstance.user.findMany();
    const matched = users.find((u) => u.fullName.toLowerCase().includes(trimmed) || trimmed.includes(u.fullName.toLowerCase()));
    if (matched) return matched;
  }

  // 3. Fallback to Admin
  return await prismaInstance.user.findFirst({ where: { role: 'ADMIN' } });
}

// Get or find default active PRJrms group to sync
async function getTargetGroup(waChatId?: string) {
  if (!prismaInstance) return null;

  if (waChatId) {
    const groupWithWa = await prismaInstance.group.findFirst({
      where: { whatsappChatId: waChatId },
    });
    if (groupWithWa) return groupWithWa;
  }

  // Fallback to first group in database
  return await prismaInstance.group.findFirst({
    orderBy: { createdAt: 'asc' },
  });
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

    // 📩 INBOUND MESSAGE & MEDIA HANDLER
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

  if (msg.isStatus || msg.type === 'e2e_notification') return;

  const chat = await msg.getChat();
  if (chat && chat.id) {
    const rawId = chat.id._serialized || (typeof chat.id === 'string' ? chat.id : '');
    if (rawId) {
      const isGrp = chat.isGroup || rawId.endsWith('@g.us');
      cachedChatsMap.set(rawId, {
        id: rawId,
        name: chat.name || (chat as any).formattedTitle || (isGrp ? 'WhatsApp Grubu' : 'Kişi'),
        isGroup: isGrp,
      });
    }
  }

  // Hedef grubu bul
  const targetGroup = await getTargetGroup(chat.id._serialized);
  if (!targetGroup) return;

  // Göndereni tespit et
  const contact = await msg.getContact();
  const rawSenderNumber = contact.number || (contact.id && contact.id.user) || (msg.author ? msg.author.split('@')[0] : msg.from.split('@')[0]);
  const senderUser = await findUserByWhatsAppContact(rawSenderNumber, contact.pushname || contact.name);

  if (!senderUser) return;

  // Grup üyeliği yoksa ekle
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

  // 🤖 BOT KOMUTU: !gorev veya !task ile WhatsApp içinden doğrudan görev oluşturma
  if (messageText.startsWith('!gorev') || messageText.startsWith('!task') || messageText.startsWith('!plan')) {
    await handleWhatsAppTaskCommand(msg, savedMessage, targetGroup.id, senderUser);
  }
}

// 🤖 WhatsApp Botu !gorev Komutu İşleyici
async function handleWhatsAppTaskCommand(
  msg: WAMessage,
  sourceMessage: any,
  groupId: string,
  createdByUser: any
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

  // Bahsedilen kişileri (mentions) çöz
  const mentions = await msg.getMentions();
  for (const contact of mentions) {
    const u = await findUserByWhatsAppContact(contact.number, contact.name || contact.pushname);
    if (u && !assignedUsers.some((x) => x.id === u.id)) {
      assignedUsers.push(u);
    }
  }

  // Mention yoksa metin içinde isim ara
  if (assignedUsers.length === 0) {
    const allUsers = await prismaInstance.user.findMany();
    for (const u of allUsers) {
      if (rawText.toLowerCase().includes(u.fullName.toLowerCase().split(' ')[0])) {
        assignedUsers.push(u);
      }
    }
  }

  // Hala sorumlu yoksa görevi oluşturan kişiyi ata
  if (assignedUsers.length === 0) {
    assignedUsers.push(createdByUser);
  }

  // Tarih tespiti (Örn: 03.09.2026)
  const dateMatch = rawText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3], 10);
    dueDate = new Date(year, month, day, 18, 0, 0);
  }

  const primaryAssignee = assignedUsers[0];

  const task = await prismaInstance.task.create({
    data: {
      groupId,
      messageId: sourceMessage.id,
      title: targetTitle.slice(0, 255),
      description: 'WhatsApp Botu tarafından oluşturuldu.\nGönderen: ' + createdByUser.fullName,
      assignedToId: primaryAssignee.id,
      createdById: createdByUser.id,
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
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

// WhatsApp Gruplarını Listele
export async function getWhatsAppChats() {
  if (!client) {
    return Array.from(cachedChatsMap.values());
  }

  // 1. Try standard getChats()
  try {
    const chats = await client.getChats();
    if (chats && chats.length > 0) {
      for (const c of chats) {
        if (c && c.id) {
          const cid = c.id._serialized || (typeof c.id === 'string' ? c.id : '');
          if (cid) {
            const isGrp = c.isGroup || cid.endsWith('@g.us');
            cachedChatsMap.set(cid, {
              id: cid,
              name: c.name || (c as any).formattedTitle || (isGrp ? 'WhatsApp Grubu' : 'Kişi'),
              isGroup: isGrp,
              unreadCount: c.unreadCount || 0,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp] client.getChats() fallback denenecek:', err);
  }

  // 2. Puppeteer Store Evaluation Fallback
  try {
    // @ts-ignore
    const page = client.pupPage;
    if (page) {
      const evalChats = await page.evaluate(() => {
        const out: any[] = [];
        const w = window as any;
        try {
          if (w.Store && w.Store.Chat) {
            const models = w.Store.Chat.models || w.Store.Chat._models || [];
            for (const m of models) {
              const id = m.id?._serialized || (typeof m.id === 'string' ? m.id : null);
              if (id) {
                out.push({
                  id,
                  name: m.name || m.formattedTitle || m.contact?.name || m.title || id,
                  isGroup: m.isGroup || id.endsWith('@g.us'),
                  unreadCount: m.unreadCount || 0,
                });
              }
            }
          }
          if (w.Store && w.Store.GroupMetadata) {
            const gmodels = w.Store.GroupMetadata.models || w.Store.GroupMetadata._models || [];
            for (const gm of gmodels) {
              const gid = gm.id?._serialized || (typeof gm.id === 'string' ? gm.id : null);
              if (gid) {
                out.push({
                  id: gid,
                  name: gm.subject || gm.name || 'WhatsApp Grubu',
                  isGroup: true,
                });
              }
            }
          }
        } catch (e) {}
        return out;
      });

      if (Array.isArray(evalChats)) {
        for (const item of evalChats) {
          if (item && item.id) {
            cachedChatsMap.set(item.id, item);
          }
        }
      }
    }
  } catch (evalErr) {
    console.warn('[WhatsApp] page evaluate fallback uyarısı:', evalErr);
  }

  // 3. Return cached items sorted with groups first
  const list = Array.from(cachedChatsMap.values());
  return list.sort((a, b) => {
    if (a.isGroup && !b.isGroup) return -1;
    if (!a.isGroup && b.isGroup) return 1;
    return a.name.localeCompare(b.name, 'tr');
  });
}

// Bir PRJrms Grubu ile WhatsApp Grubunu Eşleştir
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

    const text = '📋 *Yeni Görev Tanımlandı*\n\n📌 *Başlık:* ' + task.title + '\n👤 *Sorumlular:* ' + assignees + '\n📅 *Bitiş Tarihi:* ' + dateStr + '\n⚡ *Öncelik:* ' + (task.priority || 'NORMAL') + '\n\n_PRJrms Sistemi_';

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
