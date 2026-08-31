# Proje: Ekip İçi Özel Mesajlaşma ve Görev Yönetimi Web Uygulaması

Yazılım geliştirme ekibimiz için kısıtlı erişimli, WhatsApp benzeri bir gerçek zamanlı mesajlaşma ve mesaj tabanlı görev yönetimi (Chat-to-Task) web uygulaması geliştirmek istiyorum. Proje tamamen kendi VPS (Virtual Private Server) sunucumuzda barındırılacak ve self-hosted altyapıyla çalışacaktır.

---

## 1. Mimari ve Teknoloji Yığını (Tech Stack)

Uygulamayı harici servis bağımlılığı olmadan (ör. Firebase/Supabase kullanmadan) kendi VPS'imizde çalışacak şekilde kurgula:

- **Frontend:** Next.js (App Router, React, TypeScript), Tailwind CSS, Lucide Icons
- **Backend / Realtime:** Node.js (Express / Fastify) + Socket.io (Gerçek zamanlı mesajlaşma ve bildirimler için)
- **Veritabanı:** PostgreSQL + Prisma ORM (veya TypeORM)
- **Dosya Depolama:** VPS üzerinde yerel dosya dizini veya Docker ile kendi MinIO (S3 uyumlu) konteynerimiz
- **Kimlik Doğrulama:** JWT (JSON Web Tokens) tabanlı oturum yönetimi
- **Dağıtım / Deployment:** Docker & Docker Compose (PWA/Web app, Node.js backend, PostgreSQL ve Nginx reverse proxy içeren mimari)

---

## 2. Temel Fonksiyonel Gereksinimler

### A. Kimlik Doğrulama ve Kullanıcı Yönetimi
- Sadece yönetici (Admin) tarafından davet edilen/oluşturulan kullanıcılar giriş yapabilsin (Açık kayıt olmayacak).
- Profil resmi, ad-soyad ve rol tanımları.

### B. Sohbet Özellikleri (WhatsApp Benzeri)
- **Gerçek Zamanlı Mesajlaşma:** WebSocket / Socket.io üzerinden anlık iletim.
- **Medya / Ekler:** Resim ve dosya yükleme, mesaj içinde önizleme (Image light-box, dosya indirme).
- **Tepkiler (Reactions):** Mesajlara sınırlı emoji tepkileri ekleme (👍, ❤️, 🔥, ✅, 👀).
- **Yanıtlama (Reply):** Belirli bir mesaja alıntı yaparak yanıt verme.
- **Yazıyor... & Okundu Bilgisi:** Temel durum göstergeleri.

### C. Mesajdan Görev Oluşturma (Çekirdek Farklılaştırıcı Modül)
1. **Uzun Basma / Bağlam Menüsü (Context Menu):**
   - Mobil aygıtlarda mesaja uzun basıldığında veya masaüstünde sağ tıklandığında/menüden "Göreve Dönüştür" seçeneği çıkmalı.
2. **Görev Atama Modalı:**
   - Görev başlığı (Varsayılan olarak seçilen mesajın metni).
   - Atanan Kişi (Gruptaki kullanıcı listesinden seçim).
   - Bitiş Tarihi ve Saati (Due Date & Time picker).
3. **Mesaj İçi Görev Etiketi:**
   - Göreve dönüştürülen mesajın altında görsel bir kart/etiket belirsin: `[Atanan: Ahmet | Bitiş: 2 Eylül | Durum: Bekliyor]`.
   - Görev tamamlandığında durum anlık olarak sohbet içinde güncellensin.
4. **Yan Panel (Görev Listesi / Kanban Tablosu View):**
   - Sağ tarafta açılır bir yan panel veya sekme ile gruptaki tüm açık/tamamlanmış görevler listelensin.
   - Listedeki bir göreve tıklandığında sohbet penceresi otomatik olarak **o mesajın atıldığı konuma kaysın (Scroll-to-message)**.

---

## 3. VPS Deployment Hazırlığı (Dockerize Yapı)

Proje kök dizininde tek bir komutla VPS üzerinde ayağa kalkacak `docker-compose.yml` dosyasını ve gerekli Dockerfile yapılandırmalarını oluştur:

1. **`app` servisi:** Next.js frontend ve Node.js backend.
2. **`db` servisi:** PostgreSQL veritabanı (volume kalıcılığı ayarlanmış).
3. **`nginx` servisi:** SSL (Let's Encrypt / Certbot entegrasyonuna uygun) ve Reverse Proxy yapılandırması.

---

## 4. Başlangıç Adımları ve Çıktı Beklentisi

Lütfen aşağıdaki adımlarla sırasıyla ilerle:
1. Klasör yapısını ve veri modelini (`schema.prisma`) oluştur.
2. Socket.io ve PostgreSQL bağlantılarını içeren backend sunucusunu kur.
3. WhatsApp tarzı mesajlaşma ve "Göreve Dönüştür" modalını içeren frontend arayüzünü geliştir.
4. VPS kurulumu için gerekli `docker-compose.yml` ve Nginx konfigürasyonlarını hazırla.