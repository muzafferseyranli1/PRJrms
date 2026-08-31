# PRJrms - Proje ve Geliştirme Kuralları (Project Rules)

## 1. Temel Kurallar ve Yalıtım Direktifleri (Isolation Rules)
> [!CAUTION]
> **X:\RMSv3 Klasörü İzolasyon Kuralı:**
> - `X:\RMSv3` dizini kesinlikle **SALT OKUNUR (READ-ONLY)** olarak kabul edilir.
> - Bu dizine hiçbir koşulda dosya yazılamaz, var olan dosyalar değiştirilemez veya silinemez.
> - `X:\RMSv3` projesinin kaynak kodları, veri tabanı ve canlı servisleri `PRJrms` projesinden tamamen bağımsızdır.

---

## 2. VPS ve Altyapı Yapılandırma Kuralları
- **Sunucu / VPS:** `188.132.198.144:3050`
- **Ayrı Proje Prensibi:** 
  - `PRJrms`, VPS üzerinde mevcut RMSv3 projesinin altında veya bir alt modülü olarak **DEĞİL**, tamamen bağımsız bir Docker Compose / Coolify servisi olarak çalışacaktır.
  - Port çakışmalarını önlemek için bağımsız Port 3050 tahsis edilmiştir.
  - Veritabanı olarak bağımsız bir veritabanı şeması/ismi (örn: `prjrms_db` veya bağımsız PostgreSQL container'ı) kullanılacaktır.

---

## 3. Teknoloji Yığını ve Standartlar
- **Frontend:** Next.js (App Router, React, TypeScript), Tailwind CSS, Lucide Icons
- **Backend / Realtime:** Node.js + Socket.io (WebSocket anlık mesajlaşma & bildirimler)
- **ORM & Veritabanı:** Prisma ORM + PostgreSQL
- **Depolama:** VPS yerel dosya dizini veya Docker MinIO S3 container
- **Kimlik Doğrulama:** JWT tabanlı güvenli oturum yönetimi (Yalnızca Admin daveti / kapalı kayıt)
- **Konteynerizasyon:** Docker & Docker Compose + Nginx Reverse Proxy (SSL / Certbot hazır)

---

## 4. Kodlama ve Mimari Prensipler
- **Modülerlik:** Frontend ve Backend kodları temiz ve sürdürülebilir bir yapıda tutulmalıdır.
- **Tip Güvenliği:** Hem frontend hem backend TypeScript ile katı tip denetiminde olmalıdır.
- **Gerçek Zamanlı Senkronizasyon:** Mesaj, tepki (reaction), okundu bilgisi ve görev (task) durumları Socket.io event'leri üzerinden anlık senkronize edilmelidir.
- **Chat-to-Task (Çekirdek Modül):** Mesajdan görev oluşturma, görev-mesaj ilişkisi (1-to-1 link), mesaj içi dinamik görev kartı ve sağ panel Kanban / Görev Listesi senkronizasyonu eksiksiz uygulanmalıdır.
