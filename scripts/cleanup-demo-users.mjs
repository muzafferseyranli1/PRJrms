import { PrismaClient, UserRole, GroupRole, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:RMSv3_Local_Password_2026!@188.132.198.144:5432/prjrms_db?schema=public',
    },
  },
});

async function main() {
  console.log('🔄 Demo kullanıcıları temizleme ve Ana Yönetici yapılandırması...');

  // 1. Ana Admin Şifresi: "1453"
  const passwordHash = await bcrypt.hash('1453', 10);

  // 2. Ana Admin oluştur / güncelle
  const masterAdmin = await prisma.user.upsert({
    where: { email: 'muzaffer.seyranli@gmail.com' },
    update: {
      passwordHash,
      fullName: 'Muzaffer Seyranlı',
      role: UserRole.ADMIN,
      isActive: true,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=muzaffer',
    },
    create: {
      email: 'muzaffer.seyranli@gmail.com',
      fullName: 'Muzaffer Seyranlı',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=muzaffer',
    },
  });

  console.log(`✅ Ana Yönetici oluşturuldu: ${masterAdmin.email} (ID: ${masterAdmin.id})`);

  // 3. Genel Sohbet Grubunu bul veya oluştur
  let generalGroup = await prisma.group.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!generalGroup) {
    generalGroup = await prisma.group.create({
      data: {
        name: 'Genel Ekip Sohbeti',
        description: 'PRJrms Ekip İçi Mesajlaşma ve Chat-to-Task Kanalı',
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=prjrms',
      },
    });
  }

  // Admin'i gruba ekle
  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: generalGroup.id,
        userId: masterAdmin.id,
      },
    },
    update: { role: GroupRole.ADMIN },
    create: {
      groupId: generalGroup.id,
      userId: masterAdmin.id,
      role: GroupRole.ADMIN,
    },
  });

  // 4. Demo kullanıcıların mesaj/görev/üyeliklerini ana admin'e aktar veya temizle
  const demoEmails = ['admin@prjrms.local', 'ahmet@prjrms.local', 'mehmet@prjrms.local', 'ayse@prjrms.local'];
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
  });

  for (const demoUser of demoUsers) {
    // Mesajları ve görevleri masterAdmin'e aktar
    await prisma.message.updateMany({
      where: { senderId: demoUser.id },
      data: { senderId: masterAdmin.id },
    });
    await prisma.task.updateMany({
      where: { createdById: demoUser.id },
      data: { createdById: masterAdmin.id },
    });
    await prisma.task.updateMany({
      where: { assignedToId: demoUser.id },
      data: { assignedToId: masterAdmin.id },
    });
    await prisma.messageReaction.deleteMany({
      where: { userId: demoUser.id },
    });
    await prisma.groupMember.deleteMany({
      where: { userId: demoUser.id },
    });

    // Demo kullanıcıyı sil
    await prisma.user.delete({
      where: { id: demoUser.id },
    });
    console.log(`🗑️ Demo kullanıcı silindi: ${demoUser.email}`);
  }

  console.log('🎉 İşlem tamamlandı! Artık tek ve sabit ana yönetici: muzaffer.seyranli@gmail.com | Şifre: 1453');
}

main()
  .catch((e) => {
    console.error('Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
