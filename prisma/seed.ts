import { PrismaClient, UserRole, GroupRole, MessageType, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Veritabanı tohumlama (seeding) başlatılıyor...');

  // 1. Şifre hash'i hazırla (Varsayılan: "123456")
  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. Kullanıcıları oluştur
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@prjrms.local' },
    update: {},
    create: {
      email: 'admin@prjrms.local',
      fullName: 'Sistem Yöneticisi (Admin)',
      passwordHash,
      role: UserRole.ADMIN,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    },
  });

  const ahmetUser = await prisma.user.upsert({
    where: { email: 'ahmet@prjrms.local' },
    update: {},
    create: {
      email: 'ahmet@prjrms.local',
      fullName: 'Ahmet Yılmaz',
      passwordHash,
      role: UserRole.MEMBER,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmet',
    },
  });

  const mehmetUser = await prisma.user.upsert({
    where: { email: 'mehmet@prjrms.local' },
    update: {},
    create: {
      email: 'mehmet@prjrms.local',
      fullName: 'Mehmet Demir',
      passwordHash,
      role: UserRole.MEMBER,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mehmet',
    },
  });

  const ayseUser = await prisma.user.upsert({
    where: { email: 'ayse@prjrms.local' },
    update: {},
    create: {
      email: 'ayse@prjrms.local',
      fullName: 'Ayşe Kaya',
      passwordHash,
      role: UserRole.MEMBER,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ayse',
    },
  });

  console.log('✅ Kullanıcılar oluşturuldu.');

  // 3. Genel Sohbet Grubunu Oluştur
  let generalGroup = await prisma.group.findFirst({
    where: { name: 'Yazılım Geliştirme Ekibi' },
  });

  if (!generalGroup) {
    generalGroup = await prisma.group.create({
      data: {
        name: 'Yazılım Geliştirme Ekibi',
        description: 'PRJrms Genel Geliştirme & Chat-to-Task Grubu',
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=devteam',
      },
    });
  }

  // 4. Grup Üyelerini Ekle
  const users = [adminUser, ahmetUser, mehmetUser, ayseUser];
  for (const user of users) {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: generalGroup.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        groupId: generalGroup.id,
        userId: user.id,
        role: user.role === UserRole.ADMIN ? GroupRole.ADMIN : GroupRole.MEMBER,
      },
    });
  }

  console.log('✅ Grup ve grup üyelikleri tanımlandı.');

  // 5. İlk Karşılama ve Örnek Mesajlar
  const existingMessages = await prisma.message.count({
    where: { groupId: generalGroup.id },
  });

  if (existingMessages === 0) {
    const welcomeMsg = await prisma.message.create({
      data: {
        groupId: generalGroup.id,
        senderId: adminUser.id,
        content: '👋 Ekip içi özel mesajlaşma ve Chat-to-Task sistemine hoş geldiniz! Herhangi bir mesaja sağ tıklayarak veya basılı tutarak anında göreve dönüştürebilirsiniz.',
        type: MessageType.TEXT,
      },
    });

    const taskMsg = await prisma.message.create({
      data: {
        groupId: generalGroup.id,
        senderId: ahmetUser.id,
        content: '🚀 VPS Docker optimizasyonlarını ve SSL ayarlarını tamamlayalım.',
        type: MessageType.TEXT,
      },
    });

    // Göreve dönüştürülmüş örnek task
    await prisma.task.create({
      data: {
        groupId: generalGroup.id,
        messageId: taskMsg.id,
        title: 'VPS Docker ve SSL Ayarları',
        description: 'Mesajdan türetilen görev: VPS Docker optimizasyonlarını ve SSL ayarlarını tamamlayalım.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 gün sonra
        createdById: adminUser.id,
        assignedToId: ahmetUser.id,
      },
    });

    console.log('✅ Örnek mesajlar ve Chat-to-Task kaydı oluşturuldu.');
  }

  console.log('🎉 Seed işlemi başarıyla tamamlandı!');
  console.log('\n--- GİRİŞ BİLGİLERİ ---');
  console.log('Admin Email: admin@prjrms.local | Şifre: 123456');
  console.log('Ahmet Email: ahmet@prjrms.local | Şifre: 123456');
  console.log('Mehmet Email: mehmet@prjrms.local | Şifre: 123456');
  console.log('Ayşe Email: ayse@prjrms.local | Şifre: 123456');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
