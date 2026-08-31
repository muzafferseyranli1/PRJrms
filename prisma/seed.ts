import { PrismaClient, UserRole, GroupRole, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Ana yönetici — sabit, silinemez
const MASTER_ADMIN_EMAIL = 'muzaffer.seyranli@gmail.com';
const MASTER_ADMIN_PASSWORD = '1453';

async function main() {
  console.log('🌱 Veritabanı tohumlama (seeding) başlatılıyor...');

  // 1. Ana Admin şifresi
  const passwordHash = await bcrypt.hash(MASTER_ADMIN_PASSWORD, 10);

  // 2. Ana Yönetici oluştur / güncelle
  const masterAdmin = await prisma.user.upsert({
    where: { email: MASTER_ADMIN_EMAIL },
    update: {
      passwordHash,
      fullName: 'Muzaffer Seyranlı',
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: MASTER_ADMIN_EMAIL,
      fullName: 'Muzaffer Seyranlı',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=muzaffer',
    },
  });

  console.log(`✅ Ana Yönetici oluşturuldu: ${masterAdmin.email}`);

  // 3. Genel Sohbet Grubunu oluştur
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

  // 4. Admin'i gruba ekle
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

  console.log('✅ Grup ve üyelik tanımlandı.');

  // 5. Karşılama mesajı
  const existingMessages = await prisma.message.count({
    where: { groupId: generalGroup.id },
  });

  if (existingMessages === 0) {
    await prisma.message.create({
      data: {
        groupId: generalGroup.id,
        senderId: masterAdmin.id,
        content: '👋 Ekip içi özel mesajlaşma ve Chat-to-Task sistemine hoş geldiniz! Herhangi bir mesaja sağ tıklayarak veya basılı tutarak anında göreve dönüştürebilirsiniz.',
        type: MessageType.TEXT,
      },
    });
    console.log('✅ Karşılama mesajı oluşturuldu.');
  }

  console.log('🎉 Seed işlemi başarıyla tamamlandı!');
  console.log('\n--- GİRİŞ BİLGİLERİ ---');
  console.log(`Ana Yönetici: ${MASTER_ADMIN_EMAIL} | Şifre: ${MASTER_ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
